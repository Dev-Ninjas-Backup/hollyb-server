// src/private-chat/dto/send-private-message.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  CALL_EVENT = 'CALL_EVENT',
}

export class SendPrivateMessageDto {
  @ApiPropertyOptional({
    description: 'Message text content (required for TEXT type)',
    example: 'Hey! How are you?',
  })
  @ValidateIf((o) => o.type === MessageType.TEXT || !o.type)
  @IsString()
  @IsNotEmpty({ message: 'Content cannot be empty for text messages' })
  content?: string;

  @ApiPropertyOptional({
    description: 'ID of uploaded file (required for non-text types)',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @ValidateIf((o) => o.type && o.type !== MessageType.TEXT)
  @IsUUID('4', { message: 'fileId must be a valid UUID' })
  fileId?: string;

  @ApiPropertyOptional({
    description: 'Type of message',
    example: 'TEXT',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'type must be a valid MessageType' })
  type?: MessageType;
}

export class SendPrivateMessageWebSocketDto extends SendPrivateMessageDto {
  @ApiProperty({
    description: 'ID of the recipient user',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'recipientId must be a valid UUID' })
  @IsNotEmpty({ message: 'recipientId cannot be empty' })
  recipientId: string;
}

export class MarkMessageReadDto {
  @ApiProperty({
    description: 'ID of the message to mark as read',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'messageId must be a valid UUID' })
  @IsNotEmpty({ message: 'messageId cannot be empty' })
  messageId: string;

  @ApiProperty({
    description: 'ID of the conversation',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsNotEmpty({ message: 'conversationId cannot be empty' })
  conversationId: string;
}

export class MarkConversationReadDto {
  @ApiProperty({
    description: 'ID of the conversation to mark all messages as read',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsNotEmpty({ message: 'conversationId cannot be empty' })
  conversationId: string;
}

export class LoadConversationDto {
  @ApiProperty({
    description: 'ID of the conversation to load',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsNotEmpty({ message: 'conversationId cannot be empty' })
  conversationId: string;

  @ApiPropertyOptional({
    description: 'Number of messages to load (default: 50)',
    example: 50,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Cursor for pagination (messageId to load messages before)',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsOptional()
  @IsUUID('4', { message: 'cursor must be a valid UUID' })
  cursor?: string;
}

export class TypingIndicatorDto {
  @ApiProperty({
    description: 'ID of the conversation',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  @IsNotEmpty({ message: 'conversationId cannot be empty' })
  conversationId: string;

  @ApiProperty({
    description: 'ID of the recipient user',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsUUID('4', { message: 'recipientId must be a valid UUID' })
  @IsNotEmpty({ message: 'recipientId cannot be empty' })
  recipientId: string;
}
