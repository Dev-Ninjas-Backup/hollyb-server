import { ApiProperty } from '@nestjs/swagger';
import {
  AccountStatus,
  SubscriptionPlanType,
  SubscriptionStatus,
  UserRole,
} from '@prisma';

export class AdminBackgroundCheckStatsDto {
  @ApiProperty({ example: 3460 })
  totalChecks: number;

  @ApiProperty({ example: 2910 })
  verified: number;

  @ApiProperty({ example: 550 })
  unVerified: number;
}

export class AdminBackgroundCheckListItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'John Smith' })
  name: string;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.employee,
  })
  userType: UserRole;

  @ApiProperty({
    enum: ['verified', 'unverified'],
    example: 'verified',
  })
  verificationStatus: 'verified' | 'unverified';

  @ApiProperty({ example: '2026-02-21T10:00:00.000Z', nullable: true })
  dateChecked: Date | null;
}

export class AdminBackgroundCheckRecentActivityDto {
  @ApiProperty({ example: 'Tasty Bites' })
  userName: string;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.employee,
  })
  userType: UserRole;

  @ApiProperty({ example: 'Verified Automatically' })
  action: string;

  @ApiProperty({ example: '1 hr ago' })
  relativeTime: string;

  @ApiProperty({ example: '2026-02-21T10:00:00.000Z' })
  occurredAt: Date;
}

export class AdminProfileDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440099',
    nullable: true,
  })
  id?: string;

  @ApiProperty({ example: '1990-05-15', nullable: true })
  dateOfBirth?: string | null;

  @ApiProperty({ example: 'Tech Solutions Inc.', nullable: true })
  companyName?: string | null;

  @ApiProperty({ example: '123 Main Street, City, Country', nullable: true })
  address: string | null;

  @ApiProperty({ example: 40.7128, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: -74.006, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 5, nullable: true })
  experienceYears?: number | null;

  @ApiProperty({ example: 'Experienced web developer', nullable: true })
  bio?: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true })
  profilePhotoUrl: string | null;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 45 })
  totalReviews: number;

  @ApiProperty({ example: 120, nullable: true })
  totalJobs?: number;

  @ApiProperty({ example: 850.5, nullable: true })
  totalHours?: number;

  @ApiProperty({ example: '12500.00', nullable: true })
  totalEarned?: string;

  @ApiProperty({ example: 250, nullable: true })
  totalHires?: number;
}

export class AdminEmployeeProfileDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440099',
    nullable: true,
  })
  id?: string;

  @ApiProperty({ example: '1990-05-15', nullable: true })
  dateOfBirth: string | null;

  @ApiProperty({ example: '123 Main Street, City, Country', nullable: true })
  address: string | null;

  @ApiProperty({ example: 40.7128, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: -74.006, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 5, nullable: true })
  experienceYears: number | null;

  @ApiProperty({ example: 'Experienced web developer', nullable: true })
  bio: string | null;

  @ApiProperty({ example: 'https://example.com/photo.jpg', nullable: true })
  profilePhotoUrl: string | null;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 45 })
  totalReviews: number;

  @ApiProperty({ example: 120 })
  totalJobs: number;

  @ApiProperty({ example: 850.5 })
  totalHours: number;

  @ApiProperty({ example: '12500.00' })
  totalEarned: string;
}

export class AdminEmployerProfileDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440099',
    nullable: true,
  })
  id?: string;

  @ApiProperty({ example: 'Tech Solutions Inc.', nullable: true })
  companyName: string | null;

  @ApiProperty({ example: '456 Business Ave, City, Country', nullable: true })
  address: string | null;

  @ApiProperty({ example: 40.758, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: -73.9855, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 'https://example.com/logo.jpg', nullable: true })
  profilePhotoUrl: string | null;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: 38 })
  totalReviews: number;

  @ApiProperty({ example: 250 })
  totalHires: number;
}

export class AdminActiveSubscriptionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440088',
    nullable: true,
  })
  id?: string;

  @ApiProperty({
    enum: SubscriptionPlanType,
    enumName: 'SubscriptionPlanType',
    nullable: true,
  })
  planType: SubscriptionPlanType | null;

  @ApiProperty({ example: '9.99' })
  amount: string;

  @ApiProperty({ example: '2026-02-01' })
  startDate: string;

  @ApiProperty({ example: '2026-03-01' })
  endDate: string;

  @ApiProperty({ enum: SubscriptionStatus, enumName: 'SubscriptionStatus' })
  status: SubscriptionStatus;
}

export class AdminBackgroundCheckDetailDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'John Smith' })
  fullName: string;

  @ApiProperty({ example: 'john@example.com', nullable: true })
  email: string | null;

  @ApiProperty({
    enum: UserRole,
    enumName: 'UserRole',
    example: UserRole.employee,
  })
  userType: UserRole;

  @ApiProperty({ enum: AccountStatus, enumName: 'AccountStatus' })
  accountStatus: AccountStatus;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({
    enum: ['verified', 'unverified'],
    example: 'verified',
  })
  verificationStatus: 'verified' | 'unverified';

  @ApiProperty({ example: '2026-02-21T10:00:00.000Z', nullable: true })
  dateChecked: Date | null;

  @ApiProperty({ example: '2026-01-10T09:00:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ example: '2026-02-21T10:00:00.000Z', nullable: true })
  lastActiveAt: Date | null;

  @ApiProperty({
    type: AdminProfileDto,
    nullable: true,
    description: 'Profile information (employee or employer)',
  })
  profile?: AdminProfileDto | null;

  @ApiProperty({
    type: AdminActiveSubscriptionDto,
    nullable: true,
    description: 'Active subscription if exists',
  })
  activeSubscription?: AdminActiveSubscriptionDto | null;
}
