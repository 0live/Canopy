## FRONTEND: REACT & TYPESCRIPT

### Stack & State
* **Core:** Vite, TS (Strict), Tailwind + Shadcn/ui (Radix).
* **Server State (TanStack Query v5):** SOLE source of truth for API data. No duplication in Zustand except if the data is used in multiple places.
* **Global UI State (Zustand):** Only for cross-cutting concerns or if the data is used in multiple places.
* **Providers:** `i18next` and `ShadcnTheme` via native Providers.
* **Forms:** Use React-hook-form and Yup

### Frontend Development

```bash
# Add npm package (via Docker)
make install-frontend-pkg pkg=<package-name>
make install-frontend-pkg pkg=<package-name> dev=true  # Dev dependency

# Add shadcn component
make ui-add component=<component-name>
```

### Architecture: Vertical Slices
Structure cible : `src/features/[feature-name]/`
* `services/`:
  * `services/api`: Pure API services (Fetch/Axios calls)
  * `services/forms`: Forms schemas (Yup)
  * `services/routes`: Router loaders and route definitions
  * `services/[sub-feature]`: Sub-feature services
* `hooks/`: TanStack Query hooks or forms hooks
* `store/`: Zustand store (UI & Filter state only)
* `components/`: Feature-specific UI components
* `pages/` : Page entry points
* `types/`: Feature-specific types. Always use as const objects instead of string literal unions. 


**Patterns & Flow :**
* **Imports:** Always use Vite path aliases instead of relative paths.
* **Pattern:** Container/Presenter. Hooks/Logic MUST be separated from JSX.
* **Flow:** React Router (Orchestrator) -> TanStack Query (Server State) -> Component (Render) -> Zustand (UI-only state: filters, search, pagination).
* **Rendering:** Early returns for loading/error/empty states. No nested ternaries.


### Testing (Vitest & Playwright)

* **Unit/Integration:** Vitest + RTL + user-event.
* **Mocking:** MSW (Mock Service Worker) for API. **DO NOT** mock TanStack Query hooks.
* **E2E:** Playwright for critical paths (Auth, Core business flows).
* **Command**: `make launch-frontend-test` to run tests.