# SensorHub

SensorHub is a portfolio-oriented IoT telemetry platform built around a
Laravel REST API, a React dashboard, and a Docker-first development workflow.

Docker infrastructure, the versioned API foundation, the V1 persistence model,
and user SPA authentication with ownership policies are implemented. The React
SPA supports registration, login, session restoration and logout. Device
and Sensor CRUD endpoints, credential lifecycle, device Bearer authentication,
atomic telemetry ingestion, and historical Measurement queries are implemented.
The React dashboard now supports Device and Sensor management plus paginated
Measurement history with a current-page time-series chart. Credential
management UI and the simulator remain planned.

## Stack

- Backend: Laravel 13, PHP 8.4/8.5, Eloquent and MySQL
- API: versioned REST API under `/api/v1`
- Frontend: React, TypeScript, Vite and Tailwind CSS 4
- User authentication: Laravel Sanctum with stateful SPA cookies and CSRF
- Device authentication: hashed device bearer tokens
- Infrastructure: Docker Compose and Nginx
- Testing: Laravel Feature/Unit tests, Vitest and React Testing Library

## Architectural principles

1. **Docker-first** — PHP, Composer, Node.js and MySQL are provided by Docker;
   the host only needs Git and Docker Compose.
2. **API-first** — the React dashboard and IoT devices communicate with
   Laravel through the versioned JSON API.
3. **Simple-first** — Redis, queues, MQTT and real-time delivery remain planned
   extensions until a concrete requirement justifies them.

## Documentation

- [V1 architecture](docs/architecture-v1.md)
- [Architecture decision record](docs/adr/0001-modular-monolith-rest-api.md)
- [Database model](docs/database.md)
- [Human-readable API guide](docs/api.md)
- [OpenAPI 3.1 contract](docs/openapi.yaml)
- [Implementation roadmap](docs/roadmap.md)
- [Docker development guide](docs/development.md)

## Development quick start

```bash
cp .env.example .env
docker compose build
docker compose run --rm backend php artisan key:generate --show
# Paste the output into APP_KEY in the root .env.
docker compose up -d
docker compose exec backend php artisan migrate --force
```

Open `http://localhost` after the containers are healthy. The complete
Docker-based workflow, commands and environment variables are documented in
the [development guide](docs/development.md).

## Repository layout

```text
backend/    Laravel API
frontend/   React SPA foundation
simulator/  IoT telemetry simulator (planned)
docker/     Nginx, PHP and MySQL images/configuration
docs/       Architecture and API contracts
compose.yaml
```
