import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobCategory } from '@prisma';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetJobsQueryDto {
  @ApiPropertyOptional({
    description: 'Search in title, company_name, description and requirements',
    example: '',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by job category',
    enum: JobCategory,
    enumName: 'JobCategory',
    example: 'chef',
  })
  @IsOptional()
  @IsEnum(JobCategory)
  job_category?: JobCategory;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
