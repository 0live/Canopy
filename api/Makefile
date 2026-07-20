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