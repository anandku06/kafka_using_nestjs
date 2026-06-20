import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { KafkaModule } from '@app/kafka';
import { SERVICES } from '@app/common';

@Module({
  imports: [KafkaModule.register(`${SERVICES.AUTH_SERVICE}-group`)],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
