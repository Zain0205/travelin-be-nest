import { z } from 'zod';

export const SendMessageSchema = z.object({
  receiverId: z.number().min(1, 'Receiver ID is required'),
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

export const GetChatHistorySchema = z.object({
  userId: z.number().min(1, 'User ID is required'),
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
});

export const MarkMessagesReadSchema = z.object({
  senderId: z.number().min(1, 'Sender ID is required'),
});
