## BACKEND: FASTAPI

### Architecture (Clean)
* **Stack:** FastAPI + SQLModel (PostgreSQL/PostGIS) + Alembic.
* **Layers:** Route (DI) -> Service (Business/UOW) -> Repository (SQL Only).
* **Isolation:** Services cannot access other modules' Repositories. Use Service-to-Service communication if needed.
* **Async:** `async`/`await` mandatory for all DB/IO operations (`AsyncSession`).

### Development Rules
* **Models:** Use `link_model` for M2M (e.g., `UserTeamLink`).
* **Schemas:** Pydantic v2. Use `ConfigDict(from_attributes=True)`.
* **Immutability:** Use `frozen=True` for config/DTOs. Use `.model_copy(update=...)`.
* **Migrations:** Import every new SQLModel in `alembic/env.py`. Use `make-migration`. Always create a new migration file for each change.
* **Errors:** Use `core/exceptions`. I18n for error messages is mandatory.

### API Development

```bash
# Python dependency management uses uv
cd api/ && uv add <package>           # Add dependency
cd api/ && uv add --dev <package>     # Add dev dependency

# Database management
make create-migration m="migration name"  # Create new Alembic migration
make apply-migration                       # Apply pending migrations
make seed                                  # Run database seeds
make setup-db                              # Full DB setup (init, migrate, seed)
make reset-db                              # Destructive reset of database
```

### Testing

* **Unit:** `app/modules/{domain}/services`. Mock all external dependencies.
* **Integration:** `app/modules/{domain}/endpoints`. Use TestContainers (Postgres).
* **Command:** 
    * `make launch-api-tests`: Launch all api tests
    * `cd api/ && ENV=test uv run pytest tests/unit/test_example.py`: Run a single test file
    * `cd api/ && ENV=test uv run pytest tests/unit/test_example.py::test_function_name`: Run a specific test
```
