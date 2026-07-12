---
sidebar_position: 1
---

# Frontend Overview

The frontend is a **React 19 single-page app** built with Vite and TypeScript
(strict). It is a real, tested application — not a placeholder. Source:
`frontend/src/`.

## Stack

| Concern        | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| Build / dev    | Vite 8, TypeScript 5 (strict), React Compiler (babel plugin) |
| UI             | Tailwind CSS 4, Shadcn/ui on Radix, `lucide-react` icons     |
| Server state   | TanStack Query v5                                            |
| UI state       | Zustand v5                                                   |
| HTTP           | axios (`baseURL: "/api"`, `withCredentials`)                 |
| Routing        | React Router v7 (`createBrowserRouter` + loaders)           |
| Forms          | react-hook-form + Yup                                        |
| i18n           | i18next + react-i18next (`en` / `fr`)                        |
| Notifications  | native WebSocket + `sonner` toasts                          |
| Geo parsing    | `loaders.gl` (GeoJSON, Shapefile, FlatGeobuf, Arrow)        |
| Tests          | Vitest + React Testing Library + MSW                        |

> There is **no `maplibre-gl`** dependency yet. Map rendering (the Atlas and
> Tile-flux views) is not implemented — those routes render a `<Wip />`
> placeholder. `loaders.gl` is used for the data-upload feature, not for map
> display.

## Features (what actually exists)

| Feature       | Path                       | Status                                                     |
| ------------- | -------------------------- | ---------------------------------------------------------- |
| `auth`        | `features/auth`            | ✅ Login, register (captcha), email verify, forgot/reset.  |
| `admin`       | `features/admin`           | ✅ Users & roles, teams, atlases panels. Tile-flux/data panels are `<Wip />`/partial. |
| `userProfile` | `features/userProfile`     | ✅ Profile edit, DB-access activation, notifications.      |
| `data`        | `features/data`            | 🟡 Geo file upload + client-side metadata (loaders.gl); backend import partial. |
| Atlas map     | route `/atlas`, `/tile-flux` | 🚧 `<Wip />` placeholders — no map yet.                  |

## Routing

Routes are declared in `src/shared/routes/index.tsx` with
`createBrowserRouter`. The top-level route runs `authLoader` (bootstraps the
session) and renders `<App />`; feature routes attach their own loaders
(`dataLoadLoader`, `adminLoader`, `profileLoader`, `verifyLoader`,
`resetPasswordLoader`, …). Navigation entries live in
`src/shared/routes/RoutesDefinition.ts` (with a `requiresAdmin` flag for the
admin section). The `/atlas` and `/tile-flux` nav entries are intentionally
mapped to `<Wip />`.

## API access & auth

- `src/app/config/apiClient.ts` — axios instance. A request interceptor attaches
  the in-memory access token; a response interceptor handles 401 by calling
  `/api/auth/refresh` once, queuing concurrent requests, retrying, and clearing
  auth on failure. It also toasts on network/403/429/5xx errors (all i18n keys).
- Auth/session state is held in a Zustand store (`features/auth/store` +
  `shared/store`); the refresh token itself is an HTTP-only cookie the JS never
  sees.

## More

- [Frontend architecture](./architecture) — conventions and data flow
- [Frontend testing](./testing) — Vitest + MSW setup
