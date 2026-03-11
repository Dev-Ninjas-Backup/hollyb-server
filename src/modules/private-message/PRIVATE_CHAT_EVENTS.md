# Private Chat WebSocket Gateway Documentation

**Namespace:** `/pv/message`  
**Authentication:** JWT Bearer token required in `authorization` header or `auth.token`

## Connection

```javascript
// Using Socket.IO client
const socket = io('http://localhost:5056/pv/message', {
  extraHeaders: {
    authorization: 'Bearer YOUR_JWT_TOKEN'
  }
});

// OR using auth object
const socket = io('http://localhost:5056/pv/message', {
  auth: {
    token: 'Bearer YOUR_JWT_TOKEN'
  }
});
```

---

## Events Overview

| Client Emit Event | Server Response Event | Description |
|-------------------|----------------------|-------------|
| *(on connect)* | `private:connected` | Connection established |
| *(on connect)* | `private:conversation_list` | Auto-sends conversation list |
| `private:load_conversations` | `private:conversation_list` | Load all conversations |
| `private:load_single_conversation` | `private:conversation_messages` | Load conversation with messages |
| `private:load_more_messages` | `private:conversation_messages` | Paginated message loading |
| `private:send_message` | `private:message_sent`, `private:new_message` | Send a message |
| `private:mark_conversation_read` | `private:messages_read`, `private:conversation_list` | Mark all messages as read |
| `private:mark_read` | `private:messages_read` | Mark single message as read |
| `private:typing_start` | `private:user_typing` | Start typing indicator |
| `private:typing_stop` | `private:user_stop_typing` | Stop typing indicator |
| `private:unread_count` | `private:unread_count` | Get unread message counts |

---

## Events Detail

### 1. Connection Events

#### `private:connected` (Server → Client)
Emitted immediately after successful connection and authentication.

**Output:**
```json
{
  "userId": "a676ad5a-b549-41e2-b27c-1189cf88236d",
  "socketId": "socket_id_here",
  "message": "Connected successfully",
  "unreadCount": 5
}
```

#### `private:error` (Server → Client)
Emitted when any error occurs.

**Output:**
```json
{
  "event": "private:send_message",
  "message": "Error description"
}
```

---

### 2. Conversation Events

#### `private:load_conversations` (Client → Server)
Request to load all conversations for the authenticated user.

**Input:** None (no payload required)

**Listener:** `private:conversation_list`

---

#### `private:conversation_list` (Server → Client)
Response containing list of conversations.

**Output:**
```json
[
  {
    "type": "private",
    "conversationId": "conv-uuid-here",
    "participant": {
      "id": "user-uuid",
      "full_name": "John Doe",
      "email": "john@example.com",
      "updated_at": "2026-02-19T09:15:00.000Z"
    },
    "lastMessage": {
      "id": "msg-uuid",
      "content": "Hello!",
      "type": "TEXT",
      "updatedAt": "2026-02-19T10:30:00.000Z",
      "createdAt": "2026-02-19T10:30:00.000Z",
      "sender": {
        "id": "user-uuid",
        "full_name": "John Doe",
        "email": "john@example.com",
        "updated_at": "2026-02-19T09:15:00.000Z"
      },
      "file": null,
      "status": "READ"
    },
    "unreadCount": 2,
    "status": "ACTIVE",
    "updatedAt": "2026-02-19T10:30:00.000Z",
    "createdAt": "2026-02-18T08:00:00.000Z"
  }
]
```

---

#### `private:load_single_conversation` (Client → Server)
Request to load a specific conversation with its messages.

