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
	$(DOCKER_COMPOSE) down -v

genpkey:
	echo "PRIVATE_KEY=$$(openssl rand -hex 32)" >> .env

genaltchakey:
	echo "ALTCHA_HMAC_KEY=$$(openssl rand -hex 32)" >> .env

launch-tests:
	cd api/ && ENV=test uv run pytest

create-app: genpkey genaltchakey build start setup-db

rebuild-restart: stop build start


