# Notification WebSocket Gateway Documentation

**Namespace:** `/notifications`  
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

---

## Events Overview

| Client Emit Event | Server Response Event | Description |
|-------------------|----------------------|-------------|
| *(on connect)* | `notification:connected` | Connection established |
| *(on connect)* | `notification:list` | Auto-sends notification list |
| `notification:load` | `notification:list` | Load notifications with pagination |
| `notification:load_more` | `notification:list` | Load more notifications |
| `notification:mark_read` | `notification:read`, `notification:unread_count` | Mark notification(s) as read |
| `notification:mark_all_read` | `notification:read`, `notification:unread_count` | Mark all notifications as read |
| `notification:delete` | `notification:deleted` | Delete a notification |
| *(server initiated)* | `notification:new` | New notification received |
| *(server initiated)* | `notification:unread_count` | Unread count update |

---

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
- User is automatically joined to their personal room (using `userId`)
- Admin users are additionally joined to `admin_room` for admin-specific notifications
- Initial notification list is sent automatically after connection

---

#### `notification:error` (Server → Client)
Emitted when any error occurs during notification operations.

**Output:**
```json
{
  "message": "Error description"
}
```

---

#### `notification:success` (Server → Client)
Emitted when a notification operation succeeds.

**Output:**
```json
{
  "message": "Operation successful"
}
```

---

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |

**Listener:** `notification:list`

---

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

---

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

---

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
- Sent automatically to targeted users when notifications are created
- Multiple users can receive the same notification
- Admin-specific notifications are sent to all users in `admin_room`

---

### 4. Read/Unread Events

#### `notification:mark_read` (Client → Server)
Mark one or more notifications as read.

**Input:**
```json
{
  "notificationIds": ["notif-uuid-1", "notif-uuid-2"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notificationIds` | UUID[] | ✅ Yes | Array of notification IDs to mark as read |

**Listeners:**
- `notification:read` (confirmation)
- `notification:unread_count` (updated count)

---

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

---

#### `notification:mark_all_read` (Client → Server)
Mark all notifications as read for the authenticated user.

**Input:** None (no payload required)

**Listeners:**
- `notification:read` (confirmation)
- `notification:unread_count` (count set to 0)

---

#### `notification:unread_count` (Server → Client)
Response containing unread notification count.

**Output:**
```json
{
  "count": 5
}
```

**Description:**
- Automatically sent after connection
- Automatically sent after marking notifications as read
- Can be requested at any time
- Updates in real-time when new notifications arrive

---

### 5. Delete Events

#### `notification:delete` (Client → Server)
Delete a notification for the authenticated user.

**Input:**
```json
{
  "notificationId": "notif-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notificationId` | UUID | ✅ Yes | The notification ID to delete |

**Listener:** `notification:deleted`

---

#### `notification:deleted` (Server → Client)
Confirmation that notification has been deleted.

**Output:**
```json
{
  "notificationId": "notif-uuid",
  "success": true
}
```

---

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
- Only sent to users in `admin_room` (users with role `admin`)
- Sent in addition to the regular `notification:new` event
- Provides immediate real-time notification to admins

---

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

---

## Notification Types

| Type | Description | Typical Recipients |
|------|-------------|-------------------|
| `user_created` | New user registered | Admins |
| `user_verified` | User verified account | Admins |
| `user_updated` | User profile updated | User, Admins |
| `job_created` | New job posted | Employees (matching criteria) |
| `job_update` | Job details updated | Job applicants, assigned workers |
| `job_applied` | User applied for job | Employer |
| `job_accepted` | Job application accepted | Employee |
| `job_rejected` | Job application rejected | Employee |
| `job_completed` | Job completed | Employer, Employee |
| `message` | Generic message | Specific user(s) |
| `new_message` | New chat message | Recipient |
| `payment` | Generic payment notification | User |
| `payment_received` | Payment received | Recipient |
| `payment_sent` | Payment sent | Sender |
| `review` | Generic review notification | User |
| `new_review` | New review posted | Reviewed user |
| `system` | System notification | All users or specific users |
| `system_alert` | Critical system alert | All users |
| `account_status` | Account status change | User |

---

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

---

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

---

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

---

## Error Handling

All errors are emitted via `notification:error` event:

```json
{
  "message": "Failed to load notifications"
}
```

**Common Error Scenarios:**
- Authentication failure → Socket disconnected by middleware
- Invalid notification ID → Error emitted
- Database operation failure → Error emitted
- Missing required fields → Error emitted

---

## Best Practices

### Client-Side

1. **Connection Management**
   - Reconnect automatically on disconnect
   - Store JWT token securely
   - Handle reconnection on token refresh

2. **State Management**
   - Keep local unread count in sync
   - Update UI immediately on events
   - Cache notification list for offline access

3. **User Experience**
   - Show toast/alert for new notifications
   - Play sound for important notifications
   - Badge/counter for unread count
   - Pull-to-refresh for manual sync

4. **Performance**
   - Use pagination for large notification lists
   - Implement virtual scrolling for long lists
   - Debounce mark-as-read operations

### Server-Side

1. **Notification Creation**
   - Always include meaningful `meta` data
   - Use appropriate notification types
   - Target specific users when possible
   - Avoid spamming users with too many notifications

2. **Database**
   - Clean up old notifications periodically
   - Index `userId` and `read` fields
   - Use soft deletes for audit trail

3. **Real-time**
   - Check if user is online before emitting
   - Store notifications in DB even if user is offline
   - Use rooms efficiently for targeted notifications

---

## Security

- **Authentication:** JWT token required for connection (validated by middleware)
- **Authorization:** Users can only access their own notifications
- **Admin Access:** Admin room only accessible to users with `admin` role
- **Data Isolation:** Notifications are user-specific and properly filtered
- **Input Validation:** All client inputs are validated before processing

---

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

---

## Troubleshooting

### Connection Issues
- Verify JWT token is valid and not expired
- Check if user account is active (`is_active: true`)
- Ensure CORS settings allow your origin
- Check server logs for authentication errors

### Notifications Not Received
- Verify user is connected (check `notification:connected` event)
- Check if notification was created for correct user IDs
- Verify WebSocket connection is stable
- Check server logs for emission errors

### Unread Count Incorrect
- Manually request count by disconnecting and reconnecting
- Check database for orphaned notifications
- Verify mark-as-read operations are completing successfully

---

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

---

## Version History

- **v1.0** (2026-02-19): Initial notification system implementation
  - Basic notification CRUD operations
  - Real-time notification delivery
  - Read/unread status management
  - Admin-specific notifications
  - Pagination support
