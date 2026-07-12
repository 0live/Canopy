---
sidebar_position: 1
---

# Technical Overview

This section is the developer reference for Canopy. It is written **against the
source code** (the code is the source of truth), not against product intentions.
When a feature is only partially wired, it is flagged as such.

## What Canopy is

Canopy is a self-hostable geospatial mapping platform. It provides:

- User accounts with a **role-based** permission model, teams, and email
  verification.
- An organizational model of **Atlases** (collections of maps) and **Maps**
  (a name, description and a MapLibre style), scoped to teams via an
  access-policy system.
- Per-user **PostgreSQL/PostGIS role provisioning**, so a user can be granted
  direct SQL access to the database with their own credentials.
- A **geo-data upload** entry point (GeoJSON / Shapefile ZIP) as the first step
  of a data-import pipeline.
- Real-time **notifications** (persisted + WebSocket).
- **Martin** vector-tile serving and **Maputnik** style editing, wired at the
  infrastructure level.

## Technology stack (as actually used)

| Layer         | Technology                                                             |
| ------------- | ---------------------------------------------------------------------- |
| Reverse proxy | Caddy 2 (alpine)                                                       |
| Frontend      | React 19, Vite, TypeScript (strict), Tailwind CSS 4, Shadcn/Radix     |
| Frontend data | TanStack Query v5 (server state), Zustand (UI state), axios, i18next  |
| API           | FastAPI, SQLModel, Pydantic v2, uvicorn, `uv` (deps)                   |
| Async / IO    | `AsyncSession`, `psycopg` v3, aiosmtplib                               |
| Auth          | JWT (PyJWT), bcrypt, Authlib (Google OAuth), Altcha captcha            |
| Rate limiting | slowapi + Redis                                                        |
| Database      | PostgreSQL 16 + PostGIS 3.4, Alembic migrations                        |
| Pooling       | PgBouncer (transaction mode, SCRAM-SHA-256)                           |
| Tiles         | Martin 1.3 (vector tiles from PostGIS)                                 |
| Style editor  | Maputnik                                                               |
| Docs          | Docusaurus (this site)                                                 |
| Dev email     | Mailpit (SMTP sink + web UI)                                           |

## Feature status

This table reflects what the code actually does today. See the linked pages for
detail.

| Area                                    | Status         | Notes                                                                  |
| --------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| Auth (login/refresh/logout)             | ✅ Working     | Dual JWT, refresh token in HTTP-only cookie + persisted `refreshtoken` |
| Registration + email verify             | ✅ Working     | Altcha captcha, self-registration toggle                               |
| Password reset                          | ✅ Working     | Token by email                                                         |
| Google OAuth                            | ⚙️ Optional    | Off by default, requires config                                        |
| Users / roles admin                     | ✅ Working     | Role **array** per user, admin CRUD                                    |
| Teams                                   | ✅ Working     | CRUD + membership                                                      |
| Atlases / Maps (API)                    | ✅ Working     | CRUD + atlas↔team links with granular permissions                     |
| Notifications                           | ✅ Working     | REST + WebSocket broadcaster                                          |
| DB access provisioning                  | ✅ Working     | Per-user PostgreSQL role: activate / change password / revoke         |
| Geo EPSG detection                      | ✅ Working     | `pyproj` WKT → EPSG                                                     |
| Geo file upload                         | 🟡 Partial     | File is stored on disk only; PostGIS/PMTiles import **not** implemented |
| Frontend: Auth / Admin / Data / Profile | ✅ Working     | Real, tested React features                                            |
| Frontend: Atlas / Tile-flux map         | 🚧 Placeholder | Routes render a `<Wip />` component; **no MapLibre in the frontend yet** |

## Where to go next

- [Architecture](./architecture) — services and how they talk to each other
- [Project structure](./project-structure) — repository layout
- [Installation & setup](./installation) — run it locally or in production
- [API overview](./api/overview) — REST surface, conventions, OpenAPI
- [Frontend overview](./frontend/overview) — React app architecture
- [Database overview](./database/overview) — schemas, models, provisioning
- [Conventions](./conventions) — engineering rules enforced in this repo
- [Glossary](./glossary) — geospatial and project-specific terms
