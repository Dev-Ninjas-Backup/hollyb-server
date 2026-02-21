import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDecimal,
  Allow,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
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

  @IsOptional()
  @Allow()
  file?: any;

  @ApiPropertyOptional({
    description: 'Mark job as urgent',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_urgent?: boolean;

  @ApiPropertyOptional({
    description: 'Job start date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Shift start time (ISO string)',
    example: '1970-01-01T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({
    description: 'Shift end time (ISO string)',
    example: '1970-01-01T17:00:00.000Z',
  })
  @IsOptional()
  @IsString()
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
