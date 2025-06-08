import { NotificationType } from "@prisma/client";

export interface CreateNotification {
  userId: number;
  message: string;
  type: NotificationType;
  isRead?: boolean;
}

export interface GetNotificationQuery {
  page?: number;
  limit?: number;
  isRead: boolean;
  type: NotificationType;
}

export interface NotificationResponse {
  userId: number;
  message: string;
  type: NotificationType;
  isRead?: boolean;
  createdAt: Date;
}
