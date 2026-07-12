---
sidebar_position: 5
---

# Project Conventions

These are the engineering rules enforced in this repo, taken from the root and
per-package `CLAUDE.md` files, illustrated with real code.

## Language

- **Code comments and docstrings: English.** See any service, e.g.
  `app/modules/db_access/service.py`.
- **User-facing prose and UI text: French / i18n** (never hard-coded).

## Size limits

- **No function longer than 25 lines.**
- **No file longer than 300 lines** — split and group related files in a folder.

The backend module layout is a direct consequence: each domain is split into
`endpoints / service / repository / models / schemas` instead of one big file.

## No hard-coded text — always i18n or enums

**User-facing messages → i18n.** The backend loads messages from
`app/locales/{en,fr}.json` via `MessageService`, and raises typed exceptions
with a message **key**, not a literal:

```python
# app/modules/import_data/upload_service.py
raise FileUploadException(
    key="import_data.upload_invalid_format",
    params={"allowed": ", ".join(allowed)},
)
```

On the frontend, all copy goes through `react-i18next`
(`src/shared/locales/{en,fr}/translation.json`):

```tsx
// src/shared/components/ui/Wip.tsx
const { t } = useTranslation();
<h1>{t("wip.title")}</h1>
```

**System values → enums.** No magic strings for roles, schemas, parameters:

```python
# roles, schemas, app parameters are enums / constants
UserRole.ADMIN                       # app/modules/users/enums.py
PostgreSQLSchema.APP_DATA            # app/core/enums/postgresql_schema.py
AppParameter.REFRESH_TOKEN_COOKIE_NAME  # "canopy_rt"
```

On the frontend, types use `as const` objects rather than string-literal unions
(e.g. `src/shared/types/UserRole.ts`).

## Principles

- **DRY / YAGNI / SRP** are non-negotiable.
- **Error handling**: any operation that can fail must handle it (try/except,
  validation, fallbacks). See the `create_role` / `role_exists` guards in
  `db_access/service.py`.

## Backend architecture rules

- **Layers:** `Route (DI) → Service (business/unit-of-work) → Repository
  (SQL only)`.
- **Module isolation:** a service must not import another module's repository.
  Use service-to-service calls instead.
- **Async everywhere** for DB/IO (`AsyncSession`, `async`/`await`).
- **Schemas:** Pydantic v2, `ConfigDict(from_attributes=True)`, `frozen=True`
  for DTOs/config; use `.model_copy(update=...)` for changes.
- **Migrations:** every new SQLModel table must be imported in
  `alembic/env.py`; create a new migration per change with
  `make create-migration m="..."`.

## Frontend architecture rules

- **Vertical slices:** `src/features/<feature>/` with
  `services/{api,forms,routes}`, `hooks/`, `store/`, `components/`, `pages/`,
  `types.ts`.
- **Server state = TanStack Query** (sole source of truth for API data).
  **UI-only state = Zustand** (filters, pagination, cross-cutting UI).
- **Container/Presenter:** logic lives in hooks, JSX stays declarative; early
  returns for loading/error/empty (no nested ternaries).
- **Imports** use Vite path aliases (`@/...`), never long relative paths.
- **Forms:** react-hook-form + Yup schemas under `services/forms`.

## Testing

- A feature is not "done" without tests.
- **Backend:** `tests/unit` (services, mocked deps) and `tests/integration`
  (Testcontainers Postgres, real migrations). Run with `make launch-api-tests`
  or `ENV=test uv run pytest ...`.
- **Frontend:** Vitest + React Testing Library + MSW (do **not** mock TanStack
  Query hooks). Run with `make launch-frontend-tests` / `npm run test`.
