import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrivateChatService } from './private-message.service';
import { JwtAuthGuard, AuthenticatedRequest } from '@/common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SendPrivateMessageDto } from './dto/privateChatGateway.dto';

@ApiTags('Private Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('private-message')
export class PrivateMessageController {
  constructor(private readonly privateChatService: PrivateChatService) {}

  /**
   * Get all conversations for the authenticated user
   */
  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the user' })
  async getConversations(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const conversations =
      await this.privateChatService.getUserConversations(userId);
    return { data: conversations, message: 'Conversations fetched successfully' };
  }

  /**
   * Get a specific conversation with messages
   */
  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages to fetch (default: 50)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Message ID to paginate from',
  })
  async getConversation(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const userId = req.user.sub;
    const conversation =
      await this.privateChatService.getPrivateConversationWithMessages(
        conversationId,
        userId,
        limit ? parseInt(limit, 10) : 50,
        cursor,
      );
    return { data: conversation, message: 'Conversation loaded successfully' };
  }

  /**
   * Create or get existing conversation with a user
   */
  @Post('conversations/:recipientId')
  @ApiOperation({ summary: 'Create or get conversation with user' })
  @ApiParam({ name: 'recipientId', description: 'Recipient user UUID' })
  async findOrCreateConversation(
    @Req() req: AuthenticatedRequest,
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
  ) {
    const userId = req.user.sub;
    return this.privateChatService.findOrCreateConversation(userId, recipientId);
  }

  /**
   * Send a message in a conversation
   */
  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendPrivateMessageDto,
  ) {
    const userId = req.user.sub;
    const message = await this.privateChatService.sendPrivateMessage(
      conversationId,
      userId,
      dto,
    );
    return { data: message, message: 'Message sent successfully' };
  }

  /**
   * Mark all messages in a conversation as read
   */
  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  async markConversationAsRead(
    @Req() req: AuthenticatedRequest,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    const userId = req.user.sub;
    const result = await this.privateChatService.markConversationAsRead(
      conversationId,
      userId,
    );
    return {
      data: result,
      message: `${result.messagesRead} messages marked as read`,
    };
  }

  /**
   * Get unread message count
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const total = await this.privateChatService.getUnreadMessageCount(userId);
    const perConversation =
      await this.privateChatService.getUnreadCountPerConversation(userId);
    return {
      data: { total, perConversation },
      message: 'Unread count fetched successfully',
    };
  }

  /**
   * Delete a conversation
   */
  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID' })
  async deleteConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ) {
    return this.privateChatService.deleteConversation(conversationId);
  }
}
