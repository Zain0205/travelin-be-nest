export interface SendMessageRequest {
  receiverId: number;
  message: string;
}

export interface GetChatHistoryRequest {
  userId: number;
  page?: number;
  limit?: number;
}

export interface MarkMessagesReadRequest {
  senderId: number;
}

export interface ChatResponse {
  id: number;
  senderId: number;
  receiverId: number;
  message: string;
  sentAt: Date;
  isRead: boolean;
  sender: {
    id: number;
    name: string;
    role: string;
  };
  receiver: {
    id: number;
    name: string;
    role: string;
  };
}

export interface ChatListResponse {
  userId: number;
  userName: string;
  userRole: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}
