---
sidebar_position: 2
---

# Database Models

Entity reference generated from the SQLModel definitions in `app/modules/*/models.py`
and `app/core/notifications/models.py`. All application tables live in the
`app_data` schema (per the init migration). Primary keys are **auto-increment
integers** (not UUIDs).

## User (`app_data.user`)

| Field                            | Type              | Notes                                   |
| -------------------------------- | ----------------- | --------------------------------------- |
| `id`                             | int (PK)          |                                         |
| `username`                       | str, unique       | index                                   |
| `email`                          | EmailStr, unique  | index                                   |
| `hashed_password`                | str               | bcrypt                                  |
| `is_verified`                    | bool              | email verified                          |
| `postgis_role_created`           | bool              | DB role activated                       |
| `verification_token`             | str \| null       | email verification                      |
| `db_activation_token`            | str \| null       | one-time, hashed at rest                |
| `db_activation_token_created_at` | datetime \| null  | 8h validity window                      |
| `roles`                          | `UserRole[]`      | **array** column (not a boolean flag)   |

There is **no `is_superuser`** — administrative power is the `ADMIN` role.

**`UserRole`** values: `ADMIN`, `USER`, `MANAGE_TEAMS`, `MANAGE_ATLASES_AND_MAPS`,
`LOAD_DATA`, `LOAD_ICONS`, `WITHDBACCESS`.

## Team (`app_data.team`)

| Field   | Type        | Notes         |
| ------- | ----------- | ------------- |
| `id`    | int (PK)    |               |
| `name`  | str, unique | index         |

Plus `AuditMixin` and `AccessPolicyMixin` (see below).

## Atlas (`app_data.atlas`)

| Field         | Type     | Notes           |
| ------------- | -------- | --------------- |
| `id`          | int (PK) |                 |
| `name`        | str, unique |              |
| `description` | text     |                 |

Plus `AuditMixin` and `AccessPolicyMixin`.

## Map (`app_data.map`)

| Field         | Type     | Notes                                  |
| ------------- | -------- | -------------------------------------- |
| `id`          | int (PK) |                                        |
| `name`        | str      | unique per `(atlas_id, name)`          |
| `description` | text     |                                        |
| `style`       | str      | MapLibre style (stored as a string)    |
| `atlas_id`    | int (FK) | → `atlas.id`, `ON DELETE CASCADE`      |

Plus `AuditMixin` and `AccessPolicyMixin`.

## Notification (`app_data.notification`)

| Field        | Type                 | Notes                              |
| ------------ | -------------------- | ---------------------------------- |
| `id`         | int (PK)             |                                    |
| `user_id`    | int (FK)             | → `user.id`, indexed               |
| `type`       | `NotificationType`   | INFO/SUCCESS/WARNING/ERROR         |
| `key`        | `NotificationKey`?   | ROLES_CHANGED / DB_ACCESS_GIVEN    |
| `payload`    | JSONB                | render context                     |
| `is_read`    | bool                 | indexed                            |
| `created_at` | datetime             |                                    |

## Auth tokens

**RefreshToken (`app_data.refreshtoken`)** — `id`, `user_id` (FK), `token_hash`
(hashed, indexed), `created_at`, `expires_at`, `revoked`. Enables server-side
revocation and rotation.

**PasswordResetToken (`app_data.passwordresettoken`)** — `id`, `user_id` (FK),
`token_hash`, `expires_at`, `used`. Single-use, short-lived.

Both store only a **hash** of the token, never the raw value.

## Link tables (many-to-many)

- **UserTeamLink** — `user_id` + `team_id` (composite PK, both cascade).
- **AtlasTeamLink** — `atlas_id` + `team_id` (composite PK) **plus permission
  flags**: `can_manage_atlas`, `can_create_maps`, `can_edit_maps`.

## Mixins

- **AuditMixin** (`app/core/mixins/audit_mixin.py`) — `created_at`, `updated_at`
  (server defaults + `onupdate`), `created_by_id`, `updated_by_id` (FK → user).
  Applied to Team, Atlas, Map.
- **AccessPolicyMixin** (`app/core/mixins/access_policy_mixin.py`) — an
  `access_policy` column of type `AccessPolicy`: `standard` (private, shareable
  to teams), `internal` (all registered users), `public` (everyone). Default
  `standard`.

## Relationships

```
User  ⇄  Team          (M2M via UserTeamLink)
Team  ⇄  Atlas         (M2M via AtlasTeamLink, with permission flags)
Atlas →  Map           (1-to-many, cascade delete)
User  →  Notification  (1-to-many, cascade delete)
User  →  RefreshToken / PasswordResetToken  (1-to-many)
```

:::note How every table ends up in `app_data`
`app/core/models.py` sets a **metadata-level default schema**
(`SQLModel.metadata.schema = "app_data"`). It is imported first at app startup
(`main.py`) and mirrored in `alembic/env.py`, so **all** tables default to
`app_data` — whether or not they re-declare it. `User` / `Team` / `Map` set the
schema explicitly in `__table_args__` (redundant with the default); `Atlas` /
`AtlasTeamLink` simply rely on the global default. Same result at runtime and in
migrations — it is a stylistic difference, not a behavioural one.
:::
