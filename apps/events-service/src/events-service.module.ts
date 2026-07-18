import { Module } from '@nestjs/common';
import { EventsServiceController } from './events-service.controller';
import { EventsServiceService } from './events-service.service';
import { KafkaModule } from '@app/kafka';
import { DbModule } from '@app/db';

@Module({
  imports: [KafkaModule.register('events-service-group'), DbModule],
  controllers: [EventsServiceController],
  providers: [EventsServiceService],
})
export class EventsServiceModule {}
