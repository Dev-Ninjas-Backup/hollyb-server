# Notification WebSocket Gateway Documentation

**Namespace:** `/notifications`\
**Authentication:** JWT Bearer token required in `authorization` header or `auth.token`

## Connection

```javascript
// Using Socket.IO client
const socket = io('http://localhost:5056/notifications', {
  extraHeaders: {
    authorization: 'Bearer YOUR_JWT_TOKEN'
  }
});

// OR using auth object
const socket = io('http://localhost:5056/notifications', {
  auth: {
    token: 'Bearer YOUR_JWT_TOKEN'
  }
});
```

***

## Events Overview

| Client Emit Event            | Server Response Event                            | Description                        |
| ---------------------------- | ------------------------------------------------ | ---------------------------------- |
| *(on connect)*               | `notification:connected`                         | Connection established             |
| *(on connect)*               | `notification:list`                              | Auto-sends notification list       |
| `notification:load`          | `notification:list`                              | Load notifications with pagination |
| `notification:load_more`     | `notification:list`                              | Load more notifications            |
| `notification:mark_read`     | `notification:read`, `notification:unread_count` | Mark notification(s) as read       |
| `notification:mark_all_read` | `notification:read`, `notification:unread_count` | Mark all notifications as read     |
| `notification:delete`        | `notification:deleted`                           | Delete a notification              |
| *(server initiated)*         | `notification:new`                               | New notification received          |
| *(server initiated)*         | `notification:unread_count`                      | Unread count update                |

***

## Events Detail

### 1. Connection Events

#### `notification:connected` (Server → Client)

Emitted immediately after successful connection and authentication.

**Output:**

```json
{
  "userId": "a676ad5a-b549-41e2-b27c-1189cf88236d",
  "socketId": "socket_id_here",
  "message": "Connected to notification service",
  "unreadCount": 5
}
```

**Description:**

* User is automatically joined to their personal room (using `userId`)

* Admin users are additionally joined to `admin_room` for admin-specific notifications

* Initial notification list is sent automatically after connection

***

#### `notification:error` (Server → Client)

Emitted when any error occurs during notification operations.

**Output:**

```json
{
  "message": "Error description"
}
```

***

#### `notification:success` (Server → Client)

Emitted when a notification operation succeeds.

**Output:**

```json
{
  "message": "Operation successful"
}
```

***

### 2. Notification List Events

#### `notification:load` (Client → Server)

Request to load notifications with pagination.

**Input:**

```json
{
  "page": 1,
  "limit": 20
}
```

| Field   | Type   | Required | Description                  |
| ------- | ------ | -------- | ---------------------------- |
| `page`  | number | No       | Page number (default: 1)     |
| `limit` | number | No       | Items per page (default: 20) |

**Listener:** `notification:list`

***

#### `notification:load_more` (Client → Server)

Request to load more notifications (same as `notification:load`).

**Input:**

```json
{
  "page": 2,
  "limit": 20
}
```

**Listener:** `notification:list`

***

#### `notification:list` (Server → Client)

Response containing paginated list of notifications.

**Output:**

