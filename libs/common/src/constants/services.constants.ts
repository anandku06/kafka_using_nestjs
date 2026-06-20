export const SERVICES = {
  API_GATEWAY: 'api-gateway',
  AUTH_SERVICE: 'auth-service',
  USER_SERVICE: 'user-service',
  EVENT_SERVICE: 'event-service',
  TICKET_SERVICE: 'ticket-service',
  PAYMENT_SERVICE: 'payment-service',
  NOTIFICATION_SERVICE: 'notification-service',
} as const;

export const SERVICE_PORTS = {
  API_GATEWAY: 3000,
  AUTH_SERVICE: 3001,
  USER_SERVICE: 3002,
  EVENT_SERVICE: 3003,
  TICKET_SERVICE: 3004,
  PAYEMENT_SERVICE: 3005,
  NOTIFICATION_SERVICE: 3006,
} as const;
