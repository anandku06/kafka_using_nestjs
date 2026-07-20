import { Controller, Get } from '@nestjs/common';
import { TicketsServiceService } from './tickets-service.service';

@Controller()
export class TicketsServiceController {
  constructor(private readonly ticketsServiceService: TicketsServiceService) {}

  @Get()
  getHello(): string {
    return this.ticketsServiceService.getHello();
  }
}
