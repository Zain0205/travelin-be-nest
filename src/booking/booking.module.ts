import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { RefundService } from './refund.service';

@Module({
  controllers: [BookingController],
  providers: [BookingService, RefundService]
})
export class BookingModule { }
