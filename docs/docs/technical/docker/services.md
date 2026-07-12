---
sidebar_position: 2
---

# Docker Services

Full service list from `docker-compose.yml` (+ dev override). "Internal" ports
are only reachable on the Docker networks; "dev host" ports are published by
`docker-compose.override.yml`.

| Service           | Image / build            | Internal port | Dev host port | Network(s)          |
| ----------------- | ------------------------ | ------------- | ------------- | ------------------- |
| `caddy`           | `caddy:2-alpine`         | 80 / 443      | 80 / 443      | frontend, backend   |
| `frontend`        | build `frontend/`        | 3000          | 3000          | frontend            |
| `api`             | build `api/`             | 8000          | 8000          | backend             |
| `postgis`         | `postgis/postgis:16-3.4` | 5432          | — (see profile)| backend            |
| `pgbouncer`       | `edoburu/pgbouncer`      | 5432          | —             | backend             |
| `martin`          | `maplibre/martin:1.3.0`  | 3000          | 3002          | backend (+frontend dev) |
| `maputnik`        | `maplibre/maputnik:main` | 8000          | —             | backend, frontend   |
| `redis`           | `redis:7-alpine`         | 6379          | —             | backend             |
| `docs`            | build `docs/`            | 3000          | 3001          | frontend            |
| `mailpit` (dev)   | `axllent/mailpit`        | 1025 / 8025   | 1025 / 8025   | backend, frontend   |
| `postgis-external`| `alpine/socat`           | 5432          | `$POSTGRES_EXTERNAL_PORT` | backend, frontend |

`postgis-external` only starts under the `expose-db` compose profile.

## Caddy (reverse proxy)

Single public entry. Routes `/api/*` → api, `/editor/*` → maputnik, `/docs/*` →
docs, `/*` → frontend. Prod adds HSTS/CSP/security headers. See
[Architecture](../architecture#caddy-routing).

## api (FastAPI)

Uvicorn (dev, `--reload`) / Gunicorn+Uvicorn workers (prod). Healthcheck hits
`/health`. Depends on `postgis`, `pgbouncer`, `redis` being healthy. Memory
limit 1G. The `api/` directory is bind-mounted.

## postgis (PostgreSQL 16 + PostGIS 3.4)

Primary datastore. Data persisted to `docker/postgis/data`. On first boot it
runs `docker/postgis/init_db.sql` (creates `app_data` / `users_data` schemas and
revokes public access). Healthcheck `pg_isready`.

## pgbouncer

Connection pooler in **transaction** mode with **SCRAM-SHA-256** auth
(`MAX_CLIENT_CONN=1000`, `DEFAULT_POOL_SIZE=20`). Both the API and Martin connect
through it. This is why the API URL needs `?prepare_threshold=0`.

## martin (tile server)

Serves vector tiles from PostGIS (via pgbouncer). Catalog at `/catalog`
(healthcheck). Published on host `3002` in dev.

## maputnik (style editor)

MapLibre style editor served at `/editor/`. Uses a relaxed CSP in Caddy.

## redis

Backing store for slowapi rate limiting and the notifications pub/sub
(`user:<id>` channels).

## docs (Docusaurus)

This documentation site, served at `/docs/`. `LOCALE` env sets the default
language.

## mailpit (dev only)

SMTP sink so email verification / password reset work locally without a real
provider. Web UI at `http://localhost:8025`.
