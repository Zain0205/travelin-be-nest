import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from 'src/common/prisma.service';
import { CreateNotification, GetNotificationQuery } from 'src/model/notification.model';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) { }

  async createNotification(data: CreateNotification) {
    const { userId, message, type, isRead } = data
    const notification = this.prisma.notification.create({
      data: {
        userId,
        message,
        type,
        isRead
      }
    });

    return notification;
  }

  async getNotification(userId: number, query: GetNotificationQuery) {
    const { page = 1, limit = 10, isRead, type } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = { userId }

    if (isRead !== undefined) {
      whereClause.isRead = isRead;
    }

    if (type) {
      whereClause.type = type;
    }

    const [notification, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause })
    ])

    return {
      data: notification,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        // unreadCounts: await this.getUnreadCounts(userId)
      }
    }
  }

  async markAsRead(notificationId: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId }
    })

    if (!notification) {
      throw new NotFoundException('notification not found')
    }

    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: number): Promise<number> {
    return await this.prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  async deleteNotification(notificationId: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async notifyBookingCreated(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Your booking #${bookingId} has been created successfully`,
      type: NotificationType.booking,
    });
  }

  async notifyBookingConfirmed(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Your booking #${bookingId} has been confirmed`,
      type: NotificationType.booking,
    });
  }

  async notifyBookingRejected(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Your booking #${bookingId} has been rejected`,
      type: NotificationType.booking,
    });
  }

  async notifyPaymentSuccess(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Payment for booking #${bookingId} has been successful`,
      type: NotificationType.payment,
    });
  }

  async notifyPaymentFailed(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Payment for booking #${bookingId} has failed`,
      type: NotificationType.payment,
    });
  }

  async notifyRescheduleApproved(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Reschedule request for booking #${bookingId} has been approved`,
      type: NotificationType.booking,
    });
  }

  async notifyRescheduleRejected(userId: number, bookingId: number) {
    return await this.createNotification({
      userId,
      message: `Reschedule request for booking #${bookingId} has been rejected`,
      type: NotificationType.booking,
    });
  }

  async notifyRefundRequested(userId: number, bookingId: number, bookingType: string) {
    const typeLabel = this.getBookingTypeLabel(bookingType);
    return this.createNotification({
      userId,
      message: `Permintaan refund untuk booking ${typeLabel} #${bookingId} telah dikirim`,
      type: 'booking',
    });
  }

  async notifyRefundApproved(userId: number, bookingId: number, bookingType: string) {
    const typeLabel = this.getBookingTypeLabel(bookingType);
    return this.createNotification({
      userId,
      message: `Refund untuk booking ${typeLabel} #${bookingId} telah disetujui`,
      type: 'payment',
    });
  }

  async notifyRefundRejected(userId: number, bookingId: number, bookingType: string) {
    const typeLabel = this.getBookingTypeLabel(bookingType);
    return this.createNotification({
      userId,
      message: `Refund untuk booking ${typeLabel} #${bookingId} ditolak`,
      type: 'payment',
    });
  }

  async notifyBookingCancelled(userId: number, bookingId: number, bookingType: string) {
    const typeLabel = this.getBookingTypeLabel(bookingType);
    return this.createNotification({
      userId,
      message: `Booking ${typeLabel} #${bookingId} telah dibatalkan`,
      type: 'booking',
    });
  }

  private getBookingTypeLabel(bookingType: string): string {
    const labels = {
      package: 'Paket Wisata',
      hotel: 'Hotel',
      flight: 'Penerbangan',
      custom: 'Custom',
    };
    return labels[bookingType] || 'Booking';
  }
}
