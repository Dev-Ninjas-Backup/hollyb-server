import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export enum AdminBackgroundCheckUserType {
  all = 'all',
  employers = 'employers',
  employees = 'employees',
}

export enum AdminBackgroundCheckStatusFilter {
  all = 'all',
  verified = 'verified',
  unverified = 'unverified',
}

export enum AdminBackgroundCheckDateRangePreset {
  this_month = 'this_month',
  last_month = 'last_month',
  all_time = 'all_time',
  custom = 'custom',
}

export class AdminBackgroundCheckQueryDto {
  @ApiPropertyOptional({
    enum: AdminBackgroundCheckUserType,
    default: AdminBackgroundCheckUserType.all,
  })
  @IsOptional()
  @IsEnum(AdminBackgroundCheckUserType)
  userType?: AdminBackgroundCheckUserType = AdminBackgroundCheckUserType.all;

  @ApiPropertyOptional({
    enum: AdminBackgroundCheckStatusFilter,
    default: AdminBackgroundCheckStatusFilter.all,
  })
  @IsOptional()
  @IsEnum(AdminBackgroundCheckStatusFilter)
  status?: AdminBackgroundCheckStatusFilter =
    AdminBackgroundCheckStatusFilter.all;

  @ApiPropertyOptional({
    enum: AdminBackgroundCheckDateRangePreset,
    default: AdminBackgroundCheckDateRangePreset.this_month,
  })
  @IsOptional()
  @IsEnum(AdminBackgroundCheckDateRangePreset)
  dateRange?: AdminBackgroundCheckDateRangePreset =
    AdminBackgroundCheckDateRangePreset.this_month;

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-02-29' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
