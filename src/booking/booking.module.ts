import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { RefundService } from './refund.service';
import { NotificationModule } from 'src/notification/notification.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [NotificationModule, PaymentModule],
  controllers: [BookingController],
  providers: [BookingService, RefundService]
})

export class BookingModule { }