```json
{
  "data": [
    {
      "id": "notif-uuid",
      "userNotificationId": "user-notif-uuid",
      "type": "user_created",
      "title": "New User Registered",
      "message": "A new employee user \"John Doe\" (john@example.com) has registered.",
      "meta": {
        "userId": "user-uuid",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "userRole": "employee",
        "timestamp": "2026-02-19T10:30:00.000Z"
      },
      "read": false,
      "createdAt": "2026-02-19T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

***

### 3. Real-time Notification Events

#### `notification:new` (Server → Client)

Emitted to user(s) when a new notification is created for them.

**Output:**

```json
{
  "id": "notif-uuid",
  "type": "job_applied",
  "title": "New Job Application",
  "message": "Jane Doe has applied for your job posting 'Waiter Position'",
  "meta": {
    "jobId": "job-uuid",
    "jobTitle": "Waiter Position",
    "applicantId": "user-uuid",
    "applicantName": "Jane Doe",
    "timestamp": "2026-02-19T10:30:00.000Z"
  },
  "read": false,
  "createdAt": "2026-02-19T10:30:00.000Z"
}
```

**Description:**

* Sent automatically to targeted users when notifications are created

* Multiple users can receive the same notification

* Admin-specific notifications are sent to all users in `admin_room`

***

### 4. Read/Unread Events

#### `notification:mark_read` (Client → Server)

Mark one or more notifications as read.

**Input:**

```json
{
  "notificationIds": ["notif-uuid-1", "notif-uuid-2"]
}
```

| Field             | Type    | Required | Description                               |
| ----------------- | ------- | -------- | ----------------------------------------- |
| `notificationIds` | UUID\[] | ✅ Yes    | Array of notification IDs to mark as read |

**Listeners:**

* `notification:read` (confirmation)

* `notification:unread_count` (updated count)

***

#### `notification:read` (Server → Client)

Confirmation that notification(s) have been marked as read.

**Output (for specific notifications):**

```json
{
  "notificationIds": ["notif-uuid-1", "notif-uuid-2"],
  "success": true
}
```

**Output (for mark all read):**

```json
{
  "all": true,
  "success": true
}
```

***

#### `notification:mark_all_read` (Client → Server)

Mark all notifications as read for the authenticated user.

**Input:** None (no payload required)

**Listeners:**

* `notification:read` (confirmation)

* `notification:unread_count` (count set to 0)

***

#### `notification:unread_count` (Server → Client)

Response containing unread notification count.

**Output:**

```json
{
  "count": 5
}
```

**Description:**

* Automatically sent after connection

* Automatically sent after marking notifications as read

* Can be requested at any time

* Updates in real-time when new notifications arrive

***

### 5. Delete Events

#### `notification:delete` (Client → Server)

Delete a notification for the authenticated user.

**Input:**

```json
{
  "notificationId": "notif-uuid"
}
```

| Field            | Type | Required | Description                   |
| ---------------- | ---- | -------- | ----------------------------- |
| `notificationId` | UUID | ✅ Yes    | The notification ID to delete |

**Listener:** `notification:deleted`

***

#### `notification:deleted` (Server → Client)

Confirmation that notification has been deleted.

**Output:**

```json
{
  "notificationId": "notif-uuid",
  "success": true
}
```

***

### 6. Admin-Specific Events

#### `notification:user_created` (Server → Admin)

Emitted to all admins when a new user registers.

**Output:**

```json
{
  "userId": "user-uuid",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "userRole": "employee",
  "message": "New employee registered: John Doe",
  "timestamp": "2026-02-19T10:30:00.000Z"
}
```

**Description:**

* Only sent to users in `admin_room` (users with role `admin`)

* Sent in addition to the regular `notification:new` event

* Provides immediate real-time notification to admins

***

#### `notification:user_verified` (Server → Admin)

Emitted to all admins when a user verifies their account.

**Output:**

```json
{
  "userId": "user-uuid",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "userRole": "employee",
  "message": "User verified: John Doe",
  "timestamp": "2026-02-19T10:30:00.000Z"
}
```

***

#### `notification:subscription_success` (Server → Admin)

Emitted to all admins when a user successfully subscribes or renews their subscription.

**Output:**

```json
{
  "userId": "user-uuid",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "userRole": "employee",
  "planType": "employee_premium",
  "message": "John Doe activated employee_premium subscription",
  "timestamp": "2026-02-19T10:30:00.000Z",
  "isRenewal": false
}
```

***

## New Notification Flows

### 1. Subscription Success Notifications

**When:** Employee or Employer successfully subscribes or renews a subscription

**Recipients:**

* The user who subscribed (confirmation)

* All SuperAdmins (for monitoring)

**Notification Details:**

**To User:**

```json
{
  "type": "subscription_activated",
  "title": "Subscription activated",
  "message": "Your employee_premium subscription has been successfully activated. You now have full access to all features.",
  "meta": {
    "userId": "user-uuid",
    "planType": "employee_premium",
    "timestamp": "2026-03-10T10:30:00.000Z",
    "isRenewal": false
  }
}
```

**To Admins:**

```json
{
  "type": "subscription_activated",
  "title": "User Subscription activated",
  "message": "employee user \"John Doe\" (john@example.com) has activated their employee_premium subscription.",
  "meta": {
    "userId": "user-uuid",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "userRole": "employee",
    "planType": "employee_premium",
    "timestamp": "2026-03-10T10:30:00.000Z",
    "isRenewal": false
  }
}
```

***

### 2. Employee Assignment Notification

**When:** Employer accepts a job application and assigns an employee to a job

**Recipients:**

* The assigned employee

**Notification Details:**

```json
{
  "type": "job_assigned",
  "title": "Job Assignment",
  "message": "You have been assigned to \"Waiter Position\" by John's Restaurant. Please prepare for your upcoming shift.",
  "meta": {
    "jobId": "job-uuid",
    "jobTitle": "Waiter Position",
    "employerName": "John's Restaurant",
    "timestamp": "2026-03-10T10:30:00.000Z"
  }
}
```

**Frontend Action:**

* Show notification toast/alert

* Update job status in UI

* Navigate to job details if notification clicked

***

### 3. Job Starting Soon Notification

**When:** Automated scheduler detects a job starting within 30 minutes (runs every 5 minutes)

**Recipients:**

* The assigned employee

**Notification Details:**

```json
{
  "type": "job_starting_soon",
  "title": "Job Starting Soon",
  "message": "Your job \"Waiter Position\" is starting soon. Please be ready to check in.",
  "meta": {
    "jobId": "job-uuid",
    "jobTitle": "Waiter Position",
    "startTime": "2026-03-10T14:00:00.000Z",
    "timestamp": "2026-03-10T13:30:00.000Z"
  }
}
```

**Frontend Action:**

* Show push notification or in-app alert

* Display countdown timer

* Provide quick access to check-in screen

**Note:** To enable this feature:

1. Install `@nestjs/schedule` package: `pnpm install @nestjs/schedule`
2. Uncomment the scheduler in `notification.module.ts`
3. The scheduler checks every 5 minutes for jobs starting 25-35 minutes from now

***

### 4. Job Completion Notification

**When:** Employee marks a job as complete

**Recipients:**

* The employer who posted the job

**Notification Details:**

```json
{
  "type": "job_completed",
  "title": "Job Completed",
  "message": "Jane Doe has completed the job \"Waiter Position\". You can now review and process payment.",
  "meta": {
    "jobId": "job-uuid",
    "jobTitle": "Waiter Position",
    "employeeName": "Jane Doe",
    "timestamp": "2026-03-10T18:00:00.000Z"
  }
}
```

**Frontend Action:**

* Show notification to employer

* Prompt for payment processing

* Provide quick access to review screen

***

## Admin-Specific Events

### `notification:user_created` (Server → Admin)

Emitted to all admins when a new user registers.

**Output:**

```json
{
  "userId": "user-uuid",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "userRole": "employee",
  "message": "New employee registered: John Doe",
  "timestamp": "2026-02-19T10:30:00.000Z"
}
```

**Description:**

* Only sent to users in `admin_room` (users with role `admin`)

* Sent in addition to the regular `notification:new` event

* Provides immediate real-time notification to admins

***

| Type                     | Description                         | Typical Recipients               |
| ------------------------ | ----------------------------------- | -------------------------------- |
| `user_created`           | New user registered                 | Admins                           |
| `user_verified`          | User verified account               | Admins                           |
| `user_updated`           | User profile updated                | User, Admins                     |
| `subscription_activated` | Subscription successfully activated | User, Admins                     |
| `subscription_renewed`   | Subscription successfully renewed   | User, Admins                     |
| `job_created`            | New job posted                      | Employees (matching criteria)    |
| `job_update`             | Job details updated                 | Job applicants, assigned workers |
| `job_applied`            | User applied for job                | Employer                         |
| `job_assigned`           | Employee assigned to job            | Employee                         |
| `job_accepted`           | Job application accepted            | Employee                         |
| `job_rejected`           | Job application rejected            | Employee                         |
| `job_starting_soon`      | Job starting within 30 minutes      | Assigned Employee                |
| `job_completed`          | Job completed                       | Employer                         |
| `message`                | Generic message                     | Specific user(s)                 |
| `new_message`            | New chat message                    | Recipient                        |
| `payment`                | Generic payment notification        | User                             |
| `payment_received`       | Payment received                    | Recipient                        |
| `payment_sent`           | Payment sent                        | Sender                           |
| `review`                 | Generic review notification         | User                             |
| `new_review`             | New review posted                   | Reviewed user                    |
| `system`                 | System notification                 | All users or specific users      |
| `system_alert`           | Critical system alert               | All users                        |
| `account_status`         | Account status change               | User                             |

***

## User Roles & Rooms

### Personal Room

Every connected user automatically joins a room identified by their `userId`:

```javascript
// Server-side (automatic)
client.join(userId);

