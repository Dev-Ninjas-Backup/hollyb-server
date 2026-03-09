import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  profilePhoto?: string;

  @ApiPropertyOptional({ example: 'Masud Rana', default: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Hollyb Ltd', default: 'My Company Ltd' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'Dhaka, Bangladesh',
    default: 'Dhaka, Bangladesh',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1995-08-15', default: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @ApiPropertyOptional({
    example: 'Passionate full-stack developer.',
    default: 'Tell us about yourself',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Node.js', 'NestJS'],
    default: ['JavaScript'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      const parsed = value
        .flatMap((item) => String(item).split(','))
        .map((item) => item.trim())
        .filter(Boolean);
      return parsed.length > 0 ? parsed : undefined;
    }

    if (typeof value === 'string') {
      const parsed = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return parsed.length > 0 ? parsed : undefined;
    }

    return value;
  })
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
