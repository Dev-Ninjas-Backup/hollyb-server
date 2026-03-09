import { Logger, forwardRef, Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WEBSOCKET_CORS_CONFIG } from '@/common/constants/cors.constant';
import { SocketAuthMiddleware } from '@/common/jwt/socket-auth.middleware';
import type { NotificationService } from './notification.service';
import { UserRole } from '@prisma';

/**
 * Notification Events Enum - WebSocket event names for notification system
 * All socket.io events and listeners for notifications are managed here
 */
export enum NotificationEventsEnum {
  // === Connection Events ===
  ERROR = 'notification:error', // Server -> Client: notification operation failed
  SUCCESS = 'notification:success', // Server -> Client: notification operation succeeded
  CONNECTED = 'notification:connected', // Server -> Client: successfully connected to notification namespace

  // === Notification Events ===
  NEW_NOTIFICATION = 'notification:new', // Server -> Client: new notification received
  NOTIFICATION_LIST = 'notification:list', // Server -> Client: list of notifications
  LOAD_NOTIFICATIONS = 'notification:load', // Client -> Server: request to load notifications
  LOAD_MORE_NOTIFICATIONS = 'notification:load_more', // Client -> Server: request to load more notifications

  // === Read/Unread Events ===
  MARK_READ = 'notification:mark_read', // Client -> Server: mark notification(s) as read
  MARK_ALL_READ = 'notification:mark_all_read', // Client -> Server: mark all notifications as read
  NOTIFICATION_READ = 'notification:read', // Server -> Client: confirmation of notification(s) marked as read
  UNREAD_COUNT = 'notification:unread_count', // Server -> Client: unread notification count

  // === Delete Events ===
  DELETE_NOTIFICATION = 'notification:delete', // Client -> Server: delete notification
  NOTIFICATION_DELETED = 'notification:deleted', // Server -> Client: confirmation of notification deleted

  // === Admin Specific Events ===
  USER_CREATED = 'notification:user_created', // Server -> Admin: new user registered
  USER_VERIFIED = 'notification:user_verified', // Server -> Admin: user verified their account
  SUBSCRIPTION_SUCCESS = 'notification:subscription_success', // Server -> Admin + User: successful subscription
}


/**
 * Notification Type Enum - Types of notifications in the system
 */
export enum NotificationTypeEnum {
  // User related
  USER_CREATED = 'user_created',
  USER_VERIFIED = 'user_verified',
  USER_UPDATED = 'user_updated',

  // Job related
  JOB_UPDATE = 'job_update',
  JOB_CREATED = 'job_created',
  JOB_APPLIED = 'job_applied',
  JOB_ACCEPTED = 'job_accepted',
  JOB_REJECTED = 'job_rejected',
  JOB_COMPLETED = 'job_completed',
  JOB_ASSIGNED = 'job_assigned',
  JOB_STARTING_SOON = 'job_starting_soon',

  // Message related
  MESSAGE = 'message',
  NEW_MESSAGE = 'new_message',

  // Payment related
  PAYMENT = 'payment',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_SENT = 'payment_sent',

  // Review related
  REVIEW = 'review',
  NEW_REVIEW = 'new_review',

  // System related
  SYSTEM = 'system',

  // Subscription related
  SUBSCRIPTION_ACTIVATED = 'subscription_activated',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SYSTEM_ALERT = 'system_alert',
  ACCOUNT_STATUS = 'account_status',
}

export const ADMIN_ROOM = 'admin_room';

