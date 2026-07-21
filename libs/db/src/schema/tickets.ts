import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { events } from './events';
import { users } from './users';

export const ticketStatusEnum = pgEnum('ticket_status', [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CANCELLED',
]);

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .references(() => events.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  quantity: integer('quantity').default(1).notNull(),
  totalPrice: integer('total_price').notNull(),
  status: ticketStatusEnum('status').default('PENDING').notNull(),
  ticketCode: varchar('ticket_code', { length: 20 }).unique().notNull(),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  checkedInAt: timestamp('checked_in_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
