import { Body, Controller, Get, ParseIntPipe, Post, Query, UseGuards, Param, Delete } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/user/jwt-auth.guard';
import { RolesGuard } from 'src/user/roles.guard';
import { Roles } from 'src/user/decorator/roles.decorator';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { GetChatHistoryRequest, SendMessageRequest } from 'src/model/chat.model';

@Controller('/api/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private chatService: ChatService) { }

  @Post('/send')
  @Roles('admin', 'agent', 'customer')
  async sendMessage(
    @CurrentUser() user: any,
    @Body() data: SendMessageRequest,
  ) {
    return await this.chatService.sendMessage(user.id, data);
  }

  @Get('/history/:userId')
  @Roles('admin', 'agent', 'customer')
  async getChatHistory(
    @CurrentUser() user: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: GetChatHistoryRequest,
  ) {
    return await this.chatService.getChatHistory(user.id, {
      ...query,
      userId,
    });
  }

  @Get('/list')
  @Roles('admin', 'agent', 'customer')
  async getChatList(@CurrentUser() user: any) {
    return await this.chatService.getChatList(user.id);
  }

  @Post('/mark-read/:senderId')
  @Roles('admin', 'agent', 'customer')
  async markMessagesAsRead(
    @CurrentUser() user: any,
    @Param('senderId', ParseIntPipe) senderId: number,
  ) {
    return await this.chatService.markMessagesAsRead(user.id, { senderId });
  }

  @Get('/unread-count')
  @Roles('admin', 'agent', 'customer')
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.chatService.getUnreadMessageCount(user.id);
    return { count };
  }

  @Delete('/message/:messageId')
  @Roles('admin', 'agent', 'customer')
  async deleteMessage(
    @CurrentUser() user: any,
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    await this.chatService.deleteMessage(messageId, user.id);
    return { success: true };
  }
}
