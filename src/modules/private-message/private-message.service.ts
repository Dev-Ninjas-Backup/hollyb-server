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
    const message = await this.prisma.client.privateMessage.create({
      data: {
        content: dto.content,
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

    await this.prisma.client.privateMessageStatus.createMany({
      data: [
        {
          messageId: message.id,
          userId: conversation.initiatorId,
          status: 'DELIVERED',
        },
        {
          messageId: message.id,
          userId: conversation.receiverId,
          status: 'DELIVERED',
        },
      ],
      skipDuplicates: true,
    });

    return ResponseHelper.created(message, 'Message sent successfully');
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
      const otherUser = chat.initiatorId === userId ? chat.receiver : chat.initiator;
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
        AND: [
          { initiatorId },
          { receiverId },
        ],
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
    const conversation =
      await this.prisma.client.privateConversation.findFirst({
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
      });

    return ResponseHelper.success(
      conversation,
      'New conversation fetched successfully',
    );
  }

  /**
   * Get all conversations for a user
   */
  @HandleError("Error getting user's conversations", 'PRIVATE_CHAT')
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.client.privateConversation.findMany(
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

    const formattedConversations = conversations.map((chat: any) => {
      const otherUser = chat.initiatorId === userId ? chat.receiver : chat.initiator;
      return {
        type: 'private',
        chatId: chat.id,
        participant: otherUser,
        lastMessage: chat.lastMessage || null,
        updatedAt: chat.updatedAt,
      };
    });

    return ResponseHelper.success(
      formattedConversations,
      'Conversations fetched successfully',
    );
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
   * Get a conversation with messages (validate access)
   */
  @HandleError("Conversation doesn't exist", 'PRIVATE_CHAT')
  async getPrivateConversationWithMessages(
    conversationId: string,
    userId: string,
  ) {
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
          messages: {
            orderBy: { createdAt: 'asc' },
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
          },
        },
      },
    );

    if (!conversation) {
      throw new AppError(404, `Conversation not found or access denied`);
    }

    return ResponseHelper.success(
      {
        conversationId: conversation.id,
        participants: [conversation.initiator, conversation.receiver],
        messages: conversation.messages,
      },
      'Conversation loaded successfully',
    );
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
