---
sidebar_position: 3
---

# Architecture

## System overview

Caddy is the single public entry point. Everything else lives on internal Docker
networks. The `backend` network is marked `internal: true` (no direct outbound
exposure); only the `frontend` network is reachable through Caddy.

```
                          Internet
                             │
                     ┌───────▼────────┐
                     │     Caddy      │  :80 / :443 (public)
                     │ (reverse proxy)│
                     └───┬───┬───┬────┘
      /api/*  ───────────┘   │   │   └───────── /*  (SPA)
      /editor/* ─┐           │   └── /docs/* ──────────────┐
                 │           │                              │
        ┌────────▼───┐  ┌────▼─────┐                 ┌──────▼──────┐
        │  Maputnik  │  │  FastAPI │                 │  Frontend   │
        │  (editor)  │  │  (api)   │                 │ (React/Vite)│
        └────────────┘  └──┬────┬──┘                 └─────────────┘
                           │    │
              ┌────────────┘    └───────────┐
              │                             │
        ┌─────▼─────┐                 ┌─────▼──────┐
        │   Redis   │                 │ PgBouncer  │◄──── Martin (tiles)
        │(rate-limit│                 │(pool, SCRAM)│
        │ + pubsub) │                 └─────┬──────┘
        └───────────┘                       │
                                      ┌──────▼───────┐
                                      │   PostGIS    │
                                      │(PostgreSQL16)│
                                      └──────────────┘
```

Docusaurus (`docs`) is also served through Caddy at `/docs/*`.

## Caddy routing

Routing is defined in `Caddyfile.dev` and `Caddyfile.prod`. Both share the same
route map; prod adds strict security headers (HSTS, CSP, `X-Frame-Options`…) and
dev keeps a relaxed CSP plus WebSocket matchers for Vite HMR.

| Path        | Upstream          | Notes                                            |
| ----------- | ----------------- | ------------------------------------------------ |
| `/api/*`    | `api:8000`        | Path prefix stripped (`handle_path`)             |
| `/editor/*` | `maputnik:8000`   | Relaxed CSP (Maputnik needs `blob:` + CDN)       |
| `/docs/*`   | `docs:3000`       | Docusaurus                                        |
| `/*`        | `frontend:3000`   | React SPA (dev proxies Vite incl. HMR WebSocket) |

Because `/api/*` is stripped by Caddy and the FastAPI app declares
`root_path="/api"`, the API sees clean paths while OpenAPI still advertises the
`/api` prefix. See [API overview](./api/overview).

## Data flow highlights

- **Frontend → API**: the SPA calls `/api/...` (axios `baseURL: "/api"`). Access
  token in `Authorization: Bearer`, refresh token in an HTTP-only cookie
  (`canopy_rt`). A 401 triggers a transparent refresh + retry in the axios
  interceptor.
- **API → PostGIS**: never direct. The API connects through **PgBouncer**
  (`DATABASE_URL=...@pgbouncer:5432/...?prepare_threshold=0`). `prepare_threshold=0`
  is required because PgBouncer runs in **transaction** pooling mode.
- **Martin → PostGIS**: also through PgBouncer. Martin reads geometry tables and
  serves vector tiles; its catalog is exposed internally on `:3000/catalog`.
- **Notifications**: the API persists notifications and broadcasts them over a
  WebSocket. Redis is used both for slowapi rate-limit storage and as the
  pub/sub backbone (`user:<id>` channels) so broadcasts work across API workers.
- **PostGIS role provisioning**: when granted, the API creates a dedicated
  PostgreSQL role per user (`canopy_user_<id>`) with SCRAM credentials so the
  user can connect directly (optionally exposed via the `expose-db` profile).

## Networks & exposure

- `frontend` network: Caddy, frontend, docs, maputnik. Publicly reachable via
  Caddy only.
- `backend` network (`internal: true`): api, postgis, pgbouncer, martin, redis,
  maputnik. No inbound from the host unless a dev override or the `expose-db`
  profile publishes a port.
- Dev overrides (`docker-compose.override.yml`) additionally publish: API
  `8000`, Martin `3002→3000`, docs `3001→3000`, frontend `3000`, and add
  **Mailpit** (`1025` SMTP, `8025` UI).

See [Docker services](./docker/services) for the full per-service breakdown.
