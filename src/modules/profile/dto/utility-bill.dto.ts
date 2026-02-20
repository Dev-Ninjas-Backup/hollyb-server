import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UtilityBillDto {
  @ApiPropertyOptional({
    example: 'Dhaka, Bangladesh',
    default: 'Dhaka, Bangladesh',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
