import { IsNotEmpty, IsString } from 'class-validator';

export class CheckInTicketDto {
  @IsString({ message: 'Ticket ID must be a string' })
  @IsNotEmpty({ message: 'Ticket ID is required' })
  ticketCode: string;
}
