import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ minLength: 6, default: '123456' })
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @ApiProperty({ minLength: 6, default: '123456' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
