import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/common/prisma.service';
import {
  BookingDetails,
  CancelBookingInput,
  ProcessRefundInput,
  RefundInput,
  RefundQueryInput,
} from 'src/model/refund.model';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { MidtransService } from 'src/payment/midtrans.service';

@Injectable()
export class RefundService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
    private midtransService: MidtransService,
  ) {}

  async getBookingDetails(
    bookingId: number,
    userId: number,
  ): Promise<BookingDetails> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: userId,
      },
      include: {
        travelPackage: {
          include: {
            agent: { select: { id: true, name: true, email: true } },
          },
        },
        bookingHotels: {
          include: {
            hotel: {
              include: {
                agent: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        bookingFlights: {
          include: {
            flight: {
              include: {
                agent: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        payments: true,
        refund: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking tidak ditemukan');
    }

    const bookingDetails: BookingDetails = {
      id: booking.id,
      type: booking.type as any,
      totalPrice: Number(booking.totalPrice),
      travelDate: booking.travelDate,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      items: {},
    };

    if (booking.travelPackage) {
      bookingDetails.items.package = {
        id: booking.travelPackage.id,
        title: booking.travelPackage.title,
        agentId: booking.travelPackage.agentId,
      };
    }

    if (booking.bookingHotels.length > 0) {
      bookingDetails.items.hotels = booking.bookingHotels.map((bh) => ({
        id: bh.hotel.id,
        name: bh.hotel.name,
        checkInDate: bh.checkInDate,
        checkOutDate: bh.checkOutDate,
        nights: bh.nights,
        totalPrice: Number(bh.totalPrice),
        agentId: bh.hotel.agentId,
      }));
    }

    if (booking.bookingFlights.length > 0) {
      bookingDetails.items.flights = booking.bookingFlights.map((bf) => ({
        id: bf.flight.id,
        airlineName: bf.flight.airlineName,
        origin: bf.flight.origin,
        destination: bf.flight.destination,
        departureTime: bf.flight.departureTime,
        arrivalTime: bf.flight.arrivalTime,
        totalPrice: Number(bf.totalPrice),
        agentId: bf.flight.agentId,
      }));
    }

    return bookingDetails;
  }

  private validateRefundEligibility(booking: BookingDetails): void {
    if (!['confirmed', 'paid'].includes(booking.status)) {
      throw new BadRequestException(
        'Hanya booking yang sudah di konfirmasi dan di bayar yang bisa di refund',
      );
    }

    if (booking.paymentStatus !== 'paid') {
      throw new BadRequestException(
        'Booking yang belum dibayar tidak bisa di refund',
      );
    }

    const travelDate = new Date(booking.travelDate);
    const now = new Date();
    const dayDiff = Math.ceil(
      (travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (dayDiff < 1) {
      throw new BadRequestException(
        'Refund hanya bisa dilakukan minimal H-1 sebelum tanggal perjalanan',
      );
    }
  }

  private calculateRefundAmount(originalAmount: number): number {
    return Math.floor(originalAmount * 0.5);
  }

  private async restoreQuotas(booking: BookingDetails): Promise<void> {
    if (booking.items.package) {
      await this.prisma.travelPackage.update({
        where: { id: booking.items.package.id },
        data: { quota: { increment: 1 } },
      });
    }
  }

  async requestRefund(data: RefundInput, userId: number) {
    const { bookingId, reason } = data;

    const booking = await this.getBookingDetails(bookingId, userId);

    const existingRefund = await this.prisma.refund.findUnique({
      where: { bookingId },
    });

    if (existingRefund) {
      throw new BadRequestException(
        'Refund request sudah ada untuk booking ini',
      );
    }

    this.validateRefundEligibility(booking);

    const originalAmount = booking.totalPrice;
    const refundAmount = this.calculateRefundAmount(originalAmount);

    const refund = await this.prisma.refund.create({
      data: {
        bookingId,
        userId,
        amount: new Decimal(refundAmount),
        originalAmount: new Decimal(originalAmount),
        reason: reason || 'Customer requested refund',
        status: 'pending',
      },
      include: {
        booking: {
          include: {
            user: true,
            travelPackage: true,
            bookingHotels: { include: { hotel: true } },
            bookingFlights: { include: { flight: true } },
          },
        },
      },
    });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    await this.restoreQuotas(booking);

    const notification = await this.notificationService.notifyRefundRequested(
      userId,
      bookingId,
      booking.type,
    );

    await this.notificationGateway.sendNotifToUser(userId, {
      ...notification,
      refund: {
        id: refund.id,
        amount: refund.amount,
        originalAmount: refund.originalAmount,
        status: refund.status,
      },
    });

    return {
      success: true,
      message: 'Refund request berhasil dibuat',
      refund: {
        ...refund,
        amount: Number(refund.amount),
        originalAmount: Number(refund.originalAmount),
      },
    };
  }

  async cancelBooking(
    data: CancelBookingInput,
    userId: number,
    bookingId: number,
  ) {
    const { reason, requestRefund } = data;

    const booking = await this.getBookingDetails(bookingId, userId);

    if (['cancelled', 'refunded'].includes(booking.status)) {
      throw new BadRequestException('Booking sudah dibatalkan sebelumnya');
    }
    
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });

    await this.restoreQuotas(booking);

    let refund: any = null;

    if (requestRefund && booking.paymentStatus === 'paid') {
      try {
        refund = await this.requestRefund({ bookingId, reason }, userId);
      } catch (err) {
        console.error(err);
      }
    }

    const notification = await this.notificationService.notifyBookingCancelled(
      userId,
      bookingId,
      booking.type,
    );

    await this.notificationGateway.sendNotifToUser(userId, notification);

    return {
      success: true,
      message: 'Booking berhasil dibatalkan',
      booking: { id: bookingId, status: 'Cancelled' },
      refund: refund?.refund || null,
    };
  }

  async processRefund(data: ProcessRefundInput, adminId: number) {
    const { refundId, status, refundMethod, refundProof } = data;

    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        booking: {
          include: {
            user: true,
            payments: true,
            travelPackage: true,
            bookingHotels: { include: { hotel: true } },
            bookingFlights: { include: { flight: true } },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.status !== 'pending') {
      throw new BadRequestException('Refund request sudah diproses sebelumnya');
    }

    const updatedData: any = {
      status,
      processedBy: adminId,
      processedAt: new Date(),
    };

    if (status === 'approved') {
      if (!refundMethod) {
        throw new BadRequestException('Refund method harus diisi');
      }
      updatedData.refundMethod = refundMethod;
      updatedData.refundProof = refundProof;

      await this.prisma.booking.update({
        where: { id: refund.bookingId },
        data: { status: 'refunded' },
      });

      if (refund.booking.payments.length > 0) {
        try {
          const orderId = `BOOKING-${refund.bookingId}`;
          await this.midtransService.refundTransaction(
            orderId,
            Number(refund.amount),
          );
        } catch (err) {
          console.error(`Error processing midtrans refund`);
        }
      }
    }

    const updatedRefund = await this.prisma.refund.update({
      where: { id: refundId },
      data: updatedData,
      include: {
        booking: {
          include: {
            user: true,
            travelPackage: true,
            bookingHotels: { include: { hotel: true } },
            bookingFlights: { include: { flight: true } },
          },
        },
      },
    });

    let bookingType: string = 'custom';
    if (updatedRefund.booking.travelPackage) {
      bookingType = 'package';
    } else if (updatedRefund.booking.bookingHotels.length > 0) {
      bookingType = 'hotel';
    } else if (updatedRefund.booking.bookingFlights.length > 0) {
      bookingType = 'flight';
    }

    const notification =
      status === 'approved'
        ? await this.notificationService.notifyRefundApproved(
            refund.userId,
            refund.bookingId,
            bookingType,
          )
        : await this.notificationService.notifyRefundRejected(
            refund.userId,
            refund.bookingId,
            bookingType,
          );

    await this.notificationGateway.sendNotifToUser(refund.userId, {
      ...notification,
      refund: {
        id: updatedRefund.id,
        status: updatedRefund.status,
        amount: Number(updatedRefund.amount),
        originalAmount: Number(updatedRefund.originalAmount),
      },
    });

    return {
      success: true,
      message: `Refund ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
      refund: {
        ...updatedRefund,
        amount: Number(updatedRefund.amount),
        originalAmount: Number(updatedRefund.originalAmount),
      },
    };
  }

  async getRefunds(
    query: RefundQueryInput,
    userId?: number,
    userRole?: string,
  ) {
    const {
      status,
      bookingType,
      page = 1,
      limit = 10,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (bookingType) {
      whereClause.booking = { type: bookingType };
    }

    if (userRole === 'customer') {
      whereClause.userId = userId;
    } else if (userRole === 'agent') {
      whereClause.booking = {
        ...whereClause.booking,
        OR: [
          { travelPackage: { agentId: userId } },
          { bookingHotels: { some: { hotel: { agentId: userId } } } },
          { bookingFlights: { some: { flight: { agentId: userId } } } },
        ],
      };
    }

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where: whereClause,
        include: {
          booking: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              travelPackage: true,
              bookingHotels: { include: { hotel: true } },
              bookingFlights: { include: { flight: true } },
            },
          },
          processor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.refund.count({ where: whereClause }),
    ]);

    const formattedRefunds = refunds.map((refund) => ({
      ...refund,
      amount: Number(refund.amount),
      originalAmount: Number(refund.originalAmount),
      booking: {
        ...refund.booking,
        totalPrice: Number(refund.booking.totalPrice),
      },
    }));

    return {
      data: formattedRefunds,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRefundById(refundId: number, userId?: number, userRole?: string) {
    const whereClause: any = { id: refundId };

    if (userRole === 'customer') {
      whereClause.userId = userId;
    } else if (userRole === 'agent') {
      whereClause.booking = {
        OR: [
          { travelPackage: { agentId: userId } },
          { bookingHotels: { some: { hotel: { agentId: userId } } } },
          { bookingFlights: { some: { flight: { agentId: userId } } } },
        ],
      };
    }

    const refund = await this.prisma.refund.findFirst({
      where: whereClause,
      include: {
        booking: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            travelPackage: true,
            bookingHotels: { include: { hotel: true } },
            bookingFlights: { include: { flight: true } },
            payments: true,
          },
        },
        processor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund tidak ditemukan');
    }

    return {
      ...refund,
      amount: Number(refund.amount),
      originalAmount: Number(refund.originalAmount),
      booking: {
        ...refund.booking,
        totalPrice: Number(refund.booking.totalPrice),
      },
    };
  }
}