// Notifications sent to specific user
server.to(userId).emit('notification:new', notification);
```

### Admin Room

Admin users automatically join the `admin_room` for admin-specific notifications:

```javascript
// Server-side (automatic for admins)
if (user.role === UserRole.admin) {
  client.join('admin_room');
}

// Notifications sent to all admins
server.to('admin_room').emit('notification:user_created', data);
```

***

## Notification Flow

### Creating and Sending Notifications

```typescript
// Server-side (from any service)
await notificationService.createNotification({
  type: 'job_applied',
  title: 'New Job Application',
  message: 'Jane Doe has applied for your job posting',
  meta: {
    jobId: 'job-uuid',
    applicantId: 'user-uuid',
    // ... additional data
  },
  userIds: ['employer-uuid'] // Recipients
});
```

**What happens:**

1. Notification record created in database
2. UserNotification records created for each recipient
3. `notification:new` event emitted to all online recipients
4. Recipients' unread counts automatically updated

***

## Complete Client Example

```javascript
const socket = io('http://localhost:5056/notifications', {
  auth: { token: 'Bearer YOUR_JWT_TOKEN' }
});

// Connection established
socket.on('notification:connected', (data) => {
  console.log('Connected:', data);
  // { userId, socketId, message, unreadCount }
});

// Initial notification list
socket.on('notification:list', (data) => {
  console.log('Notifications:', data);
  // { data: [...], pagination: {...} }
});

