import { ResponseHelper } from '@/common/utils/response.helper';
import { AppError } from 'src/common/exceptions/handle-error.app';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';
import { HandleError } from '@/common/exceptions/handle-error.decorator';

@Injectable()
export class PrivateChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a private message and update lastMessage in conversation
   */
  @HandleError('Failed to send private message', 'PRIVATE_CHAT')
  async sendPrivateMessage(
    conversationId: string,
    senderId: string,
    dto: SendPrivateMessageDto,
  ) {
    // Create the message
    const message = await this.prisma.client.privateMessage.create({
      data: {
        content: dto.content || null,
        conversationId,
        senderId,
        ...(dto.fileId && { fileId: dto.fileId }),
        ...(dto.type && { type: dto.type }),
      },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        file: true,
      },
    });

    // Update last message reference in conversation
    await this.prisma.client.privateConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        updatedAt: new Date(),
      },
    });

    // Fetch conversation to set delivery status
    const conversation =
      await this.prisma.client.privateConversation.findUnique({
        where: { id: conversationId },
      });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // Get the recipient ID (the other user in the conversation)
    const recipientId =
      conversation.initiatorId === senderId
        ? conversation.receiverId
        : conversation.initiatorId;

    // Create message statuses - sender's status is READ, recipient's is SENT
    await this.prisma.client.privateMessageStatus.createMany({
      data: [
        {
          messageId: message.id,
          userId: senderId,
          status: 'READ',
        },
        {
          messageId: message.id,
          userId: recipientId,
          status: 'SENT',
        },
      ],
      skipDuplicates: true,
    });

    // Return message with recipient info for emit targeting
    return {
      ...message,
      conversationId,
      recipientId,
    };
  }

  /**
   *-------------------- Load all chats ----------------------
   */
  @HandleError('Failed to get all chats with last message')
  async getAllChatsWithLastMessage(userId: string) {
    // ---------- Private chats -----------------
    const privateChats = await this.prisma.client.privateConversation.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
      },
      select: {
        id: true,
        initiatorId: true,
        receiverId: true,
        updatedAt: true,
        lastMessage: {
          include: {
            sender: {
              select: {
                id: true,
                full_name: true,
                email: true,
              },
            },
            file: true,
          },
        },
        initiator: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedPrivateChats = privateChats.map((chat: any) => {
      const otherUser =
        chat.initiatorId === userId ? chat.receiver : chat.initiator;
      return {
        type: 'private',
        chatId: chat.id,
        participant: otherUser,
        lastMessage: chat.lastMessage
          ? {
              id: chat.lastMessage.id,
              content: chat.lastMessage.content,
              createdAt: chat.lastMessage.createdAt,
              sender: chat.lastMessage.sender,
              file: chat.lastMessage.file,
            }
          : null,
        updatedAt: chat.updatedAt,
      };
    });

    // ------------ Merge & sort-------------------
    const allChats = [...formattedPrivateChats].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

    return ResponseHelper.success(allChats, 'Chats fetched successfully');
  }

  /**
   * Find existing conversation between two users or create one
   */
  @HandleError('Failed to find conversation', 'PRIVATE_CHAT')
  async findConversation(userA: string, userB: string) {
    if (!userA || !userB) {
      throw new Error(
        `Invalid user IDs for findConversation: userA=${userA}, userB=${userB}`,
      );
    }
    const [initiatorId, receiverId] = [userA, userB].sort();
    return this.prisma.client.privateConversation.findFirst({
      where: {
        AND: [{ initiatorId }, { receiverId }],
      },
    });
  }

  /**
   * Create new conversation between two users
   */
  @HandleError('Failed to create conversation', 'PRIVATE_CHAT')
  async createConversation(userA: string, userB: string) {
    const [initiatorId, receiverId] = [userA, userB].sort();
    return this.prisma.client.privateConversation.create({
      data: { initiatorId, receiverId },
    });
  }

  /**
   * Validate user exists in database
   */
  @HandleError('Failed to validate user', 'PRIVATE_CHAT')
  async validateUserExists(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Find existing conversation between two users or create one
   */
  @HandleError('Failed to find or create conversation', 'PRIVATE_CHAT')
  async findOrCreateConversation(userA: string, userB: string) {
    // Validate both users exist
    const [userAExists, userBExists] = await Promise.all([
      this.validateUserExists(userA),
      this.validateUserExists(userB),
    ]);

    if (!userAExists) {
      throw new NotFoundException(`User ${userA} not found`);
    }
    if (!userBExists) {
      throw new NotFoundException(`Recipient user not found`);
    }

    let conversation = await this.findConversation(userA, userB);
    if (!conversation) {
      conversation = await this.createConversation(userA, userB);
      return ResponseHelper.created(
        conversation,
        'Conversation created successfully',
      );
    }
    return ResponseHelper.success(
      conversation,
      'Conversation found successfully',
    );
  }

  @HandleError("Error getting user's conversations", 'PRIVATE_CHAT')
  async getUserNewConversations(userId: string) {
    const conversation = await this.prisma.client.privateConversation.findFirst(
      {
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
        include: {
          lastMessage: {
            include: {
              sender: {
                select: {
                  id: true,
                  full_name: true,
                  email: true,
                },
              },
              file: true,
            },
          },
          initiator: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    );

    return ResponseHelper.success(
      conversation,
      'New conversation fetched successfully',
    );
  }

  /**
   * Get all conversations for a user with unread counts
   */
  @HandleError("Error getting user's conversations", 'PRIVATE_CHAT')
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.client.privateConversation.findMany(
      {
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
          status: 'ACTIVE',
        },
        include: {
          lastMessage: {
            include: {
              sender: {
                select: {
                  id: true,
                  full_name: true,
                  role: true,
                  email: true,
                  updated_at: true,
                },
              },
              file: true,
              statuses: {
                where: { userId },
                select: { status: true },
              },
            },
          },
          initiator: {
            select: {
              id: true,
              full_name: true,
              email: true,
              updated_at: true,
            },
          },
          receiver: {
            select: {
              id: true,
              full_name: true,
              email: true,
              updated_at: true,
            },
          },
          messages: {
            where: {
              senderId: { not: userId },
              statuses: {
                some: {
                  userId,
                  status: { in: ['SENT', 'DELIVERED'] },
                },
              },
            },
            select: { id: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    );

    const formattedConversations = conversations.map((chat: any) => {
      const otherUser =
        chat.initiatorId === userId ? chat.receiver : chat.initiator;
      return {
        type: 'private',
        conversationId: chat.id,
        participant: otherUser,
        lastMessage: chat.lastMessage
          ? {
              id: chat.lastMessage.id,
              content: chat.lastMessage.content,
              type: chat.lastMessage.type,
              updatedAt: chat.lastMessage.updatedAt,
              createdAt: chat.lastMessage.createdAt,
              sender: chat.lastMessage.sender,
              file: chat.lastMessage.file,
              status: chat.lastMessage.statuses?.[0]?.status || 'SENT',
            }
          : null,
        unreadCount: chat.messages.length,
        status: chat.status,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
      };
    });

    return formattedConversations;
  }

  /**
   * Get all messages for a conversation
   */
  @HandleError("Conversation doesn't exist", 'PRIVATE_CHAT')
  async getConversationMessages(conversationId: string, userId: string) {
    const messages = await this.prisma.client.privateMessage.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        file: true,
        statuses: {
          where: { userId },
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return ResponseHelper.success(
      messages,
      'Conversation messages fetched successfully',
    );
  }

  /**
   * Get a conversation with messages (validate access & support pagination)
   */
  @HandleError("Conversation doesn't exist", 'PRIVATE_CHAT')
  async getPrivateConversationWithMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    cursor?: string,
  ) {
    // Build the messages query with pagination
    const messagesQuery: any = {
      orderBy: { createdAt: 'desc' as const },
      take: limit + 1, // Fetch one extra to determine if there are more
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        file: true,
        statuses: {
          select: {
            userId: true,
            status: true,
          },
        },
      },
    };

    // If cursor provided, fetch messages before that message
    if (cursor) {
      messagesQuery.cursor = { id: cursor };
      messagesQuery.skip = 1; // Skip the cursor message itself
    }

    const conversation = await this.prisma.client.privateConversation.findFirst(
      {
        where: {
          id: conversationId,
          OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
        include: {
          initiator: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
          receiver: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
          messages: messagesQuery,
        },
      },
    );

    if (!conversation) {
      throw new AppError(404, `Conversation not found or access denied`);
    }

    // Check if there are more messages
    const hasMore = conversation.messages.length > limit;
    const messages = hasMore
      ? conversation.messages.slice(0, limit)
      : conversation.messages;

    // Reverse to get chronological order (since we fetched in desc order for cursor pagination)
    messages.reverse();

    // Determine the other participant
    const otherUser =
      conversation.initiatorId === userId
        ? conversation.receiver
        : conversation.initiator;

    return {
      conversationId: conversation.id,
      participant: otherUser,
      participants: [conversation.initiator, conversation.receiver],
      messages: messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        createdAt: msg.createdAt,
        sender: msg.sender,
        file: msg.file,
        isMine: msg.senderId === userId,
        statuses: msg.statuses,
      })),
      pagination: {
        hasMore,
        nextCursor: hasMore ? messages[0]?.id : null,
      },
    };
  }

  /**
   * Mark a message as read
   */
  @HandleError('Failed to mark message as read', 'PRIVATE_CHAT')
  async makePrivateMassageReadTrue(messageId: string, userId: string) {
    const result = await this.prisma.client.privateMessageStatus.updateMany({
      where: {
        messageId,
        userId,
      },
      data: { status: 'READ' },
    });

    return ResponseHelper.success(result, 'Message marked as read');
  }

  /**
   * Mark a message as delivered (when user connects)
   */
  @HandleError('Failed to mark message as delivered', 'PRIVATE_CHAT')
  async markMessageDelivered(messageId: string, userId: string) {
    const result = await this.prisma.client.privateMessageStatus.updateMany({
      where: {
        messageId,
        userId,
        status: 'SENT',
      },
      data: { status: 'DELIVERED' },
    });

    return ResponseHelper.success(result, 'Message marked as delivered');
  }

  /**
   * Mark all messages in a conversation as read for a user
   */
  @HandleError('Failed to mark conversation as read', 'PRIVATE_CHAT')
  async markConversationAsRead(conversationId: string, userId: string) {
    // First verify user is part of the conversation
    const conversation = await this.prisma.client.privateConversation.findFirst(
      {
        where: {
          id: conversationId,
          OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
      },
    );

    if (!conversation) {
      throw new AppError(404, 'Conversation not found or access denied');
    }

    // Get all unread messages for this user in this conversation
    const unreadMessages = await this.prisma.client.privateMessage.findMany({
      where: {
        conversationId,
        statuses: {
          some: {
            userId,
            status: { in: ['SENT', 'DELIVERED'] },
          },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await this.prisma.client.privateMessageStatus.updateMany({
        where: {
          messageId: { in: unreadMessages.map((m) => m.id) },
          userId,
        },
        data: { status: 'READ' },
      });
    }

    // Get the other user's ID to notify them
    const otherUserId =
      conversation.initiatorId === userId
        ? conversation.receiverId
        : conversation.initiatorId;

    return {
      conversationId,
      messagesRead: unreadMessages.length,
      otherUserId,
    };
  }

  /**
   * Mark all undelivered messages as delivered when user connects
   */
  @HandleError('Failed to mark messages as delivered', 'PRIVATE_CHAT')
  async markAllMessagesDelivered(userId: string) {
    const result = await this.prisma.client.privateMessageStatus.updateMany({
      where: {
        userId,
        status: 'SENT',
      },
      data: { status: 'DELIVERED' },
    });

    return result.count;
  }

  /**
   * Get unread message count for a user
   */
  @HandleError('Failed to get unread count', 'PRIVATE_CHAT')
  async getUnreadMessageCount(userId: string) {
    const count = await this.prisma.client.privateMessageStatus.count({
      where: {
        userId,
        status: { in: ['SENT', 'DELIVERED'] },
        message: {
          senderId: { not: userId },
        },
      },
    });

    return count;
  }

  /**
   * Get unread count per conversation
   */
  @HandleError('Failed to get unread counts', 'PRIVATE_CHAT')
  async getUnreadCountPerConversation(userId: string) {
    const conversations = await this.prisma.client.privateConversation.findMany(
      {
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
        select: {
          id: true,
          messages: {
            where: {
              senderId: { not: userId },
              statuses: {
                some: {
                  userId,
                  status: { in: ['SENT', 'DELIVERED'] },
                },
              },
            },
            select: { id: true },
          },
        },
      },
    );

    return conversations.reduce(
      (acc, conv) => {
        acc[conv.id] = conv.messages.length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Delete a conversation
   */
  @HandleError('Failed to delete conversation', 'PRIVATE_CHAT')
  async deleteConversation(conversationId: string) {
    await this.prisma.client.privateConversation.deleteMany({
      where: { id: conversationId },
    });

    return ResponseHelper.noContent('Conversation deleted successfully');
  }
}
