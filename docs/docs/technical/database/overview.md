---
sidebar_position: 1
---

# Database Overview

Canopy uses **PostgreSQL 16 + PostGIS 3.4** (image `postgis/postgis:16-3.4`),
accessed through **PgBouncer**. The ORM is **SQLModel** (SQLAlchemy + Pydantic)
with **async** sessions; schema changes go through **Alembic**.

## Schemas

`docker/postgis/init_db.sql` runs on first boot and establishes the schema
layout and lockdown:

| Schema       | Purpose                                                             |
| ------------ | ------------------------------------------------------------------ |
| `app_data`   | All application tables (users, teams, atlases, maps, tokens, notifications…). |
| `users_data` | Reserved for user-provisioned / imported geo data.                 |
| `public`     | Access **revoked** from `PUBLIC`; not used for app tables.         |

`init_db.sql` also enables `hstore`, drops `postgis_tiger_geocoder`, and revokes
`PUBLIC` access on `app_data`, `users_data`, `public`, `information_schema` and
`pg_catalog`, so a bare role sees nothing until explicitly granted.

`PostgreSQLSchema` (`app/core/enums/postgresql_schema.py`) is the single source
for these names in code.

## Connection & pooling

- The API and Martin connect via **PgBouncer** (`pgbouncer:5432`), not PostGIS
  directly.
- PgBouncer runs **transaction** pooling with **SCRAM-SHA-256**. Because of
  transaction pooling, the API connection uses `?prepare_threshold=0` (psycopg)
  to avoid server-side prepared-statement conflicts.
- Driver: `psycopg` v3 (`postgresql+psycopg://...`).

## Migrations (Alembic)

Migrations live in `api/alembic/versions/`. The base migration `..._init` creates
all `app_data` tables; later revisions add fields (password-reset token,
db-activation token hashing, `postgis_role_created`, notification `key`, …).

```bash
make create-migration m="describe change"   # autogenerate a revision
make apply-migration                         # alembic upgrade head
```

Rules:

- **Import every new SQLModel table in `alembic/env.py`** so autogenerate detects
  it.
- One migration file per change.
- Integration tests (`tests/integration/test_migrations.py`) exercise the full
  upgrade/downgrade lifecycle against a Testcontainers Postgres.

## Per-user roles

Beyond the application's own DB user, Canopy can provision **one PostgreSQL role
per user** (`canopy_user_<id>`) for direct SQL access. See
[Database access](../api/database-access).

## Models

See [Models](./models) for the entity/field reference.