// New notification received
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Show toast/alert to user
  // Update UI notification count
});

// Unread count update
socket.on('notification:unread_count', (data) => {
  console.log('Unread count:', data.count);
  // Update badge/counter in UI
});

// Load more notifications
socket.emit('notification:load', { page: 2, limit: 20 });

// Mark notification as read
socket.emit('notification:mark_read', {
  notificationIds: ['notif-uuid-1', 'notif-uuid-2']
});

// Mark all as read
socket.emit('notification:mark_all_read');

// Delete notification
socket.emit('notification:delete', {
  notificationId: 'notif-uuid'
});

// Listen for confirmations
socket.on('notification:read', (data) => {
  console.log('Marked as read:', data);
});

socket.on('notification:deleted', (data) => {
  console.log('Deleted:', data);
});

// Error handling
socket.on('notification:error', (error) => {
  console.error('Notification error:', error.message);
});

// Admin-specific events (only for admin users)
socket.on('notification:user_created', (data) => {
  console.log('New user registered:', data);
  // Show admin alert
});

socket.on('notification:user_verified', (data) => {
  console.log('User verified:', data);
});
```

***

## Error Handling

All errors are emitted via `notification:error` event:

```json
{
  "message": "Failed to load notifications"
}
```

***

## Complete Frontend Integration Guide

### Basic Setup

```javascript
import { io } from 'socket.io-client';

