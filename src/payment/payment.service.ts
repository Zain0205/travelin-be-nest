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
import { NotificationService } from 'src/notification/notification.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private midtransService: MidtransService,
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) { }

  async processPayment(data: PaymentInput, userId: number) {
    const { bookingId, method, amount } = data;
    console.log(data)

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
      },
      include: {
        user: true,
        travelPackage: true,
        bookingHotels: {
          include: {
            hotel: true,
          },
        },
        bookingFlights: {
          include: {
            flight: true,
          },
        },
        payments: true,
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
        `Payment amount must match the booking price: ${booking.totalPrice}`,
      );
    }

    if (booking.paymentStatus === PaymentStatus.paid) {
      throw new BadRequestException(
        `Booking with ID ${bookingId} has already been paid.`,
      );
    }

    if (
      booking.status === BookingStatus.rejected ||
      booking.status === BookingStatus.refunded
    ) {
      throw new BadRequestException(
        `Cannot process payment for booking with status: ${booking.status}`,
      );
    }

    const orderId = `BOOKING-${bookingId}-${Date.now()}-${userId}`;

    let itemName = `Booking: ${bookingId}`;
    if (booking.travelPackage) {
      itemName = `Travel Package: ${booking.travelPackage.title}`;
    } else if (booking.bookingHotels.length > 0) {
      itemName = `Hotel: ${booking.bookingHotels[0].hotel.name}`;
    } else if (booking.bookingFlights.length > 0) {
      itemName = `Flight: ${booking.bookingFlights[0].flight.airlineName}`;
    }

    try {
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
            name: itemName,
            price: parseFloat(booking.totalPrice.toString()),
            quantity: 1,
          },
        ],
        callbackUrl: `${this.configService.get<string>('FRONTEND_URL')}/payment/callback`,
      });

      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          method,
          amount,
          paymentDate: new Date,
        },
      });

      return {
        payment,
        midtrans: midtransResponse,
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new BadRequestException('Failed to create payment transaction');
    }
  }

  async handlePaymentCallback(callbackData: any) {
    try {
      const { order_id, transaction_status, fraud_status, transaction_time } = callbackData;

      const bookingIdMatch = order_id.match(/BOOKING-(\d+)-/);
      if (!bookingIdMatch) {
        throw new BadRequestException('Invalid order ID format');
      }

      const bookingId = parseInt(bookingIdMatch[1]);

      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId },
        include: {
          user: true,
          payments: true,
        },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      await this.prisma.$transaction(async (prisma) => {
        if (
          transaction_status === 'capture' ||
          transaction_status === 'settlement'
        ) {
          if (fraud_status === 'challenge') {
            console.log(
              `Payment for booking ${bookingId} is challenged by fraud detection`,
            );
            return;
          }

          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: PaymentStatus.paid,
              status: BookingStatus.confirmed,
            },
          });

          const payment = booking.payments.find(
            (p) => p.bookingId === bookingId,
          );
          if (payment) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                paymentDate: transaction_time
                  ? new Date(transaction_time)
                  : new Date(),
              },
            });
          }

          const notification =
            await this.notificationService.notifyPaymentSuccess(
              booking.userId,
              bookingId,
            );

          if (this.notificationGateway.isUserOnline(booking.userId)) {
            await this.notificationGateway.sendNotifToUser(
              booking.userId,
              notification,
            );
          }
        } else if (
          transaction_status === 'deny' ||
          transaction_status === 'cancel' ||
          transaction_status === 'expire' ||
          transaction_status === 'failure'
        ) {
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: PaymentStatus.unpaid,
            },
          });

          const notification =
            await this.notificationService.notifyPaymentFailed(
              booking.userId,
              bookingId,
            );

          if (this.notificationGateway.isUserOnline(booking.userId)) {
            await this.notificationGateway.sendNotifToUser(
              booking.userId,
              notification,
            );
          }
        } else if (transaction_status === 'pending') {
          console.log(`Payment for booking ${bookingId} is pending`);
        }
      });

      console.log(
        `Payment callback processed for booking ${bookingId}: ${transaction_status}`,
      );

      return {
        success: true,
        message: `Payment callback processed successfully for booking ${bookingId}`,
        bookingId,
        status: transaction_status,
      };
    } catch (error) {
      console.error('Error processing payment callback:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to process payment callback');
    }
  }

  async getPaymentHistory(userId: number) {
    return this.prisma.payment.findMany({
      where: {
        booking: {
          userId: userId,
        },
      },
      include: {
        booking: {
          include: {
            travelPackage: true,
            bookingHotels: {
              include: {
                hotel: true,
              },
            },
            bookingFlights: {
              include: {
                flight: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async getPaymentDetails(paymentId: number, userId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        booking: {
          userId: userId,
        },
      },
      include: {
        booking: {
          include: {
            travelPackage: true,
            bookingHotels: {
              include: {
                hotel: true,
              },
            },
            bookingFlights: {
              include: {
                flight: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return payment;
  }
}
