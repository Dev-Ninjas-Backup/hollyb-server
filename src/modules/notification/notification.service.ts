import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UserRole } from '@prisma';
import {
  NotificationEventsEnum,
  NotificationTypeEnum,
} from './notification.gateway';
import { NotificationGateway } from './notification.gateway';

export interface CreateNotificationDto {
  type: string;
  title: string;
  message: string;
  meta?: Record<string, any>;
  userIds: string[];
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  meta: any;
  read: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => 'NotificationGateway'))
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Create a notification and send it to specified users
   */
  async createNotification(dto: CreateNotificationDto): Promise<void> {
    try {
      // Create the notification
      const notification = await this.prisma.client.notification.create({
        data: {
          type: dto.type,
          title: dto.title,
          message: dto.message,
          meta: dto.meta || {},
          users: {
            create: dto.userIds.map((userId) => ({
              userId,
            })),
          },
        },
        include: {
          users: true,
        },
      });

      // Prepare the notification payload
      const payload: NotificationPayload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        meta: notification.meta,
        read: false,
        createdAt: notification.createdAt,
      };

      // Send notification to all specified users via websocket
      this.notificationGateway.sendToUsers(
        dto.userIds,
        NotificationEventsEnum.NEW_NOTIFICATION,
        payload,
      );

      this.logger.log(
        `Notification created and sent to ${dto.userIds.length} user(s)`,
      );
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification to all admins when a new user is created
   */
  async notifyAdminsOfNewUser(user: {
    id: string;
    full_name: string;
    email: string | null;
    role: UserRole;
  }): Promise<void> {
    try {
      // Get all admin users
      const admins = await this.prisma.client.user.findMany({
        where: {
          role: UserRole.admin,
          is_active: true,
          is_deleted: false,
        },
        select: { id: true },
      });

      if (admins.length === 0) {
        this.logger.warn('No active admins found to notify');
        return;
      }

      const adminIds = admins.map((admin) => admin.id);

      // Create notification for new user creation
      await this.createNotification({
        type: NotificationTypeEnum.USER_CREATED,
        title: 'New User Registered',
        message: `A new ${user.role} user "${user.full_name}" (${user.email || 'No email'}) has registered.`,
        meta: {
          userId: user.id,
          userName: user.full_name,
          userEmail: user.email,
          userRole: user.role,
          timestamp: new Date().toISOString(),
        },
        userIds: adminIds,
      });

      // Also emit directly to admin room for immediate notification
      this.notificationGateway.sendToAdmins(
        NotificationEventsEnum.USER_CREATED,
        {
          userId: user.id,
          userName: user.full_name,
          userEmail: user.email,
          userRole: user.role,
          message: `New ${user.role} registered: ${user.full_name}`,
          timestamp: new Date().toISOString(),
        },
      );

      this.logger.log(
        `Admins notified of new user: ${user.full_name} (${user.email})`,
      );
    } catch (error) {
      this.logger.error(`Failed to notify admins of new user: ${error.message}`);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.prisma.client.userNotification.findMany({
        where: { userId },
        include: {
          notification: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.userNotification.count({
        where: { userId },
      }),
    ]);

    return {
      data: notifications.map((un) => ({
        id: un.notification.id,
        userNotificationId: un.id,
        type: un.notification.type,
        title: un.notification.title,
        message: un.notification.message,
        meta: un.notification.meta,
        read: un.read,
        createdAt: un.notification.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.client.userNotification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await this.prisma.client.userNotification.updateMany({
      where: {
        userId,
        notificationId: { in: notificationIds },
      },
      data: { read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.client.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  /**
   * Delete a user's notification
   */
  async deleteUserNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    await this.prisma.client.userNotification.deleteMany({
      where: {
        userId,
        notificationId,
      },
    });
  }
}
