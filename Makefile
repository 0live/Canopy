-include .env
-include api/Makefile
-include docs/Makefile
-include frontend/Makefile

ifeq ($(ENV),prod)
    COMPOSE_FILES = -f docker-compose.yml
else ifeq ($(ENV),dev)
    COMPOSE_FILES = -f docker-compose.yml -f docker-compose.override.yml
else
    $(error "ENV must be set to 'prod' or 'dev'")
endif

DOCKER_COMPOSE = docker compose $(COMPOSE_FILES) --env-file .env
PROFILES = $(if $(COMPOSE_PROFILES),--profile $(COMPOSE_PROFILES),)

build:
	$(DOCKER_COMPOSE) build

start:
	$(DOCKER_COMPOSE) $(PROFILES) up -d

stop:
	$(DOCKER_COMPOSE) down

stop-and-delete-data:
	$(DOCKER_COMPOSE) $(PROFILES) down -v
	sudo sh -c 'rm -rf docker/postgis/data/*'

genpkey:
	@[ -s .env ] && [ -n "$$(tail -c1 .env)" ] && echo "" >> .env; \
	if ! grep -q '^PRIVATE_KEY=' .env 2>/dev/null; then \
		echo "PRIVATE_KEY=$$(openssl rand -hex 32)" >> .env; \
	fi

genaltchakey:
	@[ -s .env ] && [ -n "$$(tail -c1 .env)" ] && echo "" >> .env; \
	if ! grep -q '^ALTCHA_HMAC_KEY=' .env 2>/dev/null; then \
		echo "ALTCHA_HMAC_KEY=$$(openssl rand -hex 32)" >> .env; \
	fi

launch-all-tests:
	$(MAKE) launch-api-tests
	$(MAKE) launch-frontend-tests

create-app: genpkey genaltchakey guard-existing-db build start setup-db

rebuild-restart: stop build start


