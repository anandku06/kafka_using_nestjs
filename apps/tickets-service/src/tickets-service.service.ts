import { PurchaseTicketDto } from '@app/common';
import { DbService, events, tickets } from '@app/db';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomBytes } from 'crypto';
import { and, eq, sql } from 'drizzle-orm';

@Injectable()
export class TicketsServiceService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaService: ClientKafka,
    private readonly dbService: DbService,
  ) {}

  async onModuleInit() {
    await this.kafkaService.connect();
  }

  private generateTicketCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  async purchaseTicket(purchaseDto: PurchaseTicketDto, userId: string) {
    const { eventId, quantity } = purchaseDto;

    const [event] = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, eventId));

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException('Event is not published');
    }

    const soldTickets = await this.dbService.db
      .select({
        total: sql<number>`COALESCE(SUM(${tickets.quantity}), 0)`, // coalesce is used for null safety, what it does is that if the sum is null, it will return 0 instead of null
      })
      .from(tickets)
      .where(
        and(eq(tickets.eventId, eventId), eq(tickets.status, 'CONFIRMED')),
      );

    const currentSold = Number(soldTickets[0]?.total || 0); // if the total is null, it will return 0 instead of null

    const remainingTickets = event.capacity - currentSold;

    // Check if the requested quantity exceeds the remaining tickets
    if (quantity > remainingTickets) {
      throw new BadRequestException(
        `Not enough tickets available. Remaining tickets: ${remainingTickets}`,
      );
    }

    const totalPrice = event.price * quantity;

    const [ticket] = await this.dbService.db
      .insert(tickets)
      .values({
        eventId,
        userId,
        quantity,
        totalPrice,
        ticketCode: this.generateTicketCode(),
        status: 'PENDING', // Set initial status to PENDING, after payment is confirmed, we will update the status to CONFIRMED
      })
      .returning();

    // Publish an event to Kafka for further processing (e.g., payment)
    this.kafkaService.emit(KAFKA_TOPICS.TICKET_PURCHASED, {
      ticket: {
        id: ticket.id,
        eventId: ticket.eventId,
        userId: ticket.userId,
        quantity: ticket.quantity,
        totalPrice: ticket.totalPrice,
        ticketCode: ticket.ticketCode,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Ticket purchase initiated. Please proceed to payment.',
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        eventTitle: event.title,
        quantity: ticket.quantity,
        totalPrice: ticket.totalPrice,
        status: ticket.status,
        purchasedAt: ticket.purchasedAt,
      },
    };
  }

  async findMyTicket(userId: string) {
    const userTickets = await this.dbService.db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        quantity: tickets.quantity,
        totalPrice: tickets.totalPrice,
        status: tickets.status,
        purchasedAt: tickets.purchasedAt,
        checkedInAt: tickets.checkedInAt,
        eventId: tickets.eventId,
        eventTitle: events.title,
        eventDate: events.date,
        eventLocation: events.location,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id)) // Join the events table to get event details
      .where(eq(tickets.userId, userId));

    return userTickets;
  }

  async findOne(id: string, userId: string) {
    const [ticket] = await this.dbService.db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        quantity: tickets.quantity,
        totalPrice: tickets.totalPrice,
        status: tickets.status,
        purchasedAt: tickets.purchasedAt,
        checkedInAt: tickets.checkedInAt,
        userId: tickets.userId,
        eventId: tickets.eventId,
        eventTitle: events.title,
        eventDate: events.date,
        eventLocation: events.location,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(eq(tickets.id, id))
      .limit(1);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to view this ticket',
      );
    }
    return ticket;
  }

  async cancelTicket(id: string, userId: string) {
    const [ticket] = await this.dbService.db
      .select()
      .from(tickets)
      .where(eq(tickets.id, id))
      .limit(1);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this ticket',
      );
    }

    if (ticket.status === 'CANCELLED') {
      throw new BadRequestException('Ticket is already cancelled');
    }

    if (ticket.status === 'CHECKED_IN') {
      throw new BadRequestException('Ticket is already checked in');
    }

    const [cancelledTicket] = await this.dbService.db
      .update(tickets)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();

    // Publish an event to Kafka for further processing (e.g., refund)
    this.kafkaService.emit(KAFKA_TOPICS.TICKET_CANCELLED, {
      ticket: {
        id: cancelledTicket.id,
        eventId: cancelledTicket.eventId,
        userId: cancelledTicket.userId,
        quantity: cancelledTicket.quantity,
        totalPrice: cancelledTicket.totalPrice,
        ticketCode: cancelledTicket.ticketCode,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Ticket cancelled successfully',
    };
  }

  async checkInTicket(ticketCode: string, organizerId: string) {
    const [ticket] = await this.dbService.db
      .select({
        id: tickets.id,
        status: tickets.status,
        eventId: tickets.eventId,
        quantity: tickets.quantity,
      })
      .from(tickets)
      .where(eq(tickets.ticketCode, ticketCode))
      .limit(1);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const [event] = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, ticket.eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to check in this ticket',
      );
    }

    if (ticket.status === 'CANCELLED') {
      throw new BadRequestException('Ticket is cancelled');
    }

    if (ticket.status === 'CHECKED_IN') {
      throw new BadRequestException('Ticket is already checked in');
    }

    const [checkedInTicket] = await this.dbService.db
      .update(tickets)
      .set({
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticket.id))
      .returning();

    // Publish an event to Kafka for further processing (e.g., analytics)
    this.kafkaService.emit(KAFKA_TOPICS.TICKET_CHECKED_IN, {
      ticket: {
        ticketId: checkedInTicket.id,
        eventId: checkedInTicket.eventId,
        ticketCode: checkedInTicket.ticketCode,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Ticket checked in successfully',
      ticket: {
        id: checkedInTicket.id,
        ticketCode: checkedInTicket.ticketCode,
        quantity: checkedInTicket.quantity,
        status: checkedInTicket.status,
        checkedInAt: checkedInTicket.checkedInAt,
      },
    };
  }

  // for organizer to see all tickets for their events
  async findEventTickets(eventId: string, organizerId: string) {
    const [event] = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to view tickets for this event',
      );
    }

    return this.dbService.db
      .select({
        id: tickets.id,
        ticketCode: tickets.ticketCode,
        quantity: tickets.quantity,
        status: tickets.status,
        checkedInAt: tickets.checkedInAt,
      })
      .from(tickets)
      .where(eq(tickets.eventId, eventId))
      .orderBy(tickets.createdAt);
  }
}