@WebSocketGateway({
  cors: WEBSOCKET_CORS_CONFIG,
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    @Inject(
      forwardRef(() => require('./notification.service').NotificationService),
    )
    private readonly notificationService: NotificationService,
    private readonly socketAuthMiddleware: SocketAuthMiddleware,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // Register JWT authentication middleware
    server.use(this.socketAuthMiddleware.use());
    this.logger.log(
      'Socket.IO server initialized for Notifications with JWT middleware',
    );
  }

  /** Handle socket connection (authentication handled by middleware) */
  async handleConnection(client: Socket) {
    const userId = client.data.userId;
    const user = client.data.user;

    if (!userId || !user) {
      this.logger.error('Unauthenticated socket reached handleConnection');
      client.disconnect(true);
      return;
    }

    // Join user's personal room for targeted notifications
    client.join(userId);

    // If user is admin, join admin room for admin-specific notifications
    if (user.role === UserRole.admin) {
      client.join(ADMIN_ROOM);
      this.logger.log(`Admin ${userId} joined admin room`);
    }

    try {
      // Get unread count and initial notifications
      const [notifications, unreadCount] = await Promise.all([
        this.notificationService.getUserNotifications(userId),
        this.notificationService.getUnreadCount(userId),
      ]);

      // Notify client of successful connection
      client.emit(NotificationEventsEnum.CONNECTED, {
        userId,
        socketId: client.id,
        message: 'Connected to notification service',
        unreadCount,
      });

      // Send initial notification list
      client.emit(NotificationEventsEnum.NOTIFICATION_LIST, notifications);

      this.logger.log(
        `Notification: User ${userId} (${user.email}) connected, socket ${client.id}`,
      );
    } catch (error) {
      this.logger.error(`Error loading notifications for ${userId}:`, error);
      client.emit(NotificationEventsEnum.ERROR, {
        message: 'Failed to load notifications',
      });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    const user = client.data?.user;

    if (userId) {
      client.leave(userId);
      if (user?.role === UserRole.admin) {
        client.leave(ADMIN_ROOM);
      }
    }

    this.logger.log(
      `Notification disconnected: ${client.id}${userId ? ` (User: ${userId})` : ''}`,
    );
  }

  /** Load notifications for the connected user */
  @SubscribeMessage(NotificationEventsEnum.LOAD_NOTIFICATIONS)
  async handleLoadNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { page?: number; limit?: number },
  ) {
    const userId = client.data.userId;

    try {
      const notifications = await this.notificationService.getUserNotifications(
        userId,
        data?.page || 1,
        data?.limit || 20,
      );

      client.emit(NotificationEventsEnum.NOTIFICATION_LIST, notifications);
    } catch (error) {
      this.logger.error(`Error loading notifications: ${error.message}`);
      client.emit(NotificationEventsEnum.ERROR, {
        message: 'Failed to load notifications',
      });
    }
  }

  /** Mark notification(s) as read */
  @SubscribeMessage(NotificationEventsEnum.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationIds: string[] },
  ) {
    const userId = client.data.userId;

    try {
      await this.notificationService.markAsRead(userId, data.notificationIds);

      const unreadCount = await this.notificationService.getUnreadCount(userId);

      client.emit(NotificationEventsEnum.NOTIFICATION_READ, {
        notificationIds: data.notificationIds,
        success: true,
      });

      client.emit(NotificationEventsEnum.UNREAD_COUNT, { count: unreadCount });
    } catch (error) {
      this.logger.error(
        `Error marking notifications as read: ${error.message}`,
      );
      client.emit(NotificationEventsEnum.ERROR, {
        message: 'Failed to mark notifications as read',
      });
    }
  }

  /** Mark all notifications as read */
  @SubscribeMessage(NotificationEventsEnum.MARK_ALL_READ)
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;

    try {
      await this.notificationService.markAllAsRead(userId);

      client.emit(NotificationEventsEnum.NOTIFICATION_READ, {
        all: true,
        success: true,
      });

      client.emit(NotificationEventsEnum.UNREAD_COUNT, { count: 0 });
    } catch (error) {
      this.logger.error(
        `Error marking all notifications as read: ${error.message}`,
      );
      client.emit(NotificationEventsEnum.ERROR, {
        message: 'Failed to mark all notifications as read',
      });
    }
  }

  /** Delete a notification */
  @SubscribeMessage(NotificationEventsEnum.DELETE_NOTIFICATION)
  async handleDeleteNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    const userId = client.data.userId;

    try {
      await this.notificationService.deleteUserNotification(
        userId,
        data.notificationId,
      );

      client.emit(NotificationEventsEnum.NOTIFICATION_DELETED, {
        notificationId: data.notificationId,
        success: true,
      });
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`);
      client.emit(NotificationEventsEnum.ERROR, {
        message: 'Failed to delete notification',
      });
    }
  }

  // === Helper methods for emitting notifications ===

  /**
   * Send notification to specific user(s)
   */
  sendToUsers(userIds: string[], event: NotificationEventsEnum, data: any) {
    userIds.forEach((userId) => {
      this.server.to(userId).emit(event, data);
    });
  }

  /**
   * Send notification to a single user
   */
  sendToUser(userId: string, event: NotificationEventsEnum, data: any) {
    this.server.to(userId).emit(event, data);
  }

  /**
   * Send notification to all admins
   */
  sendToAdmins(event: NotificationEventsEnum, data: any) {
    this.server.to(ADMIN_ROOM).emit(event, data);
  }

  /**
   * Broadcast notification to all connected users
   */
  broadcast(event: NotificationEventsEnum, data: any) {
    this.server.emit(event, data);
  }
}
