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

export enum AdminSubscriptionUserType {
  all = 'all',
  employer = 'employer',
  employee = 'employee',
}

export enum AdminSubscriptionStatusFilter {
  all = 'all',
  active = 'active',
  expiring_soon = 'expiring_soon',
  expired = 'expired',
}

export enum AdminDateRangePreset {
  this_month = 'this_month',
  last_month = 'last_month',
  custom = 'custom',
}

export class AdminSubscriptionQueryDto {
  @ApiPropertyOptional({
    enum: AdminSubscriptionUserType,
    default: AdminSubscriptionUserType.all,
  })
  @IsOptional()
  @IsEnum(AdminSubscriptionUserType)
  userType?: AdminSubscriptionUserType = AdminSubscriptionUserType.all;

  @ApiPropertyOptional({
    enum: AdminSubscriptionStatusFilter,
    default: AdminSubscriptionStatusFilter.all,
  })
  @IsOptional()
  @IsEnum(AdminSubscriptionStatusFilter)
  status?: AdminSubscriptionStatusFilter = AdminSubscriptionStatusFilter.all;

  @ApiPropertyOptional({
    enum: AdminDateRangePreset,
    default: AdminDateRangePreset.this_month,
  })
  @IsOptional()
  @IsEnum(AdminDateRangePreset)
  dateRange?: AdminDateRangePreset = AdminDateRangePreset.this_month;

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
