import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { PrismaService } from 'src/prisma/prisma.service';
import { PrivateChatService } from './private-message.service';;

enum PrivateChatEvents {
  ERROR = 'private:error',
  SUCCESS = 'private:success',
  NEW_MESSAGE = 'private:new_message',
  SEND_MESSAGE = 'private:send_message',
  NEW_CONVERSATION = 'private:new_conversation',
  CONVERSATION_LIST = 'private:conversation_list',
  LOAD_CONVERSATIONS = 'private:load_conversations',
  LOAD_SINGLE_CONVERSATION = 'private:load_single_conversation',
  TYPING_STOP = 'private:typing_stop',
  USER_STOP_TYPING = 'private:user_stop_typing',
  TYPING_START = 'private:typing_start',
  USER_TYPING = 'private:user_typing',
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
      'Socket.IO server initialized FOR PRIVATE CHAT with JWT middleware',
      server.adapter.name,
    );
  }

  /** Handle socket connection (authentication handled by middleware) */
  async handleConnection(client: Socket) {
    // User is already authenticated by middleware
    const userId = client.data.userId;
    const user = client.data.user;

    if (!userId || !user) {
      // This shouldn't happen if middleware works correctly
      this.logger.error('Unauthenticated socket reached handleConnection');
      client.disconnect(true);
      return;
    }

    // Join user's personal room for targeted messaging
    client.join(userId);

    // Notify client of successful connection
    client.emit(PrivateChatEvents.SUCCESS, {
      userId,
      socketId: client.id,
      message: 'Connected successfully',
    });

    this.logger.log(
      `Private chat: User ${userId} (${user.email}) connected, socket ${client.id}`,
    );

    // Automatically load and send conversations on connection
    try {
      const conversations =
        await this.privateChatService.getUserConversations(userId);
      client.emit(PrivateChatEvents.SUCCESS, {
        socketId: client.id,
        userId,
        message: 'Conversations loaded',
      });
      client.emit(PrivateChatEvents.CONVERSATION_LIST, conversations);
      this.logger.log(`Automatically sent conversation list to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error auto-loading conversations for ${userId}:`,
        error,
      );
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

  /** Load all conversations for the connected user: Test_OK */
  @SubscribeMessage(PrivateChatEvents.LOAD_CONVERSATIONS)
  async handleLoadConversations(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'User not authenticated',
      });
      this.logger.warn('User not authenticated in handleLoadConversations');
      return;
    }

    try {
      const conversations =
        await this.privateChatService.getUserConversations(userId);
      client.emit(PrivateChatEvents.CONVERSATION_LIST, conversations);
    } catch (error) {
      this.logger.error('Error loading conversations:', error);
      client.emit(PrivateChatEvents.ERROR, {
        message: 'Failed to load conversations',
      });
    }
  }

  /** Load a single conversation: Test_OK */
  @SubscribeMessage(PrivateChatEvents.LOAD_SINGLE_CONVERSATION)
  async handleLoadSingleConversation(
    @MessageBody() payload: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'User not authenticated',
      });
      this.logger.warn(
        'User not authenticated in handleLoadSingleConversation',
      );
      return;
    }

    this.logger.log(
      `LOAD_SINGLE_CONVERSATION - Raw payload type: ${typeof payload}, value: ${JSON.stringify(payload)}`,
    );

    // Parse payload if it's a string
    let parsedPayload = payload;
    if (typeof payload === 'string') {
      // Handle empty or whitespace-only strings
      if (!payload.trim()) {
        client.emit(PrivateChatEvents.ERROR, {
          message: 'conversationId is required',
        });
        this.logger.warn('Empty payload received');
        return;
      }

      try {
        parsedPayload = JSON.parse(payload);
      } catch (error) {
        // If JSON parsing fails, treat it as a plain conversationId string
        parsedPayload = payload.trim();
        this.logger.log(
          `Using payload as plain conversationId string: ${parsedPayload}, error: ${error.message}`,
        );
      }
    }

    // Extract conversationId from payload (object) or use payload directly (string)
    const conversationId =
      typeof parsedPayload === 'object'
        ? parsedPayload?.conversationId
        : parsedPayload;

    if (!conversationId) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'conversationId is required',
      });
      this.logger.warn('Missing conversationId in payload');
      return;
    }

    try {
      const result =
        await this.privateChatService.getPrivateConversationWithMessages(
          conversationId,
          userId,
        );

      // Handle both wrapped and unwrapped responses
      const conversation = result?.data || result;
      client.emit(PrivateChatEvents.NEW_CONVERSATION, conversation);
    } catch (error) {
      this.logger.error(`Error loading conversation ${conversationId}:`, error);
      client.emit(PrivateChatEvents.ERROR, {
        message: 'Failed to load conversation',
      });
    }
  }

  /** Send a message (create conversation if new): Test_OK */
  @SubscribeMessage(PrivateChatEvents.SEND_MESSAGE)
  async handleMessage(
    @MessageBody() payload: any, // Temporarily changed from SendPrivateMessageWebSocketDto
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    // Parse payload if it's a string
    let parsedPayload = payload;
    if (typeof payload === 'string') {
      try {
        parsedPayload = JSON.parse(payload);
        this.logger.log(`Parsed string payload to object`);
      } catch (error) {
        client.emit(PrivateChatEvents.ERROR, {
          message: 'Invalid JSON payload',
        });
        this.logger.error(`Failed to parse payload: ${error.message}`);
        return;
      }
    }

    this.logger.log(`Processed payload:`, JSON.stringify(parsedPayload));

    const recipientId = parsedPayload?.recipientId;
    const content = parsedPayload?.content;

    this.logger.log(
      `Extracted - userId: ${userId}, recipientId: ${recipientId}, content: ${content}`,
    );

    // Validate required fields
    if (!recipientId) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'recipientId is required',
      });
      this.logger.warn(`Missing recipientId in payload`);
      return;
    }

    if (!content) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'content is required',
      });
      this.logger.warn(`Missing content in payload`);
      return;
    }

    // Prevent sending message to yourself
    if (userId === recipientId) {
      client.emit(PrivateChatEvents.ERROR, {
        message: 'Cannot send message to yourself',
      });
      this.logger.warn(
        `User ${userId} attempted to send message to themselves`,
      );
      return;
    }

    try {
      let conversation = await this.privateChatService.findConversation(
        userId,
        recipientId,
      );

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
        parsedPayload,
      );

      const conversationsUser =
        await this.privateChatService.getUserConversations(userId);

      const conversationsRecipient =
        await this.privateChatService.getUserConversations(recipientId);

      // Emit new message to both users (THIS IS THE OUTPUT)
      this.server.to(userId).emit(PrivateChatEvents.NEW_MESSAGE, message);
      this.server.to(recipientId).emit(PrivateChatEvents.NEW_MESSAGE, message);
      this.server
        .to(userId)
        .emit(PrivateChatEvents.CONVERSATION_LIST, conversationsUser);
      this.server
        .to(recipientId)
        .emit(PrivateChatEvents.CONVERSATION_LIST, conversationsRecipient);
    } catch (error) {
      this.logger.error(`Error sending message from ${userId}:`, error);
      this.logger.error(`Error stack:`, error.stack);
      this.logger.error(`Payload:`, payload);
      client.emit(PrivateChatEvents.ERROR, {
        message: error.message || 'Failed to send message',
      });
    }
  }

  /** Helper for external services to emit new messages */
  emitNewMessage(userId: string, message: any) {
    this.server.to(userId).emit(PrivateChatEvents.NEW_MESSAGE, message);
  }

  /** Track when a user starts typing */
  @SubscribeMessage(PrivateChatEvents.TYPING_START)
  async handleTypingStart(
    @MessageBody() data: { conversationId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    this.server.to(data.recipientId).emit(PrivateChatEvents.TYPING_START, {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage(PrivateChatEvents.TYPING_STOP)
  async handleTypingStop(
    @MessageBody() data: { conversationId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    this.server.to(data.recipientId).emit(PrivateChatEvents.TYPING_STOP, {
      conversationId: data.conversationId,
      userId,
    });
  }

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
}
