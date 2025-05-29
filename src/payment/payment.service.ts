import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from 'prisma/generated';
import { PrismaService } from 'src/common/prisma.service';
import { PaymentInput } from 'src/model/booking.model';
import { MidtransService } from './midtrans.service';

@Injectable()
export class PaymentService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private midtransService: MidtransService,
  ) {}

  async processPayment(data: PaymentInput, userId: number) {
    const { bookingId, method, amount } = data;

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
      },
      include: {
        user: true,
        travelPackage: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(
        `Booking with ID ${bookingId} not found for user ${userId}`,
      );
    }

    if (
      parseFloat(amount.toString()) !==
      parseFloat(booking.totalPrice.toString())
    ) {
      throw new BadRequestException(
        `Payment amount must match the booking total price: ${booking.totalPrice}`,
      );
    }

    if (booking.paymentStatus == PaymentStatus.paid) {
      throw new BadRequestException(
        `Booking with ID ${bookingId} has already been paid.`,
      );
    }

    const orderId = `BOOKING-${bookingId}-${Date.now()}-${userId}`;

    const midtransResponse = await this.midtransService.createTransaction({
      orderId,
      amount: parseFloat(booking.totalPrice.toString()),
      customerDetails: {
        firstName: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phone || '',
      },
      itemDetails: [
        {
          id: `booking-${bookingId}`,
          name: booking.travelPackage
            ? `Travel Package: ${booking.travelPackage.title}`
            : `Booking: ${bookingId}`,
          price: parseFloat(booking.totalPrice.toString()),
          quantity: 1,
        },
      ],
      callbackUrl: `${this.configService.get<string>('FRONT_END_URL')}/payment/callback`,
    });

    const payment = await this.prisma.payment.create({
       data: {
        bookingId,
        method,
        amount,
        paymentDate: null, 
        proofUrl: data.proofUrl,
      },
    })

    return {
      payment,
      midtrans: midtransResponse,
    }
  }
}
