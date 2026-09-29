# SensorHub V1 Roadmap

**Status:** Planned

## Phase 0 — Contracts and decisions

- Keep architecture, database, API and OpenAPI documents consistent.
- Review the ADR and confirm the V1 scope.
- Validate the OpenAPI document with an OpenAPI 3.1-compatible validator.

**Done when:** a developer can implement the first vertical slice without
inventing endpoint, ownership or authentication behavior.

## Phase 1 — Docker foundation

- Create Compose services for Nginx, Laravel API, React frontend and MySQL.
- Add health checks, named volumes, environment examples and service networks.
- Document the Docker-only development commands.

**Done when:** the documented Compose workflow boots the planned services and
the API can reach MySQL.

## Phase 2 — Laravel domain foundation

- Bootstrap Laravel 13 and Sanctum.
- Add ULID-backed devices, sensors and measurements.
- Add migrations, factories, seeders, policies, resources and validation.
- Implement user registration, login, logout and current-user endpoints.

**Done when:** authenticated users can be created and ownership rules are
covered by automated tests.

## Phase 3 — Device and telemetry vertical slice

- Implement device and sensor CRUD.
- Implement device token create, rotate and revoke flows.
- Implement batch telemetry ingestion and measurement queries.
- Add Feature tests for valid, invalid, unauthorized and cross-owner requests.

**Done when:** the simulator can submit readings and an authenticated client
can retrieve them through `/api/v1`.

## Phase 4 — React dashboard and simulator

- Create the TypeScript/Vite/Tailwind frontend structure.
- Add login, device/sensor views, measurement history and loading/error states.
- Create the simulator with configurable device credentials and interval.
- Add frontend unit/component tests.

**Done when:** `docker compose up` plus documented setup steps produces a
repeatable end-to-end demo.

## Planned later — operational evolution

The following remain explicitly deferred:

- **Redis:** cache, rate limiting or queue backing store — `Planned`.
- **Queue worker:** asynchronous telemetry processing — `Planned`.
- **MQTT broker:** alternative ingestion transport — `Planned`.
- **Real-time delivery:** websocket or SSE dashboard updates — `Planned`.
- **Physical device integration:** ESP32 client — `Planned`.

Each extension requires a new decision and evidence that the current HTTP/
synchronous design is insufficient.
