---
sidebar_position: 4
---

# Project Structure

Commented map of the repository. Only the meaningful paths are listed.

```
Canopy/
├── docker-compose.yml            # Base compose (prod topology): all services
├── docker-compose.override.yml   # Dev overrides: port exposure, Mailpit, hot-reload
├── Caddyfile.dev / Caddyfile.prod# Reverse-proxy routing (dev vs prod headers/CSP)
├── Makefile                      # Root targets; includes api/docs/frontend makefiles
├── .env / .env.example           # Environment configuration
├── docker/
│   ├── postgis/init_db.sql       # Schemas (app_data, users_data) + REVOKE grants
│   └── pgbouncer/                # PgBouncer configuration
├── api/                          # FastAPI backend (see below)
├── frontend/                     # React SPA (see below)
├── docs/                         # This Docusaurus site
└── data_test/                    # Sample geo files for manual testing
```

## Backend — `api/`

Layered "clean" architecture. Each business domain is a self-contained module.

```
api/
├── pyproject.toml                # Dependencies (managed with uv)
├── Dockerfile.dev / Dockerfile.prod
├── Makefile                      # migration / seed / test targets
├── alembic/                      # Migrations (env.py + versions/)
├── app/
│   ├── main.py                   # FastAPI app: middleware, routers, /health, lifespan
│   ├── core/
│   │   ├── config.py             # Settings (pydantic-settings, env-driven)
│   │   ├── database.py           # AsyncEngine / session manager
│   │   ├── security.py           # JWT, get_current_user, WebSocket auth
│   │   ├── permissions.py        # Role checks (has_any_role, ...)
│   │   ├── rate_limit.py         # slowapi limiter (Redis-backed)
│   │   ├── messages.py           # i18n message loading (locales/*.json)
│   │   ├── exceptions/           # Typed exceptions + handlers
│   │   ├── mixins/               # AuditMixin, AccessPolicyMixin
│   │   ├── enums/                # Environment, PostgreSQLSchema, AccessPolicy, ...
│   │   ├── notifications/        # Persisted notifications + WebSocket broadcaster
│   │   ├── repository.py         # Generic repository base
│   │   ├── scram.py              # SCRAM-SHA-256 helpers for PG role passwords
│   │   ├── seeds.py              # Dev seed data (users, teams, atlases, maps)
│   │   └── locales/ (app/locales)# en.json / fr.json backend messages
│   └── modules/                  # One folder per domain (see pattern below)
│       ├── auth/ users/ teams/ atlases/ maps/
│       ├── db_access/            # PostgreSQL role provisioning
│       ├── geo/                  # EPSG detection (pyproj)
│       └── import_data/          # Geo file upload (partial pipeline)
└── tests/
    ├── unit/                     # Services mocked, no DB
    └── integration/              # Testcontainers Postgres, real migrations
```

### Module pattern (Route → Service → Repository)

Every `app/modules/<domain>/` follows the same shape:

```
<domain>/
├── endpoints.py    # FastAPI router; DI only, no business logic
├── service.py      # Business logic / unit of work (async)
├── repository.py   # SQL only (SQLModel / AsyncSession)
├── models.py       # SQLModel table models
├── schemas.py      # Pydantic v2 request/response DTOs
└── enums.py        # Domain enums (when needed)
```

Rule: a service must not import another module's **repository**. Cross-module
needs go through service-to-service calls.

## Frontend — `frontend/src/`

Vertical-slice ("feature") architecture with a shared layer.

```
frontend/src/
├── app/
│   ├── main.tsx / App.tsx        # Entry point + root layout
│   ├── config/                   # apiClient (axios), queryClient, i18n
│   └── providers/                # Query / I18n / Theme / AppProviders
├── shared/
│   ├── components/ui/            # Shadcn primitives + shared UI
│   ├── components/layout/        # AppLayout, sidebar, ErrorView
│   ├── routes/                   # RoutesDefinition + createBrowserRouter
│   ├── store/                    # Root Zustand store (auth, ...)
│   ├── constants/ hooks/ lib/ types/ utils/
│   └── locales/{en,fr}/translation.json
├── features/
│   ├── auth/                     # Login, register, verify, forgot/reset password
│   ├── admin/                    # Users / teams / atlases / tile-flux / data panels
│   ├── userProfile/              # Profile, DB access, notifications
│   └── data/                     # Geo file upload + metadata (loaders.gl)
└── test/                         # Vitest setup, MSW server, render helpers
```

Each feature mirrors the same internal layout: `services/{api,forms,routes}`,
`hooks/`, `store/`, `components/`, `pages/`, `types.ts`. See
[Frontend architecture](./frontend/architecture).
