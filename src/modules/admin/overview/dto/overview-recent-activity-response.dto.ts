import { ApiProperty } from '@nestjs/swagger';

export class OverviewRecentActivityItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  actorId: string;

  @ApiProperty({ example: 'Smith Corp' })
  actorName: string;

  @ApiProperty({ enum: ['employee', 'employer'], example: 'employer' })
  actorType: 'employee' | 'employer';

  @ApiProperty({
    example: 'https://cdn.example.com/avatar.png',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({ example: 'Posted new job "Chef Assistant"' })
  action: string;

  @ApiProperty({ example: '2 hr ago' })
  relativeTime: string;

  @ApiProperty({ example: '2026-03-03T10:00:00.000Z' })
  occurredAt: Date;
}
