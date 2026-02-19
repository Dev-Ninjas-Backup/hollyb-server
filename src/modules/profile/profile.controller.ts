import {
  Body,
  Controller,
  Get,
  Patch,
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
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '@/common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('Profile')
@ApiExtraModels(UpdateProfileDto)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('get-me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: AuthenticatedRequest) {
    return this.profileService.getMe(req.user.sub);
  }

  @Patch('update-me')
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
      limits: { fileSize: 5 * 1024 * 1024 },
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getNotify(@Req() req: AuthenticatedRequest) {
    return this.profileService.getNotify(req.user.sub);
  }

  @Patch('notify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  toggleNotify(@Req() req: AuthenticatedRequest) {
    return this.profileService.toggleNotify(req.user.sub);
  }
}
