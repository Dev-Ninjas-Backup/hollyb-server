import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ResponseHelper } from '@/common/utils/response.helper';
import {
  BusinessException,
  ResourceNotFoundException,
} from '@/common/exceptions/business.exception';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AccountStatus, AuthProvider, UserRole } from '@prisma';
import { S3UploadService } from '@/common/upload/s3-upload.service';
import { compare, hash } from 'bcryptjs';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3UploadService: S3UploadService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      include: {
        employee_profile: {
          include: {
            employee_skills: { include: { skill: true } },
          },
        },
        employer_profile: true,
      },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const skills =
      user.employee_profile?.employee_skills.map((item) => item.skill.name) ??
      [];

    const profile =
      user.role === 'employee'
        ? user.employee_profile
          ? {
              dateOfBirth: user.employee_profile.date_of_birth,
              address: user.employee_profile.address,
              experienceYears: user.employee_profile.experience_years,
              bio: user.employee_profile.bio,
              profilePhotoUrl: user.employee_profile.profile_photo_url,
              skills,
            }
          : null
        : user.employer_profile
          ? {
              companyName: user.employer_profile.company_name,
              address: user.employer_profile.address,
              profilePhotoUrl: user.employer_profile.profile_photo_url,
            }
          : null;

    return ResponseHelper.success(
      {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        isNotify: user.isNotify,
        profile,
      },
      'Profile fetched successfully',
    );
  }

  async updateMe(
    userId: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const userUpdateData = dto.fullName
      ? { full_name: dto.fullName }
      : undefined;

    if (userUpdateData) {
      await this.prismaService.client.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    const profilePhotoUrl = file
      ? await this.s3UploadService.uploadProfilePhoto(userId, file)
      : undefined;

    if (user.role === UserRole.employee) {
      await this.prismaService.client.employeeProfile.upsert({
        where: { user_id: userId },
        update: {
          date_of_birth: dto.dateOfBirth
            ? new Date(dto.dateOfBirth)
            : undefined,
          address: dto.address,
          experience_years: dto.experienceYears,
          bio: dto.bio,
          profile_photo_url: profilePhotoUrl,
        },
        create: {
          user_id: userId,
          date_of_birth: dto.dateOfBirth
            ? new Date(dto.dateOfBirth)
            : undefined,
          address: dto.address,
          experience_years: dto.experienceYears,
          bio: dto.bio,
          profile_photo_url: profilePhotoUrl,
        },
      });

      if (dto.skills) {
        const skills = await Promise.all(
          dto.skills.map(async (name) => {
            return this.prismaService.client.skill.upsert({
              where: { name },
              update: {},
              create: { name },
            });
          }),
        );

        const employeeProfile =
          await this.prismaService.client.employeeProfile.findUnique({
            where: { user_id: userId },
            select: { id: true },
          });

        if (!employeeProfile) {
          throw new BusinessException('Employee profile not found');
        }

        await this.prismaService.client.employeeSkill.deleteMany({
          where: { employee_id: employeeProfile.id },
        });

        await this.prismaService.client.employeeSkill.createMany({
          data: skills.map((skill) => ({
            employee_id: employeeProfile.id,
            skill_id: skill.id,
          })),
        });
      }
    }

    if (user.role === UserRole.employer) {
      await this.prismaService.client.employerProfile.upsert({
        where: { user_id: userId },
        update: {
          company_name: dto.companyName,
          address: dto.address,
          profile_photo_url: profilePhotoUrl,
        },
        create: {
          user_id: userId,
          company_name: dto.companyName,
          address: dto.address,
          profile_photo_url: profilePhotoUrl,
        },
      });
    }

    return this.getMe(userId);
  }

  async getNotify(userId: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { isNotify: true },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return ResponseHelper.success(
      { isNotify: user.isNotify },
      'Notification preference fetched successfully',
    );
  }

  async toggleNotify(userId: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { isNotify: true },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    const updated = await this.prismaService.client.user.update({
      where: { id: userId },
      data: { isNotify: !user.isNotify },
      select: { isNotify: true },
    });

    return ResponseHelper.success(
      { isNotify: updated.isNotify },
      'Notification preference updated successfully',
    );
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password_hash: true,
        is_deleted: true,
      },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    if (user.is_deleted) {
      throw new BusinessException(
        'Your account has been deleted. Please contact support for help.',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!user.password_hash) {
      throw new BusinessException(
        'Password is not set for this account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isOldPasswordValid = await compare(
      dto.oldPassword,
      user.password_hash,
    );
    if (!isOldPasswordValid) {
      throw new BusinessException(
        'Old password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newPasswordHash = await hash(dto.newPassword, 10);

    await this.prismaService.client.$transaction([
      this.prismaService.client.user.update({
        where: { id: userId },
        data: {
          password_hash: newPasswordHash,
          last_active_at: new Date(),
        },
      }),
      this.prismaService.client.userAuthProvider.updateMany({
        where: {
          user_id: userId,
          provider: AuthProvider.credentials,
        },
        data: {
          access_token: null,
          refresh_token: null,
        },
      }),
    ]);

    return ResponseHelper.success(null, 'Password changed successfully');
  }

  async deleteMe(userId: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { id: true, is_deleted: true },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    if (user.is_deleted) {
      return ResponseHelper.success(null, 'Account is already deleted');
    }

    await this.prismaService.client.$transaction([
      this.prismaService.client.user.update({
        where: { id: userId },
        data: {
          is_deleted: true,
          is_active: false,
          account_status: AccountStatus.blocked,
          last_active_at: new Date(),
        },
      }),
      this.prismaService.client.userAuthProvider.updateMany({
        where: {
          user_id: userId,
        },
        data: {
          access_token: null,
          refresh_token: null,
        },
      }),
    ]);

    return ResponseHelper.success(null, 'Account deleted successfully');
  }
}
