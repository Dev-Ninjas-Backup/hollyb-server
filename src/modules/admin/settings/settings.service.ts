import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  UpdateGeneralSettingsDto,
  UpdateNotificationSettingsDto,
} from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneralSettings(userId: string) {
    const settings = await this.prisma.client.setting.findUnique({
      where: { updated_by: userId },
      select: {
        id: true,
        workspaceName: true,
        Timezone: true,
      },
    });

    if (!settings) {
      throw new NotFoundException(`Settings not found for user`);
    }

    return settings;
  }

  async getAccountSettings(userId: string) {
    const settings = await this.prisma.client.setting.findUnique({
      where: { updated_by: userId },
      select: {
        updater: {
          select: {
            id: true,
            full_name: true,
            email: true
          }
        }
      }
    });

    if (!settings) {
      throw new NotFoundException(`Settings not found for user`);
    }

    return settings;
  }

  async getNotificationSettings(userId: string) {
    const settings = await this.prisma.client.setting.findUnique({
      where: { updated_by: userId },
      select: {
        id: true,
        two_factor_authentication_enabled: true,
        system_alerts_enabled: true,
        email_notifications_enabled: true,
      },
    });

    if (!settings) {
      throw new NotFoundException(`Notification settings not found for user`);
    }

    return settings;
  }

  async updateGeneralSettings(dto: UpdateGeneralSettingsDto, userId: string) {
    // Try to find settings by updated_by for current user
    let existingSettings = await this.prisma.client.setting.findUnique({
      where: { updated_by: userId },
    });

    // If not found, get the first settings record
    if (!existingSettings) {
      existingSettings = await this.prisma.client.setting.findFirst();

      if (!existingSettings) {
        throw new NotFoundException('Settings not found');
      }
    }

    // Update settings
    const updatedSettings = await this.prisma.client.setting.update({
      where: { id: existingSettings.id },
      data: {
        ...dto,
        updated_by: userId,
      },
      select: {
        id: true,
        workspaceName: true,
        Timezone: true
      }
    });

    return updatedSettings;
  }

  async updateNotificationSettings(
    dto: UpdateNotificationSettingsDto,
    userId: string,
  ) {
    // Try to find settings by updated_by for current user
    let existingSettings = await this.prisma.client.setting.findUnique({
      where: { updated_by: userId },
    });

    // If not found, get the first settings record
    if (!existingSettings) {
      existingSettings = await this.prisma.client.setting.findFirst();

      if (!existingSettings) {
        throw new NotFoundException('Settings not found');
      }
    }

    // Update settings
    const updatedSettings = await this.prisma.client.setting.update({
      where: { id: existingSettings.id },
      data: {
        ...dto,
        updated_by: userId,
      },
      select: {
        id: true,
        two_factor_authentication_enabled: true,
        system_alerts_enabled: true,
        email_notifications_enabled: true
      }
    });

    return updatedSettings;
  }
}
