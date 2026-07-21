import { Module } from '@nestjs/common';
import { TicketsServiceController } from './tickets-service.controller';
import { TicketsServiceService } from './tickets-service.service';
import { KafkaModule } from '@app/kafka';
import { DbModule } from '@app/db';

@Module({
  imports: [KafkaModule.register('tickets-service-group'), DbModule],
  controllers: [TicketsServiceController],
  providers: [TicketsServiceService],
})
export class TicketsServiceModule {}
