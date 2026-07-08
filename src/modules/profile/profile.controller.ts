import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('Profile')
@ApiExtraModels(UpdateProfileDto)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('get-me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve the complete profile information of the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    return this.profileService.getMe(req.user.sub);
  }

  @Patch('update-me')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update authenticated user profile information including optional profile photo upload.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or file too large.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateProfileDto) },
        {
          type: 'object',
          properties: {
            profilePhoto: { type: 'string', format: 'binary' },
          },
        },
      ],
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profilePhoto', {
      storage: memoryStorage(),
    }),
  )
  updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileService.updateMe(req.user.sub, dto, file);
  }

  @Get('notify')
  @ApiOperation({
    summary: 'Get notification status',
    description:
      'Check if push notifications are enabled for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification status retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getNotify(@Req() req: AuthenticatedRequest) {
    return this.profileService.getNotify(req.user.sub);
  }

  @Patch('notify')
  @ApiOperation({
    summary: 'Toggle notification setting',
    description:
      'Enable or disable push notifications for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification setting updated successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  toggleNotify(@Req() req: AuthenticatedRequest) {
    return this.profileService.toggleNotify(req.user.sub);
  }

  @Get('my-reviews')
  @ApiOperation({
    summary: 'Get my reviews',
    description:
      'Get authenticated employee review summary and review list for profile reviews screen.',
  })
  @ApiResponse({ status: 200, description: 'Reviews fetched successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyReviews(@Req() req: AuthenticatedRequest) {
    return this.profileService.getMyReviews(req.user.sub);
  }

  @Post('change-password')
  @ApiOperation({
    summary: 'Change password',
    description:
      'Change password for authenticated user. Requires old password verification.',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid old password.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.profileService.changePassword(req.user.sub, dto);
  }

  @Delete('delete')
  @ApiOperation({
    summary: 'Soft delete current user',
    description:
      'Soft delete authenticated user account, revoke all active tokens, and block further login.',
  })
  @ApiResponse({ status: 200, description: 'Account deleted successfully.' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteMe(@Req() req: AuthenticatedRequest) {
    return this.profileService.deleteMe(req.user.sub);
  }
}
