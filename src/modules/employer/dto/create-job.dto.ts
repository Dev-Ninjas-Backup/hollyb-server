import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsDecimal,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobPaymentType, JobStatus, JobType } from '@prisma';

export class CreateJobDto {
  // employer_id will be extracted from authenticated user, not from DTO

  @ApiProperty({
    description: 'Job title',
    example: 'Warehouse Assistant',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Amazon Logistics',
  })
  @IsString()
  company_name: string;

  @ApiPropertyOptional({
    description: 'Job description',
    example: 'Assist with packaging and sorting shipments.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Job responsibilities',
    example: 'Load/unload goods, manage inventory.',
  })
  @IsOptional()
  @IsString()
  job_responsibilities?: string;

  @ApiPropertyOptional({
    description: 'Job requirements',
    example: 'Must be able to lift 20kg.',
  })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional({
    description: 'File attachment for the job',
    type: 'string',
    format: 'binary',
  })
  file?: any;

  @ApiProperty({
    description: 'Type of job',
    enum: JobType,
    example: 'FULL_TIME',
  })
  @IsEnum(JobType)
  job_type: JobType;

  @ApiPropertyOptional({
    description: 'Mark job as urgent',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @ApiPropertyOptional({
    description: 'Job status',
    enum: JobStatus,
    example: 'OPEN',
    default: 'OPEN',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Job start date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Job end date (YYYY-MM-DD)',
    example: '2026-03-31',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Shift start time (ISO string)',
    example: '1970-01-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiPropertyOptional({
    description: 'Shift end time (ISO string)',
    example: '1970-01-01T17:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  end_time?: string;

  @ApiPropertyOptional({
    description: 'Payment amount (Decimal as string)',
    example: '1500.00',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  amount?: string;

  @ApiProperty({
    description: 'Payment type',
    enum: JobPaymentType,
    example: 'HOURLY',
  })
  @IsEnum(JobPaymentType)
  payment_type: JobPaymentType;

  @ApiPropertyOptional({
    description: 'Job location address',
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 40.7128,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -74.006,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
