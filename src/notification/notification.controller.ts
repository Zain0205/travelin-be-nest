import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { Role } from '@prisma/client';
import { GetNotificationQuery } from 'src/model/notification.model';

@Controller('/api/notification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway
  ) { }

  @Get()
  @Roles('costumer', 'admin', 'agent')
  async getNotification(@CurrentUser() user: { id: number, role: Role }, query: GetNotificationQuery) {
    return await this.notificationService.getNotification(user.id, query)
  }

  @Get('/unread-count')
  @Roles('costumer', 'admin', 'agent')
  async getUnreadCount(@CurrentUser() user: { id: number, role: Role }) {
    const count = await this.notificationService.getUnreadCount(user.id)
    return { count }
  }

  @Post('/:id/mark-as-read')
  @Roles('costumer', 'admin', 'agent')
  async markAsRead(@Param('id', ParseIntPipe) notificationId: number, @CurrentUser() user: { id: number, role: Role }) {
    const notification = await this.notificationService.markAsRead(notificationId, user.sub);

    const unreadCount = await this.notificationService.getUnreadCount(user.id);
    this.notificationGateway.sendNotifToUser(user.id, {
      type: 'read',
      notificationId,
      unreadCount,
    });

    return notification;
  }

  @Post('/mark-all-read')
  @Roles('customer', 'agent', 'admin')
  async markAllAsRead(@CurrentUser() user: { id: number, role: Role }) {
    const result = await this.notificationService.markAllAsRead(user.id);

    this.notificationGateway.sendNotifToUser(user.id, {
      type: 'allRead',
      unreadCount: 0,
    });

    return result;
  }

  @Delete('/:id')
  @Roles('customer', 'agent', 'admin')
  async deleteNotification(
    @Param('id', ParseIntPipe) notificationId: number,
    @CurrentUser() user: { id: number, role: Role }
  ) {
    return await this.notificationService.deleteNotification(notificationId, user.id);
  }

  @Get('/stats')
  @Roles('admin')
  async getNotificationStats() {
    return {
      onlineUsers: this.notificationGateway.getOnlineUsersCount(),
      // Add more stats as needed
    };
  }

  @Post('/broadcast')
  @Roles('admin')
  async broadcastNotification(@Body() data: { message: string }) {
    this.notificationGateway.broadcastNotification({
      message: data.message,
      type: 'broadcast',
      timestamp: new Date(),
    });

    return { success: true };
  }
}
