---
sidebar_position: 1
---

# API Overview

The Canopy API is built with **FastAPI** (`app/main.py`, title *"Canopy API"*,
version `0.0.1`). It uses SQLModel + async SQLAlchemy over PostgreSQL/PostGIS.

## Base URL & OpenAPI

The app is mounted with `root_path="/api"`, and Caddy strips the `/api` prefix
before proxying to the container. So:

```
https://{your-domain}/api          # API root
https://{your-domain}/api/docs     # Swagger UI
https://{your-domain}/api/redoc    # ReDoc
https://{your-domain}/api/openapi.json
```

In development the API port is also published directly: `http://localhost:8000`
(so `http://localhost:8000/docs`). **The generated OpenAPI schema is the
authoritative endpoint reference** — this documentation summarises it but the
live `/api/docs` never goes stale.

## Routers

Nine routers plus a health check and a notifications WebSocket are mounted:

| Prefix              | Tag              | Page                                            |
| ------------------- | ---------------- | ----------------------------------------------- |
| `/auth`             | Auth             | [Authentication](./authentication)              |
| `/users`            | Users            | [Endpoints](./endpoints#users)                  |
| `/teams`            | Teams            | [Endpoints](./endpoints#teams)                  |
| `/atlases`          | Atlases          | [Endpoints](./endpoints#atlases)                |
| `/maps`             | Maps             | [Endpoints](./endpoints#maps)                   |
| `/database-access`  | Database Access  | [Database access](./database-access)            |
| `/geo`              | Geo              | [Data import](./data-import)                    |
| `/import-data`      | Import Data      | [Data import](./data-import)                    |
| `/notifications`    | Notifications    | [Notifications](./notifications)                |
| `/health`           | Health           | Liveness probe, returns `{"status":"healthy"}`  |

## Authentication

Most endpoints require a Bearer access token (`Authorization: Bearer <jwt>`),
resolved by the `get_current_user` dependency. See
[Authentication](./authentication).

## Response format

Responses are the endpoint's Pydantic model serialised as JSON (via
`ORJSONResponse`). There is **no global envelope** — a call returns the resource
directly, e.g. `GET /api/users/me` returns a `UserDetail` object. List endpoints
that paginate return a `PaginatedResponse`:

```json
{ "items": [ /* ... */ ], "total": 42, "skip": 0, "limit": 25 }
```

Pagination defaults (`AppParameter`): `skip=0`, `limit=25`, max `limit=100`.

## Error format

Errors use FastAPI's standard shape, with **i18n message keys resolved to text**
by the exception handlers (`app/core/exceptions/`):

```json
{ "detail": "Human-readable, localized message" }
```

Typed exceptions map to HTTP status codes (e.g. `PermissionDeniedException` →
403, `AuthenticationException` → 401, `FileUploadException` → 400). Messages come
from `app/locales/{en,fr}.json`.

## Rate limiting

`slowapi` (Redis-backed) enforces per-route limits, e.g. login/register
`5/minute`, forgot-password `3/hour`, captcha `20/minute`. Exceeding a limit
returns **429** (the frontend surfaces a toast).

## Security middleware

`main.py` wires: session middleware (signed with `PRIVATE_KEY`), CORS (from
`CORS_ORIGINS`), `TrustedHostMiddleware` (hosts derived from `SITE_ADDRESS` in
prod), proxy-headers, and a correlation-id middleware for request tracing.
