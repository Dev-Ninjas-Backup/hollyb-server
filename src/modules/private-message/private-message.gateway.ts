import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { WEBSOCKET_CORS_CONFIG } from 'src/common/constants/cors.constant';
import { SocketAuthMiddleware } from 'src/common/jwt/socket-auth.middleware';
import { PrivateChatService } from './private-message.service';

/**
 * Private Chat Events - WebSocket event names for one-to-one messaging
 */
export enum PrivateChatEvents {
  // Connection events
  ERROR = 'private:error',
  SUCCESS = 'private:success',
  CONNECTED = 'private:connected',

  // Message events
  SEND_MESSAGE = 'private:send_message',
  NEW_MESSAGE = 'private:new_message',
  MESSAGE_SENT = 'private:message_sent',

  // Conversation events
  LOAD_CONVERSATIONS = 'private:load_conversations',
  CONVERSATION_LIST = 'private:conversation_list',
  LOAD_SINGLE_CONVERSATION = 'private:load_single_conversation',
  CONVERSATION_MESSAGES = 'private:conversation_messages',
  NEW_CONVERSATION = 'private:new_conversation',
  LOAD_MORE_MESSAGES = 'private:load_more_messages',

  // Read receipt events
  MARK_READ = 'private:mark_read',
  MARK_CONVERSATION_READ = 'private:mark_conversation_read',
  MESSAGES_READ = 'private:messages_read',
  MESSAGE_DELIVERED = 'private:message_delivered',

  // Typing indicators
  TYPING_START = 'private:typing_start',
  TYPING_STOP = 'private:typing_stop',
  USER_TYPING = 'private:user_typing',
  USER_STOP_TYPING = 'private:user_stop_typing',

  // Unread count
  UNREAD_COUNT = 'private:unread_count',
}

