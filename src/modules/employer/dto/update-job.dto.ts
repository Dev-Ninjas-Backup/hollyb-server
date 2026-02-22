import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDecimal,
  Allow,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