// Initialize socket connection
const notificationSocket = io('http://localhost:5056/notifications', {
  auth: {
    token: 'Bearer YOUR_JWT_TOKEN'
  }
});

// Connection handlers
notificationSocket.on('connect', () => {
  console.log('Connected to notification service');
});

notificationSocket.on('disconnect', () => {
  console.log('Disconnected from notification service');
});

notificationSocket.on('notification:connected', (data) => {
  console.log('Notification service ready:', data);
  // Update UI with unread count: data.unreadCount
});
```

***

### Listening to New Notifications

```javascript
// Listen for all notification types
notificationSocket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  
  // Show toast/alert based on notification type
  switch (notification.type) {
    case 'subscription_activated':
    case 'subscription_renewed':
      showSuccessToast(notification.title, notification.message);
      break;
      
    case 'job_assigned':
      showInfoToast(notification.title, notification.message);
      // Optionally navigate to job details
      navigateToJob(notification.meta.jobId);
      break;
      
    case 'job_starting_soon':
      showUrgentAlert(notification.title, notification.message);
      // Show countdown or check-in button
      showCheckInPrompt(notification.meta.jobId);
      break;
      
    case 'job_completed':
      showSuccessToast(notification.title, notification.message);
      // Prompt employer to review and pay
      if (userRole === 'employer') {
        promptForReview(notification.meta.jobId);
      }
      break;
      
    default:
      showNotification(notification.title, notification.message);
  }
  
  // Update notification list in UI
  addNotificationToList(notification);
  
  // Play notification sound
  playNotificationSound();
  
  // Update badge count
  incrementNotificationBadge();
});
```

***

### Managing Notification Badges

```javascript
// Listen for unread count updates
notificationSocket.on('notification:unread_count', (data) => {
  updateNotificationBadge(data.count);
});

// Mark single notification as read
function markAsRead(notificationId) {
  notificationSocket.emit('notification:mark_read', {
    notificationIds: [notificationId]
  });
}

// Mark multiple notifications as read
function markMultipleAsRead(notificationIds) {
  notificationSocket.emit('notification:mark_read', {
    notificationIds: notificationIds
  });
}

// Mark all as read
function markAllAsRead() {
  notificationSocket.emit('notification:mark_all_read');
}

// Listen for read confirmation
notificationSocket.on('notification:read', (data) => {
  if (data.all) {
    // All notifications marked as read
    clearAllNotificationBadges();
  } else {
    // Specific notifications marked as read
    updateReadStatus(data.notificationIds);
  }
});
```

***

### Loading Notification History

```javascript
// Load notifications with pagination
function loadNotifications(page = 1, limit = 20) {
  notificationSocket.emit('notification:load', { page, limit });
}

// Listen for notification list
notificationSocket.on('notification:list', (response) => {
  const { data, pagination } = response;
  
  // Update UI with notifications
  renderNotifications(data);
  
  // Update pagination
  updatePagination(pagination);
});
```

***

### Deleting Notifications

```javascript
function deleteNotification(notificationId) {
  notificationSocket.emit('notification:delete', {
    notificationId: notificationId
  });
}

notificationSocket.on('notification:deleted', (data) => {
  if (data.success) {
    removeNotificationFromUI(data.notificationId);
  }
});
```

***

### Admin-Specific Notifications

```javascript
// Only for admin users
if (userRole === 'admin') {
  // Listen for new user registrations
  notificationSocket.on('notification:user_created', (data) => {
    showAdminAlert(`New ${data.userRole} registered: ${data.userName}`);
    // Update admin dashboard
    updateUserStats();
  });
  
  // Listen for subscription events
  notificationSocket.on('notification:subscription_success', (data) => {
    const action = data.isRenewal ? 'renewed' : 'activated';
    showAdminNotification(
      `${data.userName} ${action} ${data.planType} subscription`
    );
    // Update revenue dashboard
    updateSubscriptionStats();
  });
}
```

***

### Error Handling

```javascript
notificationSocket.on('notification:error', (error) => {
  console.error('Notification error:', error.message);
  showErrorToast('Notification Error', error.message);
});

