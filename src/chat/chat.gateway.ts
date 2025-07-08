import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from "socket.io"
import { PrismaService } from 'src/common/prisma.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { NotificationService } from 'src/notification/notification.service';
import { ChatService } from './chat.service';
import { SendMessageRequest } from 'src/model/chat.model';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private connectedUsers = new Map<number, string>()

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
    private configService: ConfigService,
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) { }


  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization

      if (!token) {
        socket.disconnect()
        return
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET')
      })

      console.log(payload)

      const userId = payload.sub;
      this.connectedUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);

      console.log(`User ${userId} connected to chat`);

      const unreadCount = await this.chatService.getUnreadMessageCount(userId);
      socket.emit('unreadMessageCount', { count: unreadCount });

    } catch (err) {
      console.error('Chat WebSocket connection error:', err);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === socket.id) {
        this.connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected from chat`);
        break;
      }
    }
  }

  @SubscribeMessage('joinChatRoom')
  handleJoinChatRoom(
    @MessageBody() data: { userId: number; partnerId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const roomName = this.getChatRoomName(data.userId, data.partnerId);
    socket.join(roomName);
    console.log(`User ${data.userId} joined chat room: ${roomName}`);
  }

  @SubscribeMessage('leaveChatRoom')
  handleLeaveChatRoom(
    @MessageBody() data: { userId: number; partnerId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const roomName = this.getChatRoomName(data.userId, data.partnerId);
    socket.leave(roomName);
    console.log(`User ${data.userId} left chat room: ${roomName}`);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { senderId: number, message: SendMessageRequest },
    @ConnectedSocket() socket: Socket
  ) {
    try {
      const chatMessage = await this.chatService.sendMessage(data.senderId, data.message)

      const roomName = this.getChatRoomName(data.senderId, data.message.receiverId)
      this.server.to(roomName).emit("newMessage", chatMessage)

      this.server.to(`user:${data.message.receiverId}`).emit('messageReceived', chatMessage);

      // await this.notificationService.createNotification({
      //   userId: data.message.receiverId,
      //   message: `New message from ${chatMessage.sender.name}`,
      //   type: "chat",
      // });

      // await this.notificationGateway.sendNotifToUser(
      //   data.message.receiverId, {
      //   message: `New message from ${chatMessage.sender.name}`,
      //   type: "chat",
      //   senderId: data.senderId,
      //   senderName: chatMessage.sender.name,
      // });

      socket.emit('messageSent', {
        success: true,
        messageId: chatMessage.id,
      });

    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('messageError', {
        error: err.message,
      });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @MessageBody() data: { userId: number; senderId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      await this.chatService.markMessagesAsRead(data.userId, { senderId: data.senderId });

      this.server.to(`user:${data.senderId}`).emit('messagesRead', {
        readBy: data.userId,
        timestamp: new Date(),
      });

      socket.emit('markAsReadSuccess', { success: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('markAsReadError', { error: error.message });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { userId: number; partnerId: number; isTyping: boolean },
    @ConnectedSocket() socket: Socket,
  ) {
    const roomName = this.getChatRoomName(data.userId, data.partnerId);
    socket.to(roomName).emit('userTyping', {
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('getChatHistory')
  async handleGetChatHistory(
    @MessageBody() data: { userId: number; partnerId: number; page?: number; limit?: number },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const history = await this.chatService.getChatHistory(data.userId, {
        userId: data.partnerId,
        page: data.page,
        limit: data.limit,
      });

      socket.emit('chatHistory', history);
    } catch (error) {
      console.error('Error getting chat history:', error);
      socket.emit('chatHistoryError', { error: error.message });
    }
  }

  @SubscribeMessage('getChatList')
  async handleGetChatList(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const chatList = await this.chatService.getChatList(data.userId);
      socket.emit('chatList', chatList);
    } catch (error) {
      console.error('Error getting chat list:', error);
      socket.emit('chatListError', { error: error.message });
    }
  }

  private getChatRoomName(userId1: number, userId2: number): string {
    return `chat:${Math.min(userId1, userId2)}-${Math.max(userId1, userId2)}`;
  }

  isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  async sendMessageToUser(userId: number, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  broadcastToChat(roomName: string, event: string, data: any) {
    this.server.to(roomName).emit(event, data);
  }
}
