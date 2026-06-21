import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { KafkaModule } from '@app/kafka';
import { SERVICES } from '@app/common';
import { DbModule } from '@app/db';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    KafkaModule.register(`${SERVICES.AUTH_SERVICE}-group`),
    DbModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService, JwtStrategy],
})
export class AuthServiceModule {}
