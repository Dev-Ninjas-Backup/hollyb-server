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
    @Inject(forwardRef(() => NotificationGateway))
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
      this.logger.error(
        `Failed to notify admins of new user: ${error.message}`,
      );
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

  /**
   * Notify user and admins when subscription is successful
   */
  async notifySubscriptionSuccess(
    userId: string,
    planType: string,
    isRenewal: boolean = false,
  ): Promise<void> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `User ${userId} not found for subscription notification`,
        );
        return;
      }

      const actionText = isRenewal ? 'renewed' : 'activated';
      const notificationType = isRenewal
        ? NotificationTypeEnum.SUBSCRIPTION_RENEWED
        : NotificationTypeEnum.SUBSCRIPTION_ACTIVATED;

      // Notify the user
      await this.createNotification({
        type: notificationType,
        title: `Subscription ${actionText}`,
        message: `Your ${planType} subscription has been successfully ${actionText}. You now have full access to all features.`,
        meta: {
          userId: user.id,
          planType,
          timestamp: new Date().toISOString(),
          isRenewal,
        },
        userIds: [userId],
      });

      // Notify all admins
      const admins = await this.prisma.client.user.findMany({
        where: {
          role: UserRole.admin,
          is_active: true,
          is_deleted: false,
        },
        select: { id: true },
      });

      if (admins.length > 0) {
        const adminIds = admins.map((admin) => admin.id);
        await this.createNotification({
          type: notificationType,
          title: `User Subscription ${actionText}`,
          message: `${user.role} user "${user.full_name}" (${user.email || 'No email'}) has ${actionText} their ${planType} subscription.`,
          meta: {
            userId: user.id,
            userName: user.full_name,
            userEmail: user.email,
            userRole: user.role,
            planType,
            timestamp: new Date().toISOString(),
            isRenewal,
          },
          userIds: adminIds,
        });

        // Also emit directly to admin room
        this.notificationGateway.sendToAdmins(
          NotificationEventsEnum.SUBSCRIPTION_SUCCESS,
          {
            userId: user.id,
            userName: user.full_name,
            userEmail: user.email,
            userRole: user.role,
            planType,
            message: `${user.full_name} ${actionText} ${planType} subscription`,
            timestamp: new Date().toISOString(),
            isRenewal,
          },
        );
      }

      this.logger.log(
        `Subscription ${actionText} notification sent to user ${userId} and admins`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send subscription notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify employee when assigned to a job
   */
  async notifyEmployeeAssignment(
    employeeUserId: string,
    jobId: string,
    jobTitle: string,
    employerName: string,
  ): Promise<void> {
    try {
      await this.createNotification({
        type: NotificationTypeEnum.JOB_ASSIGNED,
        title: 'Job Assignment',
        message: `You have been assigned to "${jobTitle}" by ${employerName}. Please prepare for your upcoming shift.`,
        meta: {
          jobId,
          jobTitle,
          employerName,
          timestamp: new Date().toISOString(),
        },
        userIds: [employeeUserId],
      });

      this.logger.log(
        `Job assignment notification sent to employee ${employeeUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send job assignment notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify employee when job is starting soon (30 minutes before)
   */
  async notifyJobStartingSoon(
    employeeUserId: string,
    jobId: string,
    jobTitle: string,
    startTime: Date,
  ): Promise<void> {
    try {
      await this.createNotification({
        type: NotificationTypeEnum.JOB_STARTING_SOON,
        title: 'Job Starting Soon',
        message: `Your job "${jobTitle}" is starting soon. Please be ready to check in.`,
        meta: {
          jobId,
          jobTitle,
          startTime: startTime.toISOString(),
          timestamp: new Date().toISOString(),
        },
        userIds: [employeeUserId],
      });

      this.logger.log(
        `Job starting soon notification sent to employee ${employeeUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send job starting soon notification: ${error.message}`,
      );
    }
  }

  /**
   * Notify employer when job is completed
   */
  async notifyJobCompleted(
    employerUserId: string,
    jobId: string,
    jobTitle: string,
    employeeName: string,
  ): Promise<void> {
    try {
      await this.createNotification({
        type: NotificationTypeEnum.JOB_COMPLETED,
        title: 'Job Completed',
        message: `${employeeName} has completed the job "${jobTitle}". You can now review and process payment.`,
        meta: {
          jobId,
          jobTitle,
          employeeName,
          timestamp: new Date().toISOString(),
        },
        userIds: [employerUserId],
      });

      this.logger.log(
        `Job completion notification sent to employer ${employerUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send job completion notification: ${error.message}`,
      );
    }
  }

  async getNotifications(userId: string) {
    return this.prisma.client.user.findMany({
      where: {
        id: userId,
      },
      select: {
        notifications: {
          select: {
            notification: true,
            read: true,
            id: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async checkUserSettings() {}
}
