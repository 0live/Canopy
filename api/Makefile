init-alembic:
	cd api && uv run alembic init alembic

create-migration:
	$(DOCKER_COMPOSE) exec api uv run alembic revision --autogenerate -m "$(m)"

apply-migration:
	$(DOCKER_COMPOSE) exec api uv run alembic upgrade head

seed:
	$(DOCKER_COMPOSE) exec api uv run python -m app.core.seeds

bootstrap-admin:
	$(DOCKER_COMPOSE) exec api uv run python -m app.modules.setup_root_user.bootstrap

apply-init-db:
	$(DOCKER_COMPOSE) exec -T postgis psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < docker/postgis/init_db.sql

ifeq ($(ENV),dev)
setup-db: apply-init-db apply-migration seed
else
setup-db: apply-init-db apply-migration bootstrap-admin
endif

reset-db:
	$(DOCKER_COMPOSE) down -v
	sudo rm -rf docker/postgis/data/*
	$(MAKE) start
	$(MAKE) apply-migration
ifeq ($(ENV),dev)
	$(MAKE) seed
else
	$(MAKE) bootstrap-admin
endif

launch-api-tests:
	cd api/ && ENV=test uv run pytest