---
sidebar_position: 3
---

# Frontend Testing

The frontend is tested with **Vitest**, **React Testing Library** and **MSW**
(Mock Service Worker). Tests live next to each feature under `__tests__/`.

## Running

```bash
make launch-frontend-tests      # = npm run test (in the frontend/ container/dir)
npm run test                    # watch mode (Vitest)
npm run test:coverage           # single run with V8 coverage
npm run lint                    # ESLint
```

## Setup

- `src/test/setup.ts` — global test setup (jest-dom matchers, MSW server
  lifecycle).
- `src/test/mocks/server.ts` — the MSW `setupServer` instance.
- `src/test/utils/renderWithProviders.tsx` — render helper that wraps a
  component in the real providers (Query, i18n, theme, router) so tests exercise
  the true wiring.

## Conventions

- **Mock the network with MSW**, per feature. Each feature ships its own
  handlers, e.g. `features/auth/__tests__/mocks/handlers.ts`,
  `features/admin/__tests__/mocks/handlers.ts`.
- **Do not mock TanStack Query hooks.** Test through the real hooks against MSW
  so caching/refetch behaviour is covered.
- Use **user-event** for interactions rather than firing raw events.
- Test the layers that hold logic: hooks, form schemas, route loaders, stores,
  and component behaviour — mirroring the folders under `__tests__/`
  (`components/`, `hooks/`, `services/`, `store/`).

## What is covered today

The suites already cover auth (forms, hooks, schemas, loaders, store), admin
(users table/dialogs, pagination, hooks, loaders), and user profile
(notifications store + websocket hook, profile forms, db-access hooks). New
features are expected to arrive with equivalent coverage — per project rules, a
feature is not "done" without tests.

## E2E (planned)

`frontend/CLAUDE.md` designates **Playwright** for critical-path E2E (auth, core
business flows). No Playwright suite is present in the repo yet.
