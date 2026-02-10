init-alembic:
	cd api && uv run alembic init alembic

create-migration:
	$(DOCKER_COMPOSE) exec api uv run alembic revision --autogenerate -m "$(m)"

apply-migration:
	$(DOCKER_COMPOSE) exec api uv run alembic upgrade head

seed:
	$(DOCKER_COMPOSE) exec api uv run python -m app.core.seeds

apply-init-db:
	$(DOCKER_COMPOSE) exec -T postgis psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < docker/postgis/init_db.sql

setup-db: apply-init-db apply-migration seed

reset-db:
	$(DOCKER_COMPOSE) down -v
	sudo rm -rf docker/postgis/data/*
	$(MAKE) start
	$(MAKE) apply-migration
	$(MAKE) seed