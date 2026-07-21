import { NestFactory } from '@nestjs/core';
import { TicketsServiceModule } from './tickets-service.module';
import { ValidationPipe } from '@nestjs/common';
import { SERVICE_PORTS } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create(TicketsServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(SERVICE_PORTS.TICKET_SERVICE);
  console.log(`Tickets service is running on: ${SERVICE_PORTS.TICKET_SERVICE}`);
}
bootstrap();
