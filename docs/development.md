# SensorHub Docker Development

**Status:** Phase 2 backend foundation implemented

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
docker compose run --rm backend php artisan key:generate --show
# Paste the generated value into APP_KEY in the root .env.
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
docker compose exec backend php artisan migrate --force
# Destructive: clears all tables in the selected database.
docker compose exec backend php artisan migrate:fresh --force

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
variables. It is mounted read-only into the backend so Laravel and PHPUnit
can read it; Compose remains the source of the backend's runtime settings.
It is intentionally ignored by Git. `.env.example` documents the
required names without committing secrets.

The backend receives its database connection through the Compose service name
`mysql` on port `3306`, not `localhost`. `DB_FORWARD_PORT` (default `3307`)
publishes MySQL only for optional host tools; Laravel never uses it. Frontend requests use the Nginx origin so the future
Sanctum cookie and CSRF configuration can be kept first-party.

## Backend foundation

`backend/routes/api.php` is mounted at `/api/v1` through `bootstrap/app.php`.
`GET /api/v1/health` is an infrastructure probe; it is outside the planned
SensorHub domain API contract. The existing `/up` route remains Laravel's
framework health check. Future endpoint code should use controllers under
`app/Http/Controllers/Api/V1`, Form Requests under `app/Http/Requests/Api/V1`,
Laravel API Resources under `app/Http/Resources`, and focused actions under
`app/Actions` where they simplify a real use case. Create directories and
classes as they become necessary.

Send `Accept: application/json` on API requests. Send
`Content-Type: application/json` for JSON request bodies. Laravel renders
errors as JSON for every `/api/*` request, including missing routes and
wrong methods, even without an Accept header. Normal web requests retain
Laravel's web response behavior. Disable `APP_DEBUG` outside local development
to avoid exposing exception details.

Response conventions follow Laravel API Resources: one resource is
`{"data": {...}}`; a collection is `{"data": [...]}`; a paginated collection
adds Laravel's `links` and `meta`. Creation uses `201`, updates `200`, and
deletion `204` with no body. Errors use Laravel's `{"message": "..."}`;
validation adds `errors` keyed by field. Authentication failures use `401`,
authorization failures `403`, missing resources `404`, conflicts `409`,
invalid input `422`, and unexpected errors `500`. The planned contract is in
`docs/openapi.yaml`.

## Backend commands

All commands run inside Docker from the repository root:

```bash
docker compose exec backend php artisan route:list --path=api
docker compose exec backend php artisan test
docker compose exec backend php artisan test --testsuite=Unit
docker compose exec backend php artisan test --testsuite=Feature
docker compose exec backend ./vendor/bin/pint --test
docker compose exec backend ./vendor/bin/pint
docker compose exec backend composer install
docker compose exec backend composer update
```

The Laravel skeleton uses PHPUnit for Unit and Feature tests, plus the existing
User factory. Domain factories provide valid Devices, Sensors, Measurements and
DeviceCredentials. For example, a feature test can use
`User::factory()->has(Device::factory())->create()`; attach a sensor with
`Sensor::factory()->for($device)->create()`. Factories and migrations run in
the test database through `RefreshDatabase`.

`phpunit.xml` forces `mysql-testing:3306/sensorhub_testing` with
a dedicated user. The `mysql-testing` service has its own volume and no
published port; its credentials are local test fixtures. `tests/TestCase.php`
rejects a connection configured for any other database. Tests never point
at the development `sensorhub` database. Do not run test migrations against
the development service. The database test service starts with `docker compose
up -d` and may be checked with `docker compose ps mysql-testing`.
It starts on ordinary Compose startup as well; a test-only startup profile can
be considered later if its resource cost becomes inconvenient.

The local SPA and API use one Nginx origin, `http://localhost`. Nginx sends
`/api/*` and `/sanctum/*` to PHP-FPM while serving the React app through Vite.
Sanctum's stateful API middleware applies Laravel sessions and CSRF protection
to requests from `SANCTUM_STATEFUL_DOMAINS`. The four `/api/v1/auth/*` routes
use the `web` session guard; user bearer tokens and device credentials do not
authenticate them. Policies in `app/Policies` follow ownership through Device.
Authentication routes require a first-party `Origin` or `Referer` so Sanctum
can establish the SPA session; requests without one receive JSON `419`.

For a browser client, request `GET /sanctum/csrf-cookie` first with cookies
enabled. Send `Accept: application/json` and `Content-Type: application/json`
for auth JSON bodies. For each POST, send the current URL-decoded `XSRF-TOKEN`
cookie as `X-XSRF-TOKEN`. Login rotates the session and CSRF cookie, so reread
the cookie before logout. `POST /api/v1/auth/register` creates an account and
returns `201` without logging in. Login and logout return `204`. The current
user endpoint returns `id`, `name` and `email` only. A missing CSRF token gives
`419`; unauthenticated access gives JSON `401`. Login is limited to ten
attempts per minute per IP and five per normalized email, using Laravel's existing
cache configuration.

Local HTTP uses `SESSION_SECURE_COOKIE=false`, an HTTP-only host-only
`sensorhub_session` cookie, `SESSION_SAME_SITE=lax`, and the database session
driver. `CORS_ALLOWED_ORIGINS` is an explicit allowlist; credentialed CORS is
enabled for those origins, though ordinary local requests are same-origin.
If `APP_PORT` or the hostname changes, update `APP_URL`,
`SANCTUM_STATEFUL_DOMAINS` (including the port), and `CORS_ALLOWED_ORIGINS`
together. An HTTPS deployment should set `SESSION_SECURE_COOKIE=true` and
configure its exact origins, session domain, and trusted proxy network. No
production HTTPS deployment has been validated.

## Current scope

The Laravel and React skeletons, versioned API foundation, V1 domain
persistence, SPA user authentication and ownership policies are implemented.
Domain CRUD routes, device bearer authentication, telemetry and dashboard
behavior remain planned.
Redis, queues, MQTT and real-time services remain planned.
