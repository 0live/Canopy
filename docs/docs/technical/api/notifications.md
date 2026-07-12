---
sidebar_position: 4
---

# Notifications

Persisted notifications with a real-time WebSocket channel. Source:
`app/core/notifications/`.

## Model

A `Notification` (table `app_data.notification`) has:

| Field        | Type                          | Notes                                  |
| ------------ | ----------------------------- | -------------------------------------- |
| `id`         | int                           | Primary key                            |
| `user_id`    | int                           | Owner (FK → user)                      |
| `type`       | `NotificationType`            | `INFO` / `SUCCESS` / `WARNING` / `ERROR` |
| `key`        | `NotificationKey` \| null     | `ROLES_CHANGED`, `DB_ACCESS_GIVEN`     |
| `payload`    | JSONB                         | Arbitrary context data                 |
| `is_read`    | bool                          | Read flag (indexed)                    |
| `created_at` | datetime                      | UTC                                    |

The `key` + `payload` let the frontend render a localized message rather than
storing prebuilt text (see `formatNotificationMessage` on the frontend).

## REST API

| Method | Path                              | Description                                     |
| ------ | --------------------------------- | ----------------------------------------------- |
| GET    | `/notifications`                  | Paginated list. Query: `skip`, `limit` (≤50 default 50), `unread_only`. Returns `PaginatedResponse[NotificationRead]`. |
| PATCH  | `/notifications/{id}/read`        | Mark a single notification as read.             |
| PATCH  | `/notifications/read-all`         | Mark all of the current user's as read.         |
| DELETE | `/notifications/{id}`             | Hard-delete one (204).                          |
| POST   | `/notifications/bulk-delete`      | Body `{ "notification_ids": [..] }`.            |

All routes are scoped to the current authenticated user.

## WebSocket

```
WS /api/notifications/ws-notifications
```

- Authenticated via `get_current_user_ws` (same JWT as REST).
- Managed by a `NotificationBroadcaster`; broadcasts use Redis pub/sub on
  `user:<id>` channels, so a message reaches the user regardless of which API
  worker holds the socket.
- Guardrails from `AppParameter`: max **5** concurrent connections per user,
  **300s** inactivity timeout, **256-byte** max inbound message size.

The frontend consumes this in
`features/userProfile/hooks/notifications/useNotificationWebSocket.ts` and keeps
an unread badge in a Zustand store.

## When notifications are emitted

Currently emitted for account/administration events, e.g. a user's roles being
changed (`ROLES_CHANGED`) or database access being granted (`DB_ACCESS_GIVEN`).
