import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettingsByUpdater(userId: string) {
    const settings = await this.prisma.client.setting.findUnique({
      where: { updated_by: userId },
      include: {
        updater: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!settings) {
      throw new NotFoundException(`Settings not found for user`);
    }

    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto, userId: string) {
    // Check if settings exist
    const existingSettings = await this.prisma.client.setting.findFirst();

    if (!existingSettings) {
      throw new NotFoundException('Settings not found');
    }

    // Update settings
    const updatedSettings = await this.prisma.client.setting.update({
      where: { id: existingSettings.id },
      data: {
        ...dto,
        updated_by: userId,
      },
      include: {
        updater: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    return updatedSettings;
  }
}