**Input:**
```json
{
  "conversationId": "conv-uuid-here",
  "limit": 50,
  "cursor": "optional-message-id-for-pagination"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID | ✅ Yes | The conversation ID |
| `limit` | number | No | Number of messages (default: 50) |
| `cursor` | UUID | No | Message ID to load messages before (for pagination) |

**Listener:** `private:conversation_messages`

---

#### `private:conversation_messages` (Server → Client)
Response containing conversation details with messages.

**Output:**
```json
{
  "conversationId": "conv-uuid-here",
  "participant": {
    "id": "other-user-uuid",
    "full_name": "Jane Doe",
    "email": "jane@example.com"
  },
  "participants": [
    {
      "id": "user-uuid-1",
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    {
      "id": "user-uuid-2",
      "full_name": "Jane Doe",
      "email": "jane@example.com"
    }
  ],
  "messages": [
    {
      "id": "msg-uuid",
      "content": "Hello!",
      "type": "TEXT",
      "createdAt": "2026-02-19T10:30:00.000Z",
      "sender": {
        "id": "user-uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "file": null,
      "isMine": true,
      "statuses": [
        { "userId": "user-uuid-1", "status": "READ" },
        { "userId": "user-uuid-2", "status": "DELIVERED" }
      ]
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "oldest-message-id-in-batch"
  }
}
```

---

#### `private:load_more_messages` (Client → Server)
Request to load more messages (pagination). Uses same input/output as `private:load_single_conversation`.

**Input:**
```json
{
  "conversationId": "conv-uuid-here",
  "limit": 50,
  "cursor": "last-message-id-from-previous-batch"
}
```

**Listener:** `private:conversation_messages`

---

#### `private:new_conversation` (Server → Client)
Emitted to recipient when a new conversation is created (first message sent).

**Output:**
```json
{
  "conversationId": "new-conv-uuid",
  "participant": {
    "id": "sender-user-uuid",
    "full_name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### 3. Message Events

#### `private:send_message` (Client → Server)
Send a message to another user.

**Input:**
```json
{
  "recipientId": "recipient-user-uuid",
  "content": "Hello, how are you?",
  "type": "TEXT",
  "fileId": "optional-file-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipientId` | UUID | ✅ Yes | The recipient's user ID |
| `content` | string | ✅ for TEXT | Message text content |
| `type` | enum | No | `TEXT` (default), `IMAGE`, `VIDEO`, `AUDIO`, `FILE`, `CALL_EVENT` |
| `fileId` | UUID | ✅ for media | Required when type is not TEXT |

**Listeners:** 
- `private:message_sent` (to sender only)
- `private:new_message` (to both sender and recipient)
- `private:conversation_list` (to both sender and recipient)

---

#### `private:message_sent` (Server → Client)
Confirmation sent to sender after message is created.

**Output:**
```json
{
  "success": true,
  "message": {
    "id": "new-msg-uuid",
    "content": "Hello!",
    "type": "TEXT",
    "conversationId": "conv-uuid",
    "recipientId": "recipient-uuid",
    "createdAt": "2026-02-19T10:30:00.000Z",
    "sender": {
      "id": "sender-uuid",
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "file": null
  }
}
```

---

#### `private:new_message` (Server → Client)
Emitted to both sender and recipient when a new message is sent.

**Output:**
```json
{
  "id": "msg-uuid",
  "content": "Hello!",
  "type": "TEXT",
  "conversationId": "conv-uuid",
  "recipientId": "recipient-uuid",
  "createdAt": "2026-02-19T10:30:00.000Z",
  "sender": {
    "id": "sender-uuid",
    "full_name": "John Doe",
    "email": "john@example.com"
  },
  "file": {
    "id": "file-uuid",
    "filename": "image.jpg",
    "originalFilename": "my-photo.jpg",
    "url": "https://storage.example.com/image.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "fileType": "image"
  }
}
```

---

### 4. Read Receipt Events

#### `private:mark_conversation_read` (Client → Server)
Mark all messages in a conversation as read.

**Input:**
```json
{
  "conversationId": "conv-uuid-here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID | ✅ Yes | The conversation ID |

**Listeners:**
- `private:messages_read` (to the other participant)
- `private:conversation_list` (to the sender)

---

#### `private:mark_read` (Client → Server)
Mark a single message as read.

**Input:**
```json
{
  "messageId": "msg-uuid-here",
  "conversationId": "conv-uuid-here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messageId` | UUID | ✅ Yes | The message ID to mark as read |
| `conversationId` | UUID | No | Conversation ID (for notifying other user) |

**Listener:** `private:messages_read` (to the message sender)

---

#### `private:messages_read` (Server → Client)
Emitted to notify that messages have been read.

**Output:**
```json
{
  "conversationId": "conv-uuid",
  "readBy": "reader-user-uuid",
  "messagesRead": 5,
  "messageId": "specific-msg-uuid"
}
```

---

### 5. Typing Indicators

#### `private:typing_start` (Client → Server)
Notify that user started typing.

**Input:**
```json
{
  "conversationId": "conv-uuid-here",
  "recipientId": "recipient-user-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID | ✅ Yes | The conversation ID |
| `recipientId` | UUID | ✅ Yes | The recipient's user ID |

**Listener:** `private:user_typing` (to recipient)

---

#### `private:user_typing` (Server → Client)
Emitted to recipient when someone is typing.

**Output:**
```json
{
  "conversationId": "conv-uuid",
  "userId": "typing-user-uuid"
}
```

---

#### `private:typing_stop` (Client → Server)
Notify that user stopped typing.

**Input:**
```json
{
  "conversationId": "conv-uuid-here",
  "recipientId": "recipient-user-uuid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conversationId` | UUID | ✅ Yes | The conversation ID |
| `recipientId` | UUID | ✅ Yes | The recipient's user ID |

**Listener:** `private:user_stop_typing` (to recipient)

---

#### `private:user_stop_typing` (Server → Client)
Emitted to recipient when someone stops typing.

**Output:**
```json
{
  "conversationId": "conv-uuid",
  "userId": "typing-user-uuid"
}
```

---

### 6. Unread Count

#### `private:unread_count` (Client → Server)
Request unread message counts.

**Input:** None (no payload required)

**Listener:** `private:unread_count`

---

#### `private:unread_count` (Server → Client)
Response containing unread counts.

**Output:**
```json
{
  "total": 15,
  "perConversation": {
    "conv-uuid-1": 5,
    "conv-uuid-2": 10
  }
}
```

---

## Message Types

| Type | Description | Requires |
|------|-------------|----------|
| `TEXT` | Text message | `content` |
| `IMAGE` | Image attachment | `fileId` |
| `VIDEO` | Video attachment | `fileId` |
| `AUDIO` | Audio attachment | `fileId` |
| `FILE` | Generic file attachment | `fileId` |
| `CALL_EVENT` | Call-related event | `fileId` |

---

## Message Delivery Status

| Status | Description |
|--------|-------------|
| `SENT` | Message sent but recipient not online |
| `DELIVERED` | Message delivered to recipient's device |
| `READ` | Message has been read by recipient |

---

## Error Handling

All errors are emitted via `private:error` event:

```json
{
  "event": "private:send_message",
  "message": "recipientId is required"
}
```

Common errors:
- `User not authenticated` - Invalid or missing JWT
- `recipientId is required` - Missing recipient in send message
- `content is required for text messages` - Missing content for TEXT type
- `fileId is required for media messages` - Missing fileId for media types
- `Cannot send message to yourself` - Self-messaging attempt
- `conversationId is required` - Missing conversation ID
- `Conversation not found or access denied` - Invalid conversation access

---

## Example Client Implementation

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5056/pv/message', {
  auth: { token: 'Bearer YOUR_JWT_TOKEN' }
});

// Connection events
socket.on('private:connected', (data) => {
  console.log('Connected:', data.userId, 'Unread:', data.unreadCount);
});

socket.on('private:conversation_list', (conversations) => {
  console.log('Conversations:', conversations);
});

socket.on('private:new_message', (message) => {
  console.log('New message:', message);
});

socket.on('private:error', (error) => {
  console.error('Error:', error.event, error.message);
});

// Send a message
socket.emit('private:send_message', {
  recipientId: 'recipient-user-uuid',
  content: 'Hello!',
  type: 'TEXT'
});

// Load a conversation
socket.emit('private:load_single_conversation', {
  conversationId: 'conv-uuid',
  limit: 50
});

// Mark conversation as read
socket.emit('private:mark_conversation_read', {
  conversationId: 'conv-uuid'
});

// Typing indicators
socket.emit('private:typing_start', {
  conversationId: 'conv-uuid',
  recipientId: 'recipient-uuid'
});
```