@WebSocketGateway({
  cors: WEBSOCKET_CORS_CONFIG,
  namespace: '/pv/message',
})
export class PrivateChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PrivateChatGateway.name);

  constructor(
    private readonly privateChatService: PrivateChatService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // Register JWT authentication middleware
    server.use(this.socketAuthMiddleware.use());

    this.logger.log(
      'Socket.IO server initialized for Private Chat with JWT middleware',
    );
  }

  /** Handle socket connection (authentication handled by middleware) */
  async handleConnection(client: Socket) {
    const userId = client.data.userId;
    const user = client.data.user;

    if (!userId || !user) {
      this.logger.error('Unauthenticated socket reached handleConnection');
      client.disconnect(true);
      return;
    }

    // Join user's personal room for targeted messaging
    client.join(userId);

    // Mark all pending messages as delivered
    try {
      const deliveredCount =
        await this.privateChatService.markAllMessagesDelivered(userId);
      if (deliveredCount > 0) {
        this.logger.log(
          `Marked ${deliveredCount} messages as delivered for user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error marking messages delivered: ${error.message}`);
    }

    // Get unread count and conversations
    try {
      const [conversations, unreadCount] = await Promise.all([
        this.privateChatService.getUserConversations(userId),
        this.privateChatService.getUnreadMessageCount(userId),
      ]);

      // Notify client of successful connection with unread count
      client.emit(PrivateChatEvents.CONNECTED, {
        userId,
        socketId: client.id,
        message: 'Connected successfully',
        unreadCount,
      });

      // Send conversation list
      client.emit(PrivateChatEvents.CONVERSATION_LIST, conversations);

      this.logger.log(
        `Private chat: User ${userId} (${user.email}) connected, socket ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Error loading data for ${userId}:`, error);
      client.emit(PrivateChatEvents.ERROR, {
        message: 'Failed to load initial data',
      });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      client.leave(userId);
    }
    this.logger.log(
      `Private chat disconnected: ${client.id}${userId ? ` (User: ${userId})` : ''}`,
    );
  }

  /** Load all conversations for the connected user */
  @SubscribeMessage(PrivateChatEvents.LOAD_CONVERSATIONS)
  async handleLoadConversations(@ConnectedSocket() client: Socket) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    try {
      const conversations =
        await this.privateChatService.getUserConversations(userId);
      client.emit(PrivateChatEvents.CONVERSATION_LIST, conversations);
    } catch (error) {
      this.logger.error('Error loading conversations:', error);
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.LOAD_CONVERSATIONS,
        message: 'Failed to load conversations',
      });
    }
  }

  /** Load a single conversation with messages */
  @SubscribeMessage(PrivateChatEvents.LOAD_SINGLE_CONVERSATION)
  async handleLoadSingleConversation(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    const parsed = this.parsePayload(payload);
    if (!parsed) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.LOAD_SINGLE_CONVERSATION,
        message: 'Invalid payload format',
      });
      return;
    }

    const conversationId = parsed.conversationId;
    const limit = parsed.limit || 50;
    const cursor = parsed.cursor;

    if (!conversationId) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.LOAD_SINGLE_CONVERSATION,
        message: 'conversationId is required',
      });
      return;
    }

    try {
      const conversation =
        await this.privateChatService.getPrivateConversationWithMessages(
          conversationId,
          userId,
          limit,
          cursor,
        );

      client.emit(PrivateChatEvents.CONVERSATION_MESSAGES, conversation);
    } catch (error) {
      this.logger.error(`Error loading conversation ${conversationId}:`, error);
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.LOAD_SINGLE_CONVERSATION,
        message: error.message || 'Failed to load conversation',
      });
    }
  }

  /** Load more messages (pagination) */
  @SubscribeMessage(PrivateChatEvents.LOAD_MORE_MESSAGES)
  async handleLoadMoreMessages(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    // Reuse the same logic as LOAD_SINGLE_CONVERSATION
    return this.handleLoadSingleConversation(payload, client);
  }

  /** Send a message (create conversation if new) */
  @SubscribeMessage(PrivateChatEvents.SEND_MESSAGE)
  async handleMessage(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    const parsed = this.parsePayload(payload);
    if (!parsed) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.SEND_MESSAGE,
        message: 'Invalid payload format',
      });
      return;
    }

    const { recipientId, content, type, fileId } = parsed;

    // Validate required fields
    if (!recipientId) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.SEND_MESSAGE,
        message: 'recipientId is required',
      });
      return;
    }

    // Content is required for TEXT type, fileId for media types
    const messageType = type || 'TEXT';
    if (messageType === 'TEXT' && !content) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.SEND_MESSAGE,
        message: 'content is required for text messages',
      });
      return;
    }

    if (messageType !== 'TEXT' && !fileId) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.SEND_MESSAGE,
        message: 'fileId is required for media messages',
      });
      return;
    }

    // Prevent sending message to yourself
    if (userId === recipientId) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.SEND_MESSAGE,
        message: 'Cannot send message to yourself',
      });
      return;
    }

    try {
      // Find or create conversation
      let conversation = await this.privateChatService.findConversation(
        userId,
        recipientId,
      );

      const isNewConversation = !conversation;

      if (!conversation) {
        conversation = await this.privateChatService.createConversation(
          userId,
          recipientId,
        );
      }

      // Send message
      const message = await this.privateChatService.sendPrivateMessage(
        conversation.id,
        userId,
        { content, type: messageType, fileId },
      );

      // Notify sender of successful send
      client.emit(PrivateChatEvents.MESSAGE_SENT, {
        success: true,
        message,
      });

      // Emit new message to both users
      this.server.to(userId).emit(PrivateChatEvents.NEW_MESSAGE, message);
      this.server.to(recipientId).emit(PrivateChatEvents.NEW_MESSAGE, message);

      // Update conversation lists for both users
      const [conversationsUser, conversationsRecipient] = await Promise.all([
        this.privateChatService.getUserConversations(userId),
        this.privateChatService.getUserConversations(recipientId),
      ]);

      this.server
        .to(userId)
        .emit(PrivateChatEvents.CONVERSATION_LIST, conversationsUser);
      this.server
        .to(recipientId)
        .emit(PrivateChatEvents.CONVERSATION_LIST, conversationsRecipient);

      // If new conversation, emit new conversation event
      if (isNewConversation) {
        this.server.to(recipientId).emit(PrivateChatEvents.NEW_CONVERSATION, {
          conversationId: conversation.id,
          participant: await this.getParticipantInfo(userId),
        });
      }
    } catch (error) {
      this.logger.error(`Error sending message from ${userId}:`, error);
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.SEND_MESSAGE,
        message: error.message || 'Failed to send message',
      });
    }
  }

  /** Helper for external services to emit new messages */
  emitNewMessage(userId: string, message: any) {
    this.server.to(userId).emit(PrivateChatEvents.NEW_MESSAGE, message);
  }

  /** Mark messages as read in a conversation */
  @SubscribeMessage(PrivateChatEvents.MARK_CONVERSATION_READ)
  async handleMarkConversationRead(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    const parsed = this.parsePayload(payload);
    const conversationId = parsed?.conversationId;

    if (!conversationId) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.MARK_CONVERSATION_READ,
        message: 'conversationId is required',
      });
      return;
    }

    try {
      const result = await this.privateChatService.markConversationAsRead(
        conversationId,
        userId,
      );

      // Notify the other user that their messages have been read
      this.server.to(result.otherUserId).emit(PrivateChatEvents.MESSAGES_READ, {
        conversationId,
        readBy: userId,
        messagesRead: result.messagesRead,
      });

      // Update conversation list for the user who marked as read
      const conversations =
        await this.privateChatService.getUserConversations(userId);
      client.emit(PrivateChatEvents.CONVERSATION_LIST, conversations);
    } catch (error) {
      this.logger.error(`Error marking conversation as read:`, error);
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.MARK_CONVERSATION_READ,
        message: error.message || 'Failed to mark as read',
      });
    }
  }

  /** Mark a single message as read */
  @SubscribeMessage(PrivateChatEvents.MARK_READ)
  async handleMarkMessageRead(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    const parsed = this.parsePayload(payload);
    const { messageId, conversationId } = parsed || {};

    if (!messageId) {
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.MARK_READ,
        message: 'messageId is required',
      });
      return;
    }

    try {
      await this.privateChatService.makePrivateMassageReadTrue(
        messageId,
        userId,
      );

      // If conversationId provided, get other user and notify
      if (conversationId) {
        const conversations =
          await this.privateChatService.getUserConversations(userId);
        const conversation = conversations.find(
          (c: any) => c.conversationId === conversationId,
        );
        if (conversation?.participant?.id) {
          this.server
            .to(conversation.participant.id)
            .emit(PrivateChatEvents.MESSAGES_READ, {
              conversationId,
              messageId,
              readBy: userId,
            });
        }
      }
    } catch (error) {
      this.logger.error(`Error marking message as read:`, error);
      client.emit(PrivateChatEvents.ERROR, {
        event: PrivateChatEvents.MARK_READ,
        message: error.message || 'Failed to mark as read',
      });
    }
  }

  /** Track when a user starts typing */
  @SubscribeMessage(PrivateChatEvents.TYPING_START)
  async handleTypingStart(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    const parsed = this.parsePayload(payload);
    const { conversationId, recipientId } = parsed || {};

    if (!conversationId || !recipientId) {
      return; // Silently ignore invalid typing events
    }

    this.server.to(recipientId).emit(PrivateChatEvents.USER_TYPING, {
      conversationId,
      userId,
    });
  }

  /** Track when a user stops typing */
  @SubscribeMessage(PrivateChatEvents.TYPING_STOP)
  async handleTypingStop(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    const parsed = this.parsePayload(payload);
    const { conversationId, recipientId } = parsed || {};

    if (!conversationId || !recipientId) {
      return; // Silently ignore invalid typing events
    }

    this.server.to(recipientId).emit(PrivateChatEvents.USER_STOP_TYPING, {
      conversationId,
      userId,
    });
  }

  /** Get unread count for the user */
  @SubscribeMessage(PrivateChatEvents.UNREAD_COUNT)
  async handleGetUnreadCount(@ConnectedSocket() client: Socket) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    try {
      const unreadCount =
        await this.privateChatService.getUnreadMessageCount(userId);
      const unreadPerConversation =
        await this.privateChatService.getUnreadCountPerConversation(userId);

      client.emit(PrivateChatEvents.UNREAD_COUNT, {
        total: unreadCount,
        perConversation: unreadPerConversation,
      });
    } catch (error) {
      this.logger.error(`Error getting unread count:`, error);
    }
  }

  // ============== HELPER METHODS ==============

  /** Extract and validate userId from socket */
  private getUserIdFromSocket(client: Socket): string | null {
    const userId = client.data?.userId;
    if (!userId) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'User not authenticated',
      });
      this.logger.warn('User ID not found in socket client');
      client.disconnect(true);
      return null;
    }
    return userId;
  }

  /** Parse payload (handles both string and object payloads) */
  private parsePayload(payload: any): any {
    if (!payload) return null;

    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      if (!trimmed) return null;

      try {
        return JSON.parse(trimmed);
      } catch {
        // If it's not JSON, return as-is for simple string values
        return { value: trimmed };
      }
    }

    return payload;
  }

  /** Get participant info for notifications */
  private async getParticipantInfo(userId: string) {
    try {
      const user = await this.privateChatService.validateUserExists(userId);
      return user;
    } catch {
      return { id: userId };
    }
  }
}
