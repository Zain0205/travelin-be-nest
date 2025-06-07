import { NotificationType } from "@prisma/client";

export interface CreateNotification {
  userId: number;
  message: string;
  type: NotificationType;
  isRead: boolean;
}

export class GetNotificationQuery {
  page?: number = 1;
  limit?: number = 10;
  isRead: boolean;
  type: NotificationType;
}