// Reconnection handling
notificationSocket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected to notification service');
  // Reload notifications
  loadNotifications();
});

notificationSocket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error);
});
```

***

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  meta: any;
  read: boolean;
  createdAt: Date;
}

export function useNotifications(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const notificationSocket = io('http://localhost:5056/notifications', {
      auth: { token: `Bearer ${token}` }
    });

    notificationSocket.on('connect', () => setConnected(true));
    notificationSocket.on('disconnect', () => setConnected(false));

    notificationSocket.on('notification:connected', (data) => {
      setUnreadCount(data.unreadCount);
    });

    notificationSocket.on('notification:list', (response) => {
      setNotifications(response.data);
    });

    notificationSocket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Show toast notification
      showToast(notification.title, notification.message);
    });

    notificationSocket.on('notification:unread_count', (data) => {
      setUnreadCount(data.count);
    });

    setSocket(notificationSocket);

    return () => {
      notificationSocket.disconnect();
    };
  }, [token]);

  const markAsRead = (notificationIds: string[]) => {
    socket?.emit('notification:mark_read', { notificationIds });
  };

  const markAllAsRead = () => {
    socket?.emit('notification:mark_all_read');
  };

  const deleteNotification = (notificationId: string) => {
    socket?.emit('notification:delete', { notificationId });
  };

  const loadMore = (page: number) => {
    socket?.emit('notification:load', { page, limit: 20 });
  };

  return {
    connected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore
  };
}
```

***

## Testing Notifications

### 1. Test Subscription Notification

```bash
# Subscribe as employee or employer
curl -X POST http://localhost:5056/subscription/direct-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "employee_premium",
    "paymentMethodId": "pm_xxx"
  }'

# Expected: User and all admins receive notification
```

### 2. Test Employee Assignment

```bash
# Accept job application as employer
curl -X PATCH http://localhost:5056/employer/applications/:applicationId/accept \
  -H "Authorization: Bearer EMPLOYER_TOKEN"

# Expected: Assigned employee receives notification
```

### 3. Test Job Starting Soon

```bash
# Create a job with start time 30 minutes from now
# Wait for scheduler (runs every 5 minutes)
# Expected: Assigned employee receives notification 30 mins before start
```

### 4. Test Job Completion

```bash
# Mark job as complete as employee
curl -X POST http://localhost:5056/employee/jobs/:jobId/mark-as-complete \
  -H "Authorization: Bearer EMPLOYEE_TOKEN"

# Expected: Employer receives completion notification
```

***

## Setup Instructions

### Backend Setup

1. **Install Schedule Package (for job start notifications)**

   ```bash
   pnpm install @nestjs/schedule
   ```

2. **Enable Scheduler**

   * Open `src/modules/notification/notification.module.ts`

   * Uncomment `ScheduleModule.forRoot()` in imports

   * Uncomment `JobNotificationScheduler` in providers

3. **Verify Socket.IO Server is Running**

   * The notification gateway runs on namespace `/notifications`

   * Ensure WebSocket server is accessible

### Frontend Setup

1. **Install Socket.IO Client**

   ```bash
   npm install socket.io-client
   # or
   yarn add socket.io-client
   # or
   pnpm add socket.io-client
   ```

2. **Connect to Notification Service**

   * Use the connection examples above

   * Pass JWT token in auth or extraHeaders

   * Listen for relevant events based on user role

3. **Handle Notification Types**

   * Implement UI components for different notification types

   * Show appropriate alerts/toasts for urgent notifications

   * Provide quick actions (navigate to job, mark as read, etc.)

***

## Best Practices

