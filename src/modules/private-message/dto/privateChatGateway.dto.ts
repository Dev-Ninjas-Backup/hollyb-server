// src/private-chat/dto/send-private-message.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SendPrivateMessageDto {
  @ApiProperty({
    description: 'Message text content',
    example: 'Hey! How are you?',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content cannot be empty' })
  content: string;

  @ApiPropertyOptional({
    description: 'ID of uploaded file',
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
  })
  @IsOptional()
  @IsUUID('4', { message: 'fileId must be a valid UUID' })
  fileId?: string;

  @ApiPropertyOptional({
    description: 'Type of message',
    example: 'TEXT',
    enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'CALL_EVENT'],
  })
  @IsOptional()
  @IsString()
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'CALL_EVENT';
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
