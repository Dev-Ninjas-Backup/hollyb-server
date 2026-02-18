import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PrivateChatService } from './private-message.service';

@Controller('private-message')
export class PrivateMessageController {
  constructor(private readonly privateChatService: PrivateChatService) {}


}
