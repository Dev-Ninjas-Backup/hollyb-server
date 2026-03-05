import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddFavoriteEmployeeDto {
  @ApiProperty({
    description: 'Employee ID to add as favorite',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  employee_id: string;
}
