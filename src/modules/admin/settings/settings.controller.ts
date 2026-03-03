import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { AuthenticatedRequest } from '@/common/guards/jwt-auth.guard';
import { UserRole } from '@prisma';
import { SettingsService } from './settings.service';
import {
  UpdateGeneralSettingsDto,
  UpdateNotificationSettingsDto,
} from './dto/update-settings.dto';

@ApiTags('Admin Settings')
@Controller('admin/settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('general-settings')
  @ApiOperation({ summary: 'Get general settings updated by current admin' })
  @ApiResponse({
    status: 200,
    description: 'General settings retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'General settings not found' })
  getGeneralSettings(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getGeneralSettings(req.user.sub);
  }

  @Get('get-account')
  @ApiOperation({ summary: 'Get account settings updated by current admin' })
  @ApiResponse({
    status: 200,
    description: 'Account settings retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Account settings not found' })
  getAccountSettings(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getAccountSettings(req.user.sub);
  }

  @Get('get-notification')
  @ApiOperation({
    summary: 'Get notification settings updated by current admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification settings retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification settings not found' })
  getNotificationSettings(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getNotificationSettings(req.user.sub);
  }

  @Patch('update-general-settings')
  @ApiOperation({ summary: 'Update general settings' })
  @ApiBody({ type: UpdateGeneralSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'General settings updated successfully',
  })
  @ApiResponse({ status: 404, description: 'General settings not found' })
  updateGeneralSettings(
    @Body() dto: UpdateGeneralSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settingsService.updateGeneralSettings(dto, req.user.sub);
  }

  @Patch('update-notification-settings')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiBody({ type: UpdateNotificationSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'Notification settings updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification settings not found' })
  updateNotificationSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settingsService.updateNotificationSettings(dto, req.user.sub);
  }
}
