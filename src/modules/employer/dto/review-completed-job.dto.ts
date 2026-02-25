import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateReviewJobDto {
  @ApiProperty({
    description: 'Employee rating for the completed job',
    example: 4.5,
  })
  @IsNumber()
  rating: number;

  @ApiProperty({
    description: 'Comment about the completed job',
    example: 'Great experience working with this employer.',
  })
  @IsString()
  comment: string;
}
