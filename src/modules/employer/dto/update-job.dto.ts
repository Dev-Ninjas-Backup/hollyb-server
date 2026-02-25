import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDecimal,
  Allow,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobCategory } from '@prisma';

export class UpdateJobDto {
  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Warehouse Assistant',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Company name',
    example: 'Amazon Logistics',
  })
  @IsOptional()
  @IsString()
  company_name?: string;

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

  @IsOptional()
  @Allow()
  file?: any;

  @ApiPropertyOptional({
    description: 'Mark job as urgent',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @ApiPropertyOptional({
    description: 'Job category',
    enum: JobCategory,
    enumName: 'JobCategory',
    example: 'chef',
  })
  @IsOptional()
  @IsEnum(JobCategory)
  job_category?: JobCategory;

  @ApiPropertyOptional({
    description: 'Shift start time (HH:mm or hh:mm AM/PM)',
    example: '03:30 PM',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(([01]\d|2[0-3]):([0-5]\d)|((0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM|am|pm)))$/)
  start_time?: string;

  @ApiPropertyOptional({
    description: 'Shift end time (HH:mm or hh:mm AM/PM)',
    example: '05:30 PM',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(([01]\d|2[0-3]):([0-5]\d)|((0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM|am|pm)))$/)
  end_time?: string;

  @ApiPropertyOptional({
    description: 'Payment amount (Decimal as string)',
    example: '1500.00',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  amount?: string;

  @ApiPropertyOptional({
    description: 'Job location address',
    example: 'New York, NY',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
