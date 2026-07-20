init-alembic:
	cd api && uv run alembic init alembic

create-migration:
	$(DOCKER_COMPOSE) exec api alembic revision --autogenerate -m "$(m)"

apply-migration:
	$(DOCKER_COMPOSE) exec api alembic upgrade head

seed:
	$(DOCKER_COMPOSE) exec api python -m app.core.seeds

bootstrap-admin:
	$(DOCKER_COMPOSE) exec api python -m app.modules.setup_root_user.bootstrap

apply-init-db:
	$(DOCKER_COMPOSE) exec -T postgis psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < docker/postgis/init_db.sql

guard-existing-db:
ifeq ($(ENV),prod)
	@if $(DOCKER_COMPOSE) run --rm -T --no-deps --entrypoint sh postgis -c \
		'[ -f /var/lib/postgresql/data/PG_VERSION ]'; then \
		if [ "$(REMOVE_EXISTING_DB)" != "yes" ]; then \
			echo "❌ An existing PostGIS database was found"; \
			echo "   If you want to relaunch the app and keep existing data, run 'make start'"; \
			echo "   Re-run with 'make create-app REMOVE_EXISTING_DB=yes' to permanently delete the existing database and start a clean install."; \
			exit 1; \
		else \
			echo "⚠️  REMOVE_EXISTING_DB=yes: deleting the existing database before a clean install."; \
			$(MAKE) stop-and-delete-data; \
		fi; \
	fi
endif

ifeq ($(ENV),dev)
setup-db: apply-init-db apply-migration seed
else
setup-db: apply-init-db apply-migration bootstrap-admin
endif

reset-db: stop-and-delete-data
	$(MAKE) start
	$(MAKE) apply-migration
ifeq ($(ENV),dev)
	$(MAKE) seed
else
	$(MAKE) bootstrap-admin
endif

backup-db:
	@mkdir -p backups
	$(DOCKER_COMPOSE) exec -T postgis pg_dump -U ${POSTGRES_USER} -d ${POSTGRES_DB} -Fc > backups/canopy_$$(date +%Y%m%d_%H%M%S).dump

restore-db:
	$(DOCKER_COMPOSE) exec -T postgis pg_restore -U ${POSTGRES_USER} -d ${POSTGRES_DB} --clean --if-exists < $(file)

launch-api-tests:
	cd api/ && ENV=test uv run pytest