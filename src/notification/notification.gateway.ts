import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from "socket.io"
import { NotificationService } from './notification.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notification',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUser = new Map<number, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationService: NotificationService
  ) { }

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization

      if (!token) {
        socket.disconnect()
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET')
      })

      const userId = payload.sub;
      this.connectedUser.set(userId, socket.id)

      socket.join(`user: ${userId}`)

      const unreadCount = await this.notificationService.getUnreadCount(userId)
      socket.emit('unreadCount', { count: unreadCount })
    } catch (err) {
      console.error("Websocket connection error")
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    for (const [userId, socketId] of this.connectedUser.entries()) {
      if (socketId === socket.id) {
        this.connectedUser.delete(userId)
        console.log(`user ${userId} disconected`)
      }
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { userId: number }, @ConnectedSocket() socket: Socket) {
    socket.join(`user: ${data.userId}`)
  }

  @SubscribeMessage('maarkAsRead')
  async handleMarkAsRead(@MessageBody() data: { notificationId: number, userId: number }) {
    try {
      await this.notificationService.markAsRead(data.notificationId, data.userId)
      const unreadCount = await this.notificationService.getUnreadCount(data.userId)

      this.server.to(`user: ${data.userId}`).emit('notificationRead', {
        notificationId: data.notificationId,
        unreadCount,
      });
    } catch (err) {
      console.error(`Error making notification as read`)
    }
  }

  async sendNotifToUser(userId: number, notification: any) {
    this.server.to(`user: ${userId}`).emit('newNotification', notification)

    const unreadCount = await this.notificationService.getUnreadCount(userId)
    this.server.to(`user: ${userId}`).emit('unreadCount', { count: unreadCount })
  }

  broadcastNotification(notification: any) {
    this.server.emit('broadcast', notification)
  }

  isUserOnline(userId: number): boolean {
    return this.connectedUser.has(userId);
  }

  getOnlineUsersCount(): number {
    return this.connectedUser.size;
  }
}
