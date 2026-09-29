# SensorHub Docker Development

**Status:** Phases 0–9 implemented

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
docker compose exec frontend npm test

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

Device routes list/create through the authenticated user's relationship.
Device lists accept `page` and `per_page` (default 25, maximum 100); Sensor
lists are unpaginated. Nested Sensor routes use `scopeBindings()`, yielding
`404` for a mismatched parent; Policies return `403` for foreign resources.
Duplicate identifiers/keys and dependency-protected Device deletes yield
`409`. Sensor delete is soft and retains measurements and key reservation.
`Sensor.key` is immutable; `Sensor.unit` changes only before the first
Measurement. Measurement rows also retain the canonical unit snapshot.

Credential management uses the same SPA session and Device ownership Policy.
Creation returns a `sensorhub_` token with 256 random bits exactly once;
rotation creates a new credential and revokes only the selected old one.
Repeated revocation returns `204`. Multiple credentials may remain active for
one Device. The database stores only SHA-256 digests. Device telemetry instead
uses `Authorization: Bearer <device-token>` and needs no SPA cookie or CSRF
header. A token is valid only for its owning Device and while non-revoked and
non-expired. Successful ingestion updates `last_used_at` in the same MySQL
transaction as its measurements; rejected batches leave it unchanged.
Telemetry accepts 1–100 readings. Each `sensor_key` resolves within the
authenticated Device and excludes soft-deleted sensors. Explicit units must
match. Duplicate sensor/timestamp pairs within a batch return `422`; repeated
keys at different timestamps are accepted. ISO 8601 timestamps with explicit
timezone offsets are normalized to UTC; V1 does not reject future timestamps.

`GET /api/v1/sensors/{sensor}/measurements` uses the SPA session and
Measurement ownership Policy. This route alone resolves soft-deleted Sensors
so owners can read retained history; it never restores a Sensor. Optional
`from` and `to` are inclusive ISO 8601 bounds on `measured_at`, normalized to
UTC. Results use `measured_at ASC, id ASC`, matching the approved V1 order with
a deterministic tie break. Pagination defaults to 25, with a maximum of 100.
An owned Sensor with no matching rows returns an empty paginated `200`. Each
Measurement returns its stored historical `unit` snapshot.

Local HTTP uses `SESSION_SECURE_COOKIE=false`, an HTTP-only host-only
`sensorhub_session` cookie, `SESSION_SAME_SITE=lax`, and the database session
driver. `CORS_ALLOWED_ORIGINS` is an explicit allowlist; credentialed CORS is
enabled for those origins, though ordinary local requests are same-origin.
If `APP_PORT` or the hostname changes, update `APP_URL`,
`SANCTUM_STATEFUL_DOMAINS` (including the port), and `CORS_ALLOWED_ORIGINS`
together. An HTTPS deployment should set `SESSION_SECURE_COOKIE=true` and
configure its exact origins, session domain, and trusted proxy network. No
production HTTPS deployment has been validated.

## React SPA

The frontend lives in `frontend/src`: `features/auth` owns the Context and
hook; `features/devices`, `features/sensors`, and `features/measurements` own
domain API calls and screens; `lib/api.ts` is the single HTTP client; `pages`
contains registration and login; `layouts` contains public and protected
shells; and `components/ui` contains shared controls. React Router handles
`/`, `/login`, `/register`, `/app`, `/app/devices/:deviceId`,
`/app/devices/:deviceId/sensors/:sensorId`, and
`/app/sensors/:sensorId/history` for a soft-deleted Sensor. Authenticated
visitors reaching public auth routes go to `/app`; unauthenticated visitors
reaching protected routes go to `/login`.
The route tree waits for `GET /api/v1/auth/user` before choosing either path.
Network failures show a retry state rather than pretending the session ended.

`VITE_API_URL` defaults to `/api/v1` on the same Nginx origin. Override it in
the root `.env` only when an origin is deliberately configured for credentialed
CORS and Sanctum stateful requests. Frontend configuration comes from Compose;
there is no frontend secret. The client sends cookies with every request,
obtains `/sanctum/csrf-cookie` before registration and login, and reads the
URL-decoded `XSRF-TOKEN` cookie for the `X-XSRF-TOKEN` header on POSTs.
Registration returns a user but does not start a session, so the UI logs in
after a successful registration. No bearer token or auth state is stored in
browser storage. Session restoration always queries the backend after refresh.

Auth Context remains responsible for the browser session. One TanStack
QueryClient manages Device, Sensor and Measurement server state without cache
persistence. `lib/queryKeys.ts` defines keys for paginated Device lists,
Device details, per-Device Sensor lists, Sensor details, and Measurement
histories by Sensor, date bounds, page and page size. Confirmed mutations
invalidate the affected list/details. Logout and domain API `401` clear the
query cache before the next user can access it. The API remains authoritative;
there are no optimistic domain updates.

The Device dashboard exposes owned Devices and their active Sensors. Sensor
edit omits `key` from PATCH requests. A `409` when changing a unit after
measurements exist is shown as a domain conflict. Soft deletion removes a
Sensor from active lists and navigates to a read-only history route; this
history remains accessible by its URL after refresh. There is no archived
Sensor list in V1, so a user who leaves that URL cannot rediscover archived
Sensors in the UI. This limitation does not affect authorized API access.

Measurement filters use browser-local `datetime-local` controls and send
timezone-aware UTC ISO strings. The table displays each Measurement's stored
historical `unit` and local display time. Pagination uses 25 rows per page;
the Recharts line chart shows only the currently loaded raw page, with no
aggregation or implicit fetch of all history. Recharts loads on demand when
the history view is opened.

Credential management UI remains deferred. The approved API has create,
rotate and revoke operations but no GET for existing credential metadata;
therefore the UI could not reconstruct credential state after refresh. No
endpoint was added in Phase 9.

Run `docker compose exec frontend npm test`, `npm run build`, and `npm run lint`
through the frontend service. Tests use Vitest and React Testing Library. The
Nginx entry point serves Vite with history fallback, so refreshing any SPA
route remains supported.

## Current scope

The Laravel API, V1 persistence, SPA authentication, ownership policies,
Device/Sensor CRUD, credential lifecycle, device Bearer authentication,
telemetry ingestion, and read-only Measurement history are implemented. The
React SPA provides Device/Sensor screens and paginated Measurement charts.
Credential management UI and simulator remain planned.
Redis, queues, MQTT and real-time services remain planned.
