import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
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
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProfileDocumentsService } from './profile-documents.service';
import { UtilityBillDto } from './dto/utility-bill.dto';

@ApiTags('Profile Documents')
@ApiExtraModels(UtilityBillDto)
@Controller('profile/documents')
export class ProfileDocumentsController {
  constructor(
    private readonly profileDocumentsService: ProfileDocumentsService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyDocuments(@Req() req: AuthenticatedRequest) {
    return this.profileDocumentsService.getMyDocuments(req.user.sub);
  }

  @Post('profile-photo')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadProfilePhoto(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileDocumentsService.uploadProfilePhoto(
      req.user.sub,
      file as Express.Multer.File,
    );
  }

  @Post('trade-license')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        front: { type: 'string', format: 'binary' },
        back: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  uploadTradeLicense(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles()
    files?: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ) {
    return this.profileDocumentsService.uploadTradeLicense(
      req.user.sub,
      files?.front?.[0] as Express.Multer.File,
      files?.back?.[0] as Express.Multer.File,
    );
  }

  @Post('nid')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        front: { type: 'string', format: 'binary' },
        back: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  uploadNid(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles()
    files?: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ) {
    return this.profileDocumentsService.uploadNid(
      req.user.sub,
      files?.front?.[0] as Express.Multer.File,
      files?.back?.[0] as Express.Multer.File,
    );
  }

  @Post('passport')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        front: { type: 'string', format: 'binary' },
        back: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  uploadPassport(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles()
    files?: {
      front?: Express.Multer.File[];
      back?: Express.Multer.File[];
    },
  ) {
    return this.profileDocumentsService.uploadPassport(
      req.user.sub,
      files?.front?.[0] as Express.Multer.File,
      files?.back?.[0] as Express.Multer.File,
    );
  }

  @Post('utility-bill')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(UtilityBillDto) },
        {
          type: 'object',
          properties: {
            file: { type: 'string', format: 'binary' },
          },
        },
      ],
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadUtilityBill(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UtilityBillDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileDocumentsService.uploadUtilityBill(
      req.user.sub,
      file as Express.Multer.File,
      dto.address,
    );
  }
}
