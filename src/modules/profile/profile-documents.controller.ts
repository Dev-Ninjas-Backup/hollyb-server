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
  ApiOperation,
  ApiResponse,
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
  @ApiOperation({
    summary: 'Get all user documents',
    description:
      'Retrieve all uploaded documents for the authenticated user including profile photo, NID, passport, trade license, and utility bill.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyDocuments(@Req() req: AuthenticatedRequest) {
    return this.profileDocumentsService.getMyDocuments(req.user.sub);
  }

  @Post('profile-photo')
  @ApiOperation({
    summary: 'Upload profile photo',
    description:
      'Upload or update user profile photo. Maximum file size: 5MB. Supported formats: JPG, PNG.',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile photo uploaded successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or file too large.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
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
  @ApiOperation({
    summary: 'Upload trade license',
    description:
      'Upload trade license document (front and back sides). Required for employer accounts. Maximum file size per file: 5MB.',
  })
  @ApiResponse({
    status: 201,
    description: 'Trade license uploaded successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, missing files, or file too large.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
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
  @ApiOperation({
    summary: 'Upload National ID (NID)',
    description:
      'Upload National ID card (front and back sides). Required for identity verification. Maximum file size per file: 5MB.',
  })
  @ApiResponse({ status: 201, description: 'NID uploaded successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, missing files, or file too large.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
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
  @ApiOperation({
    summary: 'Upload passport',
    description:
      'Upload passport document (front and back sides). Alternative to NID for identity verification. Maximum file size per file: 5MB.',
  })
  @ApiResponse({ status: 201, description: 'Passport uploaded successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format, missing files, or file too large.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
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
  @ApiOperation({
    summary: 'Upload utility bill',
    description:
      'Upload utility bill for address verification. Include bill file and address information. Maximum file size: 5MB.',
  })
  @ApiResponse({
    status: 201,
    description: 'Utility bill uploaded successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or file too large.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing token.',
  })
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
