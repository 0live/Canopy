---
sidebar_position: 3
---

# API Endpoints

Summary of every mounted route (source of truth: the routers in
`app/modules/*/endpoints.py` and `app/core/notifications/endpoints.py`, confirmed
against the generated OpenAPI). All paths are under the `/api` prefix. Unless
noted, endpoints require a Bearer access token.

Auth routes are documented separately in [Authentication](./authentication).

## Users {#users}

| Method | Path                  | Description                              |
| ------ | --------------------- | ---------------------------------------- |
| POST   | `/users`              | Create a user (admin).                   |
| GET    | `/users`              | List users, paginated (`skip`, `limit`). |
| GET    | `/users/me`           | Current authenticated user.              |
| GET    | `/users/{user_id}`    | Get a user by id.                        |
| PATCH  | `/users/{user_id}`    | Update email / username / password.      |
| DELETE | `/users/{user_id}`    | Delete a user (admin).                   |
| PUT    | `/users/{user_id}/roles` | Replace a user's roles (admin).       |

- List returns `PaginatedResponse[AdminUserSummary]`; single returns
  `UserDetail` (id, email, username, `roles[]`, `teams[]`, `is_verified`,
  `postgis_role_created`).
- Roles are an **array** of `UserRole`. There is no `is_superuser` flag — admin
  is the `ADMIN` role. Granting `WITHDBACCESS` triggers DB-access provisioning
  (see [Database access](./database-access)).

## Teams {#teams}

| Method | Path                              | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| GET    | `/teams`                          | List teams, paginated.         |
| POST   | `/teams`                          | Create a team.                 |
| GET    | `/teams/{team_id}`                | Get a team.                    |
| PATCH  | `/teams/{team_id}`                | Update a team.                 |
| DELETE | `/teams/{team_id}`                | Delete a team.                 |
| POST   | `/teams/{team_id}/members`        | Add a member.                  |
| DELETE | `/teams/{team_id}/members/{user_id}` | Remove a member.            |

## Atlases {#atlases}

| Method | Path                                   | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| GET    | `/atlases`                             | List atlases, paginated.             |
| POST   | `/atlases`                             | Create an atlas.                     |
| GET    | `/atlases/{atlas_id}`                  | Get atlas detail.                    |
| PATCH  | `/atlases/{atlas_id}`                  | Update an atlas.                     |
| DELETE | `/atlases/{atlas_id}`                  | Delete an atlas.                     |
| POST   | `/atlases/team`                        | Create an atlas↔team link.           |
| PATCH  | `/atlases/{atlas_id}/team/{team_id}`   | Update link permissions.             |
| DELETE | `/atlases/{atlas_id}/team/{team_id}`   | Remove an atlas↔team link.           |

Atlas↔team links carry `can_manage_atlas`, `can_create_maps`, `can_edit_maps`.

## Maps {#maps}

| Method | Path              | Description                     |
| ------ | ----------------- | ------------------------------- |
| GET    | `/maps`           | List maps (`List[MapSummary]`). |
| POST   | `/maps`           | Create a map.                   |
| GET    | `/maps/{map_id}`  | Get a map (incl. `style`).      |
| PATCH  | `/maps/{map_id}`  | Update a map.                   |
| DELETE | `/maps/{map_id}`  | Delete a map.                   |

A map belongs to an atlas (`atlas_id`) and is unique per `(atlas_id, name)`.

## Database Access {#database-access}

| Method | Path                        | Description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/database-access/status`   | Whether the user has/activated DB access.    |
| POST   | `/database-access/activate` | Create the user's PostgreSQL role.           |
| PATCH  | `/database-access/password` | Change the PostgreSQL role password.         |

Full flow: [Database access](./database-access).

## Geo & Import {#geo}

| Method | Path                   | Description                                        |
| ------ | ---------------------- | ------------------------------------------------- |
| POST   | `/geo/detect-epsg`     | Detect EPSG from a WKT string (`{ "wkt": ... }`). |
| POST   | `/import-data/upload`  | Upload a geo file (multipart `file`).             |

Details and current limitations: [Data import](./data-import).

## Notifications {#notifications}

| Method    | Path                                | Description                        |
| --------- | ----------------------------------- | ---------------------------------- |
| WS        | `/notifications/ws-notifications`   | Real-time stream (authenticated).  |
| GET       | `/notifications`                    | List notifications, paginated.     |
| PATCH     | `/notifications/{id}/read`          | Mark one as read.                  |
| PATCH     | `/notifications/read-all`           | Mark all as read.                  |
| DELETE    | `/notifications/{id}`               | Delete one (hard delete).          |
| POST      | `/notifications/bulk-delete`        | Delete many by id.                 |

Full flow: [Notifications](./notifications).

## Health

| Method | Path      | Auth | Description                          |
| ------ | --------- | ---- | ----------------------------------- |
| GET    | `/health` | none | Liveness probe for Docker/monitoring |
