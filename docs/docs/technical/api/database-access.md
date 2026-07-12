---
sidebar_position: 5
---

# Database Access (PostGIS role provisioning)

Canopy can grant a user **direct SQL access** to PostGIS with their own
PostgreSQL role, so they can query/connect with external tools. Source:
`app/modules/db_access/`.

## Concept

- Gated by the `WITHDBACCESS` role. A user without it has no DB access.
- Each provisioned user gets a dedicated role named `\{DB_ROLE_PREFIX}\{user_id}`
  (default prefix `canopy_user_`, e.g. `canopy_user_42`).
- The role's password is set by the **user** during activation and stored by
  PostgreSQL as SCRAM-SHA-256 — the application never persists the plaintext.

## Lifecycle

1. **Grant** — an admin adds `WITHDBACCESS` via `PUT /users/{id}/roles`. This
   issues a one-time **activation token** (valid 8h) and notifies the user
   (`DB_ACCESS_GIVEN`). The `postgis_role_created` flag on the user stays false
   until activation.
2. **Activate** — the user calls `POST /database-access/activate` with a chosen
   password (min length 12). The service verifies the token is present and not
   expired, then creates the PostgreSQL role, clears the token, and sets
   `postgis_role_created = true`.
3. **Rotate password** — `PATCH /database-access/password` updates the role
   password (requires the role to exist).
4. **Status** — `GET /database-access/status` returns `has_access`,
   `is_activated`, and the `role_name` when activated.
5. **Revoke** — dropping the role (`revoke_database_access`) removes access; the
   revocation path exists in the service layer.

## Endpoints

| Method | Path                        | Rate limit | Body / response                                  |
| ------ | --------------------------- | ---------- | ------------------------------------------------ |
| GET    | `/database-access/status`   | —          | → `DatabaseAccessStatus`                         |
| POST   | `/database-access/activate` | 5/hour     | `{ "password": ">=12 chars" }` → `role_name`, `message` |
| PATCH  | `/database-access/password` | 10/hour    | `{ "password": ">=12 chars" }`                   |

## Connecting

PostGIS is not published by default. To let users connect from outside, enable
the optional profile (`COMPOSE_PROFILES=expose-db`, plus
`POSTGRES_EXTERNAL_PORT`), which relays the internal PostGIS port to the host.
Users then connect with their `canopy_user_<id>` role and the password they set.

Schema layout (see [Database overview](../database/overview)): application tables
live in `app_data`; user-provisioned data is intended for the `users_data`
schema. `public` access is revoked by `docker/postgis/init_db.sql`.

## Security notes

- Activation tokens are single-use, time-limited (8h), and hashed at rest (see
  the `hash_db_activation_token` migration).
- Role creation/alteration uses SCRAM helpers (`app/core/scram.py`); passwords
  are never logged (only role name + user id are logged, at `warning` level).
