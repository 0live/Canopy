.PHONY: install-frontend-pkg

# Usage: make install-frontend-pkg pkg=<package-name> [dev=true]
install-frontend-pkg:
	@if [ -z "$(pkg)" ]; then \
		echo "Usage: make install-frontend-pkg pkg=<package-name> [dev=true]"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) exec frontend npm install $(if $(dev),--save-dev,) $(pkg)

# Add a Shadcn component inside the container
# Usage: make ui-add component=button
ui-add:
	@if [ -z "$(component)" ]; then \
		echo "Usage: make ui-add component=<component-name>"; \
		exit 1; \
	fi
	$(DOCKER_COMPOSE) exec frontend npx shadcn@latest add $(component)