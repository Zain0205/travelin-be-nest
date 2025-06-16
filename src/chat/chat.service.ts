import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma.service';
import { ValidationService } from 'src/common/validation.service';
import {
  ChatListResponse,
  ChatResponse,
  GetChatHistoryRequest,
  MarkMessagesReadRequest,
  SendMessageRequest,
} from 'src/model/chat.model';
import { GetChatHistorySchema, MarkMessagesReadSchema, SendMessageSchema } from './chat.validation';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private validationService: ValidationService,
  ) { }

  async sendMessage(
    senderId: number,
    data: SendMessageRequest,
  ): Promise<ChatResponse> {
    const validatedRequest = this.validationService.validate(
      SendMessageSchema,
      data,
    );

    const receiver = await this.prisma.user.findUnique({
      where: { id: validatedRequest.receiverId },
      select: { id: true, name: true, role: true },
    });

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, name: true, role: true },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const validRoleCombinations = [
      { sender: 'customer', receiver: 'agent' },
      { sender: 'agent', receiver: 'customer' },
      { sender: 'admin', receiver: 'customer' },
      { sender: 'admin', receiver: 'agent' },
      { sender: 'customer', receiver: 'admin' },
      { sender: 'agent', receiver: 'admin' },
    ];

    const isValidCombination = validRoleCombinations.some(
      (combo) =>
        combo.sender === sender.role && combo.receiver === receiver.role,
    );

    if (!isValidCombination) {
      throw new BadRequestException('Invalid role combination for chat');
    }

    const message = await this.prisma.liveChat.create({
      data: {
        senderId,
        receiverId: validatedRequest.receiverId,
        message: validatedRequest.message,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      message: message.message,
      sentAt: message.sentAt,
      isRead: false,
      sender: message.sender,
      receiver: message.receiver,
    };
  }

  async getChatHistory(
    userId: number,
    data: GetChatHistoryRequest,
  ): Promise<{
    data: ChatResponse[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const validatedData = this.validationService.validate(
      GetChatHistorySchema,
      data,
    );
    const { page = 1, limit = 10 } = validatedData;
    const skip = (page - 1) * limit;

    const whereClause = {
      OR: [
        { senderId: userId, receiverId: validatedData.userId },
        { senderId: validatedData.userId, receiverId: userId },
      ],
    };

    const [messages, total] = await Promise.all([
      this.prisma.liveChat.findMany({
        where: whereClause,
        include: {
          sender: {
            select: { id: true, name: true, role: true },
          },
          receiver: {
            select: { id: true, name: true, role: true },
          },
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.liveChat.count({ where: whereClause }),
    ]);

    const chatResponses: ChatResponse[] = messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      message: message.message,
      sentAt: message.sentAt,
      isRead: message.senderId !== userId,
      sender: message.sender,
      receiver: message.receiver,
    }));

    return {
      data: chatResponses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChatList(userId: number): Promise<ChatListResponse[]> {
    const chatPartners = await this.prisma.liveChat.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
        receiver: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    const chatMap = new Map<number, ChatListResponse>();

    for (const chat of chatPartners) {
      const partnerId =
        chat.senderId === userId ? chat.receiverId : chat.senderId;
      const partner = chat.senderId === userId ? chat.receiver : chat.sender;

      if (!chatMap.has(partnerId)) {
        const unreadCount = await this.prisma.liveChat.count({
          where: {
            senderId: partnerId,
            receiverId: userId,
            isRead: false,
          },
        });

        chatMap.set(partnerId, {
          userId: partner.id,
          userName: partner.name,
          userRole: partner.role,
          lastMessage: chat.message,
          lastMessageTime: chat.sentAt,
          unreadCount: unreadCount,
        });
      }
    }

    return Array.from(chatMap.values());
  }

  async markMessagesAsRead(userId: number, data: MarkMessagesReadRequest): Promise<void> {
    const validatedData = this.validationService.validate(MarkMessagesReadSchema, data);

    const sender = await this.prisma.user.findUnique({
      where: { id: validatedData.senderId }
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    await this.prisma.liveChat.updateMany({
      where: {
        senderId: validatedData.senderId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    return await this.prisma.liveChat.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const message = await this.prisma.liveChat.findFirst({
      where: {
        id: messageId,
        senderId: userId
      }
    });

    if (!message) {
      throw new NotFoundException('Message not found or unauthorized');
    }

    await this.prisma.liveChat.delete({
      where: { id: messageId }
    });
  }
}

