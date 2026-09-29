# SensorHub Docker Development

**Status:** Phase 1 implemented

Docker Compose is the official development environment. The host is expected
to provide only Git and Docker with Docker Compose.

## Prerequisites

1. Install Docker Desktop with the Compose v2 plugin.
2. Clone the repository.
3. Copy `.env.example` to `.env` and replace the local database passwords.

No host PHP, Composer, Node.js, npm or MySQL installation is required.

## Start the environment

```bash
cp .env.example .env
docker compose build
docker compose up -d
```

On Windows PowerShell, use `Copy-Item .env.example .env` for the copy step.

The services are exposed through Nginx at `http://localhost`. The frontend is
served by Vite and the Laravel health endpoint is available at
`http://localhost/up`.

## Common commands

```bash
# View status and logs
docker compose ps
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql

# Rebuild after Dockerfile or dependency changes
docker compose build --no-cache
docker compose up -d

# Install or update backend dependencies
docker compose exec backend composer install
docker compose exec backend composer update

# Run Laravel commands
docker compose exec backend php artisan about
docker compose exec backend php artisan migrate
docker compose exec backend php artisan test

# Install or update frontend dependencies
docker compose exec frontend npm install
docker compose exec frontend npm run build
docker compose exec frontend npm run lint

# Open a shell in a service
docker compose exec backend bash
docker compose exec frontend sh

# Stop containers while preserving named volumes
docker compose down

# Stop containers and remove the local database volume when a clean database
# is intentionally required
docker compose down -v
```

`docker compose down -v` deletes the local MySQL data volume and should not be
used as a routine shutdown command.

## Environment configuration

The root `.env` is consumed by Compose and supplies container environment
variables. It is intentionally ignored by Git. `.env.example` documents the
required names without committing secrets.

The backend receives its database connection through the Compose service name
`mysql`, not `localhost`. Frontend requests use the Nginx origin so the future
Sanctum cookie and CSRF configuration can be kept first-party.

## Current scope

This phase provides the Laravel and React skeletons plus Nginx, PHP-FPM, Vite
and MySQL containers. It does not implement authentication, API routes,
devices, sensors, measurements, credentials, telemetry or dashboard behavior.
Redis, queues, MQTT and real-time services remain planned.
