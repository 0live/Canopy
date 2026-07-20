---
sidebar_position: 3
---

# Development Setup

For the full first-run walkthrough see [Installation](../installation). This page
focuses on the day-to-day dev loop.

## Start / stop

```bash
ENV=dev make start                # up -d with override (ports + Mailpit + hot-reload)
ENV=dev make stop                 # docker compose down — keeps all data
ENV=dev make stop-and-delete-data # ⚠ down -v + wipe docker/postgis/data (DB included)
```

> `make stop` is a plain `docker compose down`: the PostGIS bind mount and the
> `caddy_data`/`caddy_config` volumes all survive it. Only
> `make stop-and-delete-data` (and `make reset-db`, which calls it) are
> destructive. Back up first with `make backup-db` if the data matters.

## Hot reload

The dev override bind-mounts source and runs dev servers:

- **api** — `uvicorn --reload`; `./api` is mounted into the container.
- **frontend** — `npm run dev` (Vite HMR); `./frontend` mounted, `node_modules`
  kept in the container.
- **docs** — Docusaurus dev server; `./docs` mounted.

Caddy's dev config forwards the Vite HMR WebSocket so hot reload works behind the
proxy.

## Dev ports

| URL                          | Service              |
| ---------------------------- | -------------------- |
| `https://localhost/`         | Frontend (via Caddy) |
| `https://localhost/api/docs` | Swagger UI           |
| `http://localhost:8000`      | API (direct)         |
| `http://localhost:3000`      | Frontend (direct)    |
| `http://localhost:3001`      | Docs (direct)        |
| `http://localhost:3002/catalog` | Martin catalog    |
| `http://localhost:8025`      | Mailpit UI           |

## Migrations & data

```bash
make create-migration m="describe change"   # autogenerate revision
make apply-migration                         # upgrade head
make seed                                     # reload dev seed data
make backup-db                                # pg_dump the app database to backups/
make restore-db file=backups/canopy_<ts>.dump # restore a backup
make reset-db                                 # ⚠ full destructive reset (needs sudo)
```

When you add a SQLModel table, import it in `alembic/env.py` before generating a
migration (otherwise autogenerate won't see it).

## Exposing the database

To reach PostGIS from an external client (psql, QGIS, DBeaver):

```bash
# .env
COMPOSE_PROFILES=expose-db
POSTGRES_EXTERNAL_PORT=15432
```

Then `make start` and connect to `localhost:15432`. This is off by default for
security. See [Database access](../api/database-access) for per-user roles.

## Adding dependencies

```bash
# Backend (uv) — from api/
cd api && uv add <pkg>            # runtime
cd api && uv add --dev <pkg>      # dev

# Frontend (via the container)
make install-frontend-pkg pkg=<pkg>            # runtime
make install-frontend-pkg pkg=<pkg> dev=true   # dev
make ui-add component=<shadcn-component>        # add a Shadcn component
```

## Tests & lint

```bash
make launch-api-tests        # ENV=test uv run pytest
make launch-frontend-tests   # npm run test
make launch-all-tests        # both

cd api && uv run ruff check .        # backend lint
cd api && uv run ruff format --check .
cd frontend && npm run lint          # frontend lint
```
