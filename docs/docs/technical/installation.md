---
sidebar_position: 2
---

# Installation & Setup

This is a self-contained guide to run Canopy, both for **local development** and
**production**. Everything runs in Docker, orchestrated by a `Makefile`, so you
do not need Python or Node installed on the host.

## 1. Prerequisites

Host requirements (versions come from the Docker/compose configs, not guessed):

- **Docker Engine** + **Docker Compose plugin** (`docker compose`, v2 syntax).
- **GNU Make** (all workflows go through the Makefile).
- **git**, **openssl** (used by `make genpkey` / `make genaltchakey`).

You do **not** need local Python/Node for the Docker workflow. If you ever run a
service outside Docker, the images pin: Python **3.12** (API, via `uv`),
Node **22** (frontend), Node **20** (docs).

Operating system:

- **Linux** — native, recommended.
- **macOS / Windows** — use Docker Desktop; on Windows run all commands from a
  **WSL 2** shell, not PowerShell.

> `make reset-db` and `make stop-and-delete-data` use `sudo rm -rf
> docker/postgis/data/*`. On Linux the PostGIS data directory is owned by the
> container's postgres user, so destructive DB resets need `sudo`.

## 2. Configuration (`.env`)

Copy the example and edit it:

```bash
cp .env.example .env
```

Configuration reference (defaults from `api/app/core/config.py`):

### Required

| Variable            | Purpose                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `ENV`               | `dev` or `prod`. Drives the Makefile and security posture.         |
| `SITE_ADDRESS`      | Public host for Caddy. In dev use `localhost`; in prod your domain (no scheme). Also derives `allowed_hosts` and CORS `allowed_origins` (see `config.py`). |
| `POSTGRES_USER`     | Database superuser/owner login. In production, the app **refuses to boot** if this is left at the placeholder value `"To set"` (see `config.py` validator). |
| `POSTGRES_PASSWORD` | Database password. Same fail-closed check in production as `POSTGRES_USER`. |
| `POSTGRES_DB`       | Database name.                                                     |

> `POSTGRES_HOST` and `DATABASE_URL` are **not** user-facing settings: in
> `docker-compose.yml` the API's and Martin's `DATABASE_URL` are always
> rebuilt from `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` and forced to
> point at **pgbouncer** with `?prepare_threshold=0`, overriding whatever is
> in `.env`. They are intentionally absent from `.env.example`.

### Registration & tokens

| Variable                      | Default | Purpose                                        |
| ----------------------------- | ------- | ---------------------------------------------- |
| `ALLOW_SELF_REGISTRATION`     | `False` in prod, `True` in dev (set by `docker-compose.override.yml`) | Allow public sign-up (else admin-only, accounts created via the UI). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15`    | Access-token lifetime.                         |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | `30`    | Refresh-token lifetime.                        |

> If `ALLOW_SELF_REGISTRATION=True` in production, `SMTP_HOST` must also be a
> real server: the app refuses to boot if self-registration is on and
> `SMTP_HOST` is still `mailpit` (signup verification emails would otherwise
> silently fail). If self-registration is off, the same condition only logs a
> warning — SMTP is still useful for password-reset emails, but not mandatory,
> since an administrator can always reset a user's password directly.

### Email / SMTP

Email verification and password reset require SMTP. In **dev**, the compose
override ships **Mailpit** (`SMTP_HOST=mailpit`, `SMTP_PORT=1025`, web UI on
`:8025`) so no real provider is needed.

| Variable          | Dev default        | Purpose                              |
| ----------------- | ------------------ | ------------------------------------ |
| `SMTP_HOST`       | `mailpit`          | SMTP server host.                    |
| `SMTP_PORT`       | `1025`             | SMTP port.                           |
| `SMTP_FROM_EMAIL` | `noreply@canopy.dev` | From address.                      |
| `SMTP_USER` / `SMTP_PASSWORD` | *(empty)* | Auth (needed for real providers).    |
| `SMTP_STARTTLS` / `SMTP_USE_TLS` | `False` | TLS mode for real providers.        |

### Optional

| Variable                                    | Default | Purpose                                       |
| ------------------------------------------- | ------- | --------------------------------------------- |
| `LOCALE`                                    | `en`    | Default language (`en` / `fr`) for docs/UI.   |
| `COMPOSE_PROFILES`                          | `none`  | Set to `expose-db` to publish PostGIS.        |
| `POSTGRES_EXTERNAL_PORT`                    | `5432`  | Host port when `expose-db` is on.             |
| `DB_ROLE_PREFIX`                            | `canopy_user_` | Prefix for per-user PostgreSQL roles.  |
| `ACTIVATE_GOOGLE_AUTH` + `GOOGLE_CLIENT_*`  | off     | Google OAuth (requires self-registration on). |

### Auto-generated secrets — do not set by hand

- `PRIVATE_KEY` — JWT/session signing key. Generated by `make genpkey`.
- `ALTCHA_HMAC_KEY` — captcha HMAC key. Generated by `make genaltchakey`.

In production the app **refuses to boot** if these are left at their insecure
defaults (see `config.py` validators).

## 3. First-time setup

The one-shot target does everything (generate secrets → build → start →
initialise DB):

```bash
make create-app
```

Under the hood (`Makefile`), this runs:

1. `genpkey` — append a random `PRIVATE_KEY` to `.env`.
2. `genaltchakey` — append a random `ALTCHA_HMAC_KEY` to `.env`.
3. `build` — build all images.
4. `start` — `docker compose up -d` (compose files chosen by `ENV`).
5. `setup-db` — `apply-init-db` (schemas + REVOKE) → `apply-migration`
   (Alembic `upgrade head`) → then, depending on `ENV`:
   - `ENV=dev`: `seed` (dev mock data, see below).
   - `ENV=prod`: `bootstrap-admin` — if no administrator exists yet, prints a
     one-time `/setup?token=...` URL to the terminal so the operator can create
     the first admin account through the UI (see the
     [deployment guide](../user/deployment)). Safe to re-run: it regenerates
     the link as long as no admin has been created yet, and is a no-op once one
     exists. `app/core/seeds.py` refuses to run at all when `ENV=prod`.

### Development vs production

The Makefile selects compose files from `ENV`:

```bash
ENV=dev  make build   # docker-compose.yml + docker-compose.override.yml
ENV=dev  make start
ENV=dev  make stop     # `docker compose down` — no volumes touched

