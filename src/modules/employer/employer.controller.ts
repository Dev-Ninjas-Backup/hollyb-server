import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '@/common/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmployerService } from './employer.service';
import { CreateJobDto } from './dto/create-job.dto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Employer')
@Controller('employer')
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  @Post('job/create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new job posting' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateJobDto })
  async createJob(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateJobDto,
    @UploadedFiles()
    uploadedFiles?: {
      file?: Express.Multer.File[];
    },
  ) {
    // Verify user is an employer
    if (req.user.role !== 'employer') {
      throw new BusinessException(
        'Only employers can create jobs',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.employerService.createJob(req.user.sub, dto, uploadedFiles?.file?.[0]);
  }
}
