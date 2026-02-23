import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { AuthenticatedRequest } from '@/common/guards/jwt-auth.guard';
import { UserRole } from '@prisma';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Admin Settings')
@Controller('admin/settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('get')
  @ApiOperation({ summary: 'Get settings updated by current admin' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.settingsService.getSettingsByUpdater(req.user.sub);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update system settings' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 404, description: 'Settings not found' })
  updateSettings(
    @Body() dto: UpdateSettingsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.settingsService.updateSettings(dto, req.user.sub);
  }
}
