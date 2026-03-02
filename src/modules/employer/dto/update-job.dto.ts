import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDecimal,
  Allow,
  IsEnum,
  Matches,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
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
    example: ['Load/unload goods', 'Manage inventory', 'Sort shipments'],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;

    // If it's an array, check if items contain commas and split them
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        typeof item === 'string' && item.includes(',')
          ? item.split(',').map((s) => s.trim())
          : item,
      );
    }

    // If it's a string, try to parse as JSON first
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) =>
            typeof item === 'string' && item.includes(',')
              ? item.split(',').map((s) => s.trim())
              : item,
          );
        }
      } catch {
        // If JSON parse fails, check if it's comma-separated
        if (value.includes(',')) {
          return value.split(',').map((s) => s.trim());
        }
        return [value];
      }
    }

    return value;
  })
  @IsArray()
  @IsString({ each: true })
  job_responsibilities?: string[];

  @ApiPropertyOptional({
    description: 'Job requirements',
    example: [
      'Must be able to lift 20kg',
      'Previous experience preferred',
      'Must have valid ID',
    ],
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return value;

    // If it's an array, check if items contain commas and split them
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        typeof item === 'string' && item.includes(',')
          ? item.split(',').map((s) => s.trim())
          : item,
      );
    }

    // If it's a string, try to parse as JSON first
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) =>
            typeof item === 'string' && item.includes(',')
              ? item.split(',').map((s) => s.trim())
              : item,
          );
        }
      } catch {
        // If JSON parse fails, check if it's comma-separated
        if (value.includes(',')) {
          return value.split(',').map((s) => s.trim());
        }
        return [value];
      }
    }

    return value;
  })
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

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
  @Matches(
    /^(([01]\d|2[0-3]):([0-5]\d)|((0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM|am|pm)))$/,
  )
  start_time?: string;

  @ApiPropertyOptional({
    description: 'Shift end time (HH:mm or hh:mm AM/PM)',
    example: '05:30 PM',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^(([01]\d|2[0-3]):([0-5]\d)|((0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM|am|pm)))$/,
  )
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
