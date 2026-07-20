import { NestFactory } from '@nestjs/core';
import { TicketsServiceModule } from './tickets-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TicketsServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
