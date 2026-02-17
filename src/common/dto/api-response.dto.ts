import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, IsOptional } from 'class-validator';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  @IsNumber()
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  @IsNumber()
  limit: number;

  @ApiProperty({ example: 100, description: 'Total items' })
  @IsNumber()
  total: number;

  @ApiProperty({ example: 10, description: 'Total pages' })
  @IsNumber()
  totalPages: number;

  @ApiProperty({ example: true, description: 'Has next page' })
  @IsBoolean()
  hasNextPage: boolean;

  @ApiProperty({ example: false, description: 'Has previous page' })
  @IsBoolean()
  hasPreviousPage: boolean;
}

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ example: 200 })
  @IsNumber()
  statusCode: number;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsOptional()
  data?: T;

  @ApiProperty()
  @IsString()
  timestamp: string;

  @ApiProperty({ example: '/api/v1/{path}' })
  @IsString()
  path: string;
}

export class ApiPaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({ type: PaginationMetaDto, required: false })
  @IsOptional()
  meta?: PaginationMetaDto;
}

export class ValidationErrorDto {
  @ApiProperty()
  field: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  value?: any;
}

export class ErrorResponseDto {
  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty({ example: 400 })
  @IsNumber()
  statusCode: number;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiProperty()
  @IsString()
  error: string;

  @ApiProperty({ type: [ValidationErrorDto], required: false })
  @IsOptional()
  errors?: ValidationErrorDto[];

  @ApiProperty()
  @IsString()
  timestamp: string;

  @ApiProperty()
  @IsString()
  path: string;
}
