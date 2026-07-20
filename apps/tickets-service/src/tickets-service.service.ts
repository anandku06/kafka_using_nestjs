import { Injectable } from '@nestjs/common';

@Injectable()
export class TicketsServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
