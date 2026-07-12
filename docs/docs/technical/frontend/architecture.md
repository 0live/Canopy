---
sidebar_position: 2
---

# Frontend Architecture

The frontend follows a **vertical-slice** ("feature") architecture. Each feature
is self-contained; a `shared/` layer holds cross-cutting UI and utilities.

## Feature layout

Every `src/features/<feature>/` mirrors the same internal shape:

```
features/<feature>/
├── pages/        # Route entry points (compose hooks + components)
├── components/   # Presentational components for this feature
├── hooks/        # TanStack Query hooks + form hooks (the logic)
├── services/
│   ├── api/      # Pure API calls (axios) — no React
│   ├── forms/    # Yup schemas
│   ├── routes/   # React Router loaders
│   └── <sub>/    # Sub-feature helpers (e.g. data/load-data)
├── store/        # Zustand store (UI-only state) when needed
├── types.ts      # Feature types (as-const objects, not literal unions)
└── __tests__/    # Vitest tests + MSW handlers/mocks
```

## Data flow

```
React Router loader  →  TanStack Query (server state)  →  Component (render)
        (orchestration)          (cache/fetch)                 │
                                                               ▼
                                                     Zustand (UI-only state:
                                                     filters, search, pagination)
```

Rules (from `frontend/CLAUDE.md`):

- **TanStack Query is the sole source of truth for API data.** Do not duplicate
  server data into Zustand unless it is genuinely shared across places.
- **Zustand is for UI/cross-cutting state only** (auth token, filters, unread
  badge, theme concerns).
- **Container/Presenter:** hooks hold logic, components stay declarative. Use
  early returns for loading/error/empty; no nested ternaries in JSX.
- **Imports** use Vite path aliases (`@/...`), never deep relative paths.
- **Forms** use react-hook-form with Yup resolvers from `services/forms`.

## App bootstrap

- `src/app/main.tsx` mounts the router inside `AppProviders`.
- `src/app/providers/` wires `QueryProvider` (TanStack Query client),
  `I18nProvider` (i18next), and `ThemeProvider` (`next-themes` + Shadcn theme).
- `src/app/config/` holds the singletons: `apiClient`, `queryClient`, `i18n`.

## Shared layer

- `shared/components/ui` — Shadcn primitives (button, dialog, table, sidebar…)
  added via `make ui-add component=<name>`.
- `shared/components/layout` — `AppLayout`, sidebar, `ErrorView`.
- `shared/store`, `shared/constants` (query keys, storage keys), `shared/hooks`,
  `shared/lib`, `shared/types`, `shared/utils` (e.g. `toast`).

## i18n

All user-facing text comes from `src/shared/locales/{en,fr}/translation.json`
through `useTranslation()`. The initial locale is resolved before React mounts
(localStorage `canopy-locale` → browser language → default `en`). Never
hard-code copy in components.

## Adding a feature (checklist)

1. Create `features/<name>/` with the layout above.
2. Add API functions in `services/api`, a loader in `services/routes`, Yup
   schema in `services/forms` if there's a form.
3. Write the query/mutation hooks in `hooks/`.
4. Build presentational components; wire them in a `pages/` entry.
5. Register the route in `shared/routes/index.tsx` (and `RoutesDefinition.ts`
   for nav) and add i18n keys.
6. Add Vitest tests with MSW handlers under `__tests__/`.
