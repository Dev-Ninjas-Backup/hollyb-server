import { Controller, Get, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('user/:id')
  async getNotifications(@Param('id') userId: string) {
    return this.notificationService.getNotifications(userId);
  }
}
