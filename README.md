# SensorHub

SensorHub is an independent IoT monitoring platform built as a portfolio and
learning project using original code and synthetic test data. It combines a
Laravel REST API, a React dashboard, and a Docker-first development workflow.

Docker infrastructure, the versioned API foundation, the V1 persistence model,
and user SPA authentication with ownership policies are implemented. The React
SPA supports registration, login, session restoration and logout. Device
and Sensor CRUD endpoints, credential lifecycle, device Bearer authentication,
atomic telemetry ingestion, and historical Measurement queries are implemented.
The React dashboard supports Device and Sensor management, archived Sensor
history, credential management, and paginated Measurement history with a
current-page time-series chart. An optional simulator sends synthetic
telemetry using the public Bearer API.

## Stack

- Backend: Laravel 13, PHP 8.4, Eloquent and MySQL
- API: versioned REST API under `/api/v1`
- Frontend: React, TypeScript, Vite and Tailwind CSS 4
- User authentication: Laravel Sanctum with stateful SPA cookies and CSRF
- Device authentication: hashed device bearer tokens
- Infrastructure: Docker Compose and Nginx
- Testing: Laravel Feature/Unit tests, Vitest, React Testing Library and Node tests

## Architectural principles

1. **Docker-first** — PHP, Composer, Node.js and MySQL are provided by Docker;
   the host only needs Git and Docker Compose.
2. **API-first** — the React dashboard and IoT devices communicate with
   Laravel through the versioned JSON API.
3. **Simple-first** — Redis, queues, MQTT and real-time delivery remain
   post-V1 considerations until a concrete requirement justifies them.

## V1 flow

```text
Browser → Nginx → React SPA → Laravel REST API → MySQL
Simulator ── Bearer DeviceCredential ──→ Nginx → Laravel telemetry API → MySQL
MySQL → Measurement query API → React table and Recharts chart
```

The browser uses a Sanctum session cookie and CSRF protection. The simulator
uses an independent Device token. Laravel stores only its SHA-256 digest;
creation and rotation show the plaintext token once. The chart displays the
current page of raw Measurements, not an aggregate or complete history.

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

Register in the SPA, add a Device, then add a Sensor with a stable `key` and
unit. Create a credential from the Device page and save its one-time token.
Configure the root `.env` with `SENSORHUB_DEVICE_ID`,
`SENSORHUB_DEVICE_TOKEN`, and `SENSORHUB_SENSORS` matching that Sensor, then
run:

```bash
docker compose --profile simulator build simulator
docker compose --profile simulator run --rm simulator npm run once
```

Open the Sensor history to see the synthetic reading in the table and chart.
Use `npm run continuous` in the simulator container for periodic batches.
See [simulator configuration](simulator/.env.example) and the
[development guide](docs/development.md) for tests and the full workflow.

## Repository layout

```text
backend/    Laravel API
frontend/   React SPA foundation
simulator/  Optional TypeScript synthetic telemetry client
docker/     Nginx, PHP and MySQL images/configuration
docs/       Architecture and API contracts
compose.yaml
```

## Validation and limits

GitHub Actions runs Docker backend, frontend, simulator and OpenAPI checks.
Locally, run `docker compose exec backend php artisan test`,
`docker compose exec frontend npm test`, and
`docker compose --profile simulator run --rm --no-deps simulator npm test`.
The simulator generates synthetic values; SensorHub does not claim real-time
streaming, MQTT support, production readiness or measured scale. MQTT, Redis,
queues, aggregation, alerting and deployment remain possible future work.

## License

SensorHub is licensed under the [MIT License](LICENSE). Copyright (c) 2026
Matheus de Sousa Rodrigues.
