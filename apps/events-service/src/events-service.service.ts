import { CreateEventDto, UpdateEventDto } from '@app/common';
import { DbService, events } from '@app/db';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { eq } from 'drizzle-orm';

@Injectable()
export class EventsServiceService implements OnModuleInit {
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DbService,
  ) {}

  async onModuleInit() {
    this.kafkaClient.connect();
  }

  async create(createEventDto: CreateEventDto, orgId: string) {
    const [event] = await this.dbService.db
      .insert(events)
      .values({
        ...createEventDto,
        date: new Date(createEventDto.date),
        price: createEventDto.price ?? 0,
        organizerId: orgId,
      })
      .returning();

    // Emit an event to Kafka
    this.kafkaClient.emit(KAFKA_TOPICS.EVENT_CREATED, {
      eventId: event.id,
      organizerId: event.organizerId,
      title: event.title,
      timestamp: new Date().toISOString(),
    });

    return event;
  }

  async findAll() {
    return this.dbService.db
      .select()
      .from(events)
      .where(eq(events.status, 'PUBLISHED'));
  }

  async findOne(id: string) {
    const [event] = await this.dbService.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
    userId: string,
    userRole: string,
  ) {
    const event = await this.findOne(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        `You do not have permission to update this event`,
      );
    }

    const updatedData: Record<string, unknown> = { ...updateEventDto };
    if (updateEventDto.date) {
      updatedData.date = new Date(updateEventDto.date);
    }
    updatedData.updatedAt = new Date();

    const [updatedEvent] = await this.dbService.db
      .update(events)
      .set(updatedData)
      .where(eq(events.id, id))
      .returning();

    // Emit an event to Kafka
    this.kafkaClient.emit(KAFKA_TOPICS.EVENT_UPDATED, {
      eventId: updatedEvent.id,
      changes: Object.keys(updateEventDto),
      timestamp: new Date().toISOString(),
    });

    return updatedEvent;
  }

  async publish(id: string, userId: string, userRole: string) {
    const event = await this.findOne(id);

    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        `You do not have permission to publish this event`,
      );
    }

    const [publishedEvent] = await this.dbService.db
      .update(events)
      .set({ status: 'PUBLISHED', updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();

    return publishedEvent;
  }

  async cancel(id: string, userId: string, userRole: string) {
    const event = await this.findOne(id);

    if (event.organizerId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        `You do not have permission to cancel this event`,
      );
    }

    const [canceledEvent] = await this.dbService.db
      .update(events)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();

    this.kafkaClient.emit(KAFKA_TOPICS.EVENT_CANCELLED, {
      eventId: canceledEvent.id,
      timestamp: new Date().toISOString(),
    });

    return canceledEvent;
  }

  async findMyEvents(orgId: string) {
    return this.dbService.db
      .select()
      .from(events)
      .where(eq(events.organizerId, orgId));
  }
}
