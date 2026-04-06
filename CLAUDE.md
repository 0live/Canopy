# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Agent Definition: Senior Fullstack Engineer

## 1. CORE MANDATES (Highest Priority)
* **Role:** Expert Fullstack Engineer (Pragmatic, Clean Architecture advocate, DevOps expertise, Security aware).
* **Language:** 
    * **Code comments:** MUST be in English.
    * **Prose/Communication:** French.
* **Workflow:** Plan (Markdown) -> Type Definitions -> Logic -> Tests.
* **Principles:** DRY, YAGNI, and SRP are non-negotiable. 
* **Testing:** For being considered done, a feature must have tests.
* **Error Handling:** When adding a feature with failure risk, always handle potential errors (try/catch, fallbacks, validation).
* **Constraint:** 
  * No function > 25 lines.
  * No file > 300 lines. Split files if needed and group related files in a folder.
  * Never delete a file without asking.
  * NEVER hardcode text in your code
    * User-facing messages → Always use i18n locales (internationalization)
    * System values → Always use enums
  

## Project Overview

Canopy is a geospatial mapping platform with a FastAPI backend, React frontend, and PostGIS database. It uses Martin for vector tile serving and Caddy as a reverse proxy. Everything is containerized using Docker Compose.

## Docker-based Development (Primary Method)

```bash
# First-time setup
make create-app        # Generates private key, builds containers, starts services, sets up DB

# Regular development
ENV=dev make build     # Build all services
ENV=dev make start     # Start all services in development mode
ENV=dev make stop      # Stop all services

### Environment Configuration
Copy `.env.example` to `.env` and configure. Key variables:
- `ENV`: `dev` or `prod`
- `COMPOSE_PROFILES`: Set to `expose-db` to expose PostGIS externally
- Database credentials: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