ENV=prod make build   # docker-compose.yml only
ENV=prod make start
```

## 4. Running

```bash
ENV=dev make start     # start everything, detached
docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f api
ENV=dev make stop      # stop containers, keep all data
```

Useful DB targets (see [Database overview](./database/overview)):

```bash
make create-migration m="add something"   # autogenerate an Alembic revision
make apply-migration                       # upgrade head
make seed                                   # re-seed dev data (dev/test only)
make bootstrap-admin                        # print a first-admin setup link (prod)
make backup-db                              # pg_dump the app database to backups/
make restore-db file=backups/canopy_<ts>.dump  # restore a backup (pg_restore --clean)
make stop-and-delete-data                   # DESTRUCTIVE: down -v + wipe docker/postgis/data
make reset-db                               # DESTRUCTIVE: stop-and-delete-data, then rebuild + migrate + seed/bootstrap
```

> `stop` (plain `docker compose down`) never touches data: the PostGIS bind
> mount (`docker/postgis/data`) survives it, and the only named volumes in the
> stack (`caddy_data`, `caddy_config`, Caddy's TLS state) are no longer dropped
> either. Only `stop-and-delete-data` and `reset-db` are destructive — both
> remove `caddy_data`/`caddy_config` via `down -v` **and** `rm -rf` the PostGIS
> data directory. Back up first with `make backup-db` if the data matters.

## 5. Verify it works

With `SITE_ADDRESS=localhost` and `ENV=dev`:

| Check              | URL / command                                    | Expected                         |
| ------------------ | ------------------------------------------------ | -------------------------------- |
| API health         | `curl -k https://localhost/api/health`           | `{"status":"healthy"}`           |
| API health (direct)| `curl http://localhost:8000/health`              | `{"status":"healthy"}` (dev port)|
| OpenAPI / Swagger  | `https://localhost/api/docs`                     | Interactive API docs             |
| Frontend           | `https://localhost/`                             | Canopy SPA                       |
| Docs               | `https://localhost/docs/`                         | This site                        |
| Style editor       | `https://localhost/editor/`                       | Maputnik                         |
| Martin catalog     | `http://localhost:3002/catalog`                   | JSON tile catalog (dev port)     |
| Dev mailbox        | `http://localhost:8025`                           | Mailpit UI                       |

Seeded dev logins (from `api/app/core/seeds.py`, `ENV=dev`/`test` only — this
script refuses to run when `ENV=prod`):

| Username   | Password   | Roles                          |
| ---------- | ---------- | ------------------------------ |
| `admin`    | `admin`    | USER, ADMIN                    |
| `editor`   | `editor`   | USER, MANAGE_ATLASES_AND_MAPS  |
| `baseUser` | `baseUser` | USER                           |

## 6. Troubleshooting

- **`make` errors with "ENV must be set to 'prod' or 'dev'"** — export `ENV`
  (`ENV=dev make start`) or set it in `.env`.
- **API unhealthy / exits at boot in prod** — `PRIVATE_KEY` or
  `ALTCHA_HMAC_KEY` still at their default; run `make genpkey` /
  `make genaltchakey` (or use `make create-app`).
- **API exits at boot in prod mentioning `POSTGRES_USER` or `POSTGRES_PASSWORD`**
  — one of them is still at the placeholder value `"To set"`; edit `.env` and
  set real values.
- **API exits at boot in prod mentioning `SMTP_HOST`** — `SMTP_HOST` is still
  `mailpit`; set a real SMTP server (required for password-reset emails,
  regardless of `ALLOW_SELF_REGISTRATION`).
- **API can't reach the database** — the API depends on `postgis`, `pgbouncer`
  and `redis` being *healthy*. On first boot PostGIS initialises before
  accepting connections; compose `depends_on: condition: service_healthy`
  handles ordering, but a cold start can take a minute.
- **`prepared statement already exists` / psycopg errors** — PgBouncer is in
  transaction mode; ensure the API URL keeps `?prepare_threshold=0` (it is set
  in compose).
- **Port already in use (dev)** — the override publishes `80/443` (Caddy),
  `8000` (API), `3000` (frontend), `3001` (docs), `3002` (Martin), `1025/8025`
  (Mailpit). Free them or adjust the override.
- **HTTPS certificate warning on `localhost`** — Caddy issues a local
  self-signed cert; use `curl -k` or trust Caddy's local CA.
- **No verification email arrives (dev)** — check the Mailpit UI at
  `http://localhost:8025`; the app talks to `mailpit:1025`, not a real server.
- **`make reset-db` / `make stop-and-delete-data` permission denied** — they
  need `sudo` to remove the container-owned `docker/postgis/data`.
- **`make restore-db` errors with "No such file"** — `file=` must point to a
  `.dump` produced by `make backup-db` (custom `pg_dump -Fc` format), not a
  plain `.sql` file.
