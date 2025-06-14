import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MidtransService } from './midtrans.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService, MidtransService],
  exports: [MidtransService]
})
export class PaymentModule { }