1. **Authentication**

   * Always include JWT token when connecting

   * Reconnect with new token if it expires

   * Handle authentication errors gracefully

2. **Performance**

   * Load notifications with pagination (20 per page recommended)

   * Mark notifications as read when viewed

   * Delete old notifications to keep database clean

3. **User Experience**

   * Show visual indicators for unread notifications

   * Play sounds for important notifications (job starting soon)

   * Provide push notifications for mobile apps

   * Allow users to mute/customize notification preferences

4. **Error Handling**

   * Handle socket disconnections

   * Implement retry logic with exponential backoff

   * Show offline indicators when disconnected

   * Queue notifications when offline and sync when reconnected

5. **Admin Monitoring**

   * Admins should see all user lifecycle events

   * Track subscription events for revenue monitoring

   * Monitor system health via notification delivery rates

***

**Common Error Scenarios:**

* Authentication failure → Socket disconnected by middleware

* Invalid notification ID → Error emitted

* Database operation failure → Error emitted

* Missing required fields → Error emitted

***

## Best Practices

### Client-Side

1. **Connection Management**

   * Reconnect automatically on disconnect

   * Store JWT token securely

   * Handle reconnection on token refresh

2. **State Management**

   * Keep local unread count in sync

   * Update UI immediately on events

   * Cache notification list for offline access

3. **User Experience**

   * Show toast/alert for new notifications

   * Play sound for important notifications

   * Badge/counter for unread count

   * Pull-to-refresh for manual sync

4. **Performance**

   * Use pagination for large notification lists

   * Implement virtual scrolling for long lists

   * Debounce mark-as-read operations

### Server-Side

1. **Notification Creation**

   * Always include meaningful `meta` data

   * Use appropriate notification types

   * Target specific users when possible

   * Avoid spamming users with too many notifications

2. **Database**

   * Clean up old notifications periodically

   * Index `userId` and `read` fields

   * Use soft deletes for audit trail

3. **Real-time**

   * Check if user is online before emitting

   * Store notifications in DB even if user is offline

   * Use rooms efficiently for targeted notifications

***

## Security

* **Authentication:** JWT token required for connection (validated by middleware)

* **Authorization:** Users can only access their own notifications

* **Admin Access:** Admin room only accessible to users with `admin` role

* **Data Isolation:** Notifications are user-specific and properly filtered

* **Input Validation:** All client inputs are validated before processing

***

## Database Schema Reference

### Notification Table

```prisma
model Notification {
  id        String   @id @default(uuid())
  type      String
  title     String
  message   String
  meta      Json?
  createdAt DateTime @default(now())
  
  users     UserNotification[]
}
```

### UserNotification Table

```prisma
model UserNotification {
  id             String   @id @default(uuid())
  userId         String
  notificationId String
  read           Boolean  @default(false)
  createdAt      DateTime @default(now())
  
  user         User         @relation(...)
  notification Notification @relation(...)
}
```

***

## Troubleshooting

### Connection Issues

* Verify JWT token is valid and not expired

* Check if user account is active (`is_active: true`)

* Ensure CORS settings allow your origin

* Check server logs for authentication errors

### Notifications Not Received

* Verify user is connected (check `notification:connected` event)

* Check if notification was created for correct user IDs

* Verify WebSocket connection is stable

* Check server logs for emission errors

### Unread Count Incorrect

* Manually request count by disconnecting and reconnecting

* Check database for orphaned notifications

* Verify mark-as-read operations are completing successfully

***

## Testing

### Test Connection

```bash
# Using wscat
wscat -c "ws://localhost:5056/notifications" \
  -H "authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Events

```javascript
// After connection
socket.emit('notification:load', { page: 1, limit: 10 });
socket.emit('notification:mark_all_read');
```

***

## Version History

* **v1.0** (2026-02-19): Initial notification system implementation

  * Basic notification CRUD operations

  * Real-time notification delivery

  * Read/unread status management

  * Admin-specific notifications

  * Pagination support
