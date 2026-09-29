# SensorHub V1 Roadmap

**Status:** Phases 0–6 implemented; later phases planned

## Phase 0 — Contracts and decisions

- Keep architecture, database, API and OpenAPI documents consistent.
- Review the ADR and confirm the V1 scope.
- Validate the OpenAPI document with an OpenAPI 3.1-compatible validator.

**Done when:** a developer can implement the first vertical slice without
inventing endpoint, ownership or authentication behavior.

## Phase 0.1 — Contract review

- Model device credentials as a dedicated `DeviceCredential` lifecycle entity.
- Freeze immutable `Sensor.key` and use `sensor_key` in telemetry payloads.
- Treat `Sensor.unit` as the source of truth and reject conflicting assertions.
- Make telemetry batches atomic and distinguish device `measured_at` from server
  `created_at` receipt time.
- Document Sanctum cookie/CSRF behavior separately from device bearer auth.
- Record the ULID storage/index trade-off for future telemetry-volume review.

**Done when:** `database.md`, `api.md` and `openapi.yaml` describe the same
entities, paths, payload names, authentication schemes and failure behavior.

## Phase 1 — Docker infrastructure

- Create Compose services for Nginx, Laravel API, React frontend and MySQL.
- Add health checks, named volumes, environment examples and service networks.
- Document the Docker-only development commands.

**Done when:** the documented Compose workflow boots the planned services and
the API can reach MySQL.

## Phase 2 — Laravel foundation

- Bootstrap Laravel 13 and Sanctum.
- Configure API versioning, base middleware and the application test harness.
- Establish the Actions, Form Requests, Policies and API Resources conventions.

**Done when:** the Laravel service boots in Docker with a repeatable test
command and the agreed application boundaries are established.

## Phase 3 — Database and domain

- Add ULID-backed devices, credentials, sensors and measurements.
- Add migrations, models, factories and database integrity tests.
- Add user ownership tests and the immutable sensor-key rules.

**Done when:** the domain model and constraints are covered by automated tests.

## Phase 4 — User authentication

- Bootstrap Laravel 13 and Sanctum user authentication.
- Add ownership policies before domain CRUD endpoints.
- Implement registration, login, logout and current-user endpoints.

**Done when:** users can authenticate through the documented SPA cookie flow.

## Phase 5 — Device management

- Implement device and sensor CRUD.
- Add Feature tests for valid, invalid, unauthorized and cross-owner requests.

**Done when:** authenticated users can manage only their own devices and
sensors.

## Phase 6 — IoT authentication and telemetry

- Implement `DeviceCredential` create, rotate and revoke flows.
- Implement device bearer-token middleware.
- Implement atomic batch telemetry ingestion and measurement queries.
- Validate every `sensor_key` and optional unit assertion before persistence.

**Done when:** the simulator can submit readings and an authenticated client
can retrieve them through `/api/v1`.

## Phase 7 — React foundation

- Create the TypeScript/Vite/Tailwind frontend structure.
- Add frontend unit/component tests.

**Done when:** the frontend can authenticate and consume typed API responses.

## Phase 8 — Dashboard

- Add login, device/sensor views, measurement history and loading/error states.

**Done when:** the dashboard presents the complete V1 user workflow.

## Phase 9 — Simulator

- Create the simulator with configurable device credentials and interval.

**Done when:** `docker compose up` plus documented setup steps produces a
repeatable end-to-end demo.

## Phase 10 — Tests, CI and documentation review

- Run backend and frontend test suites in Docker.
- Add CI checks for tests, formatting and OpenAPI validation.
- Reconcile implementation behavior with all planned documents.

**Done when:** the repository is reproducible and its implementation no longer
contradicts the approved contracts.

## Planned later — operational evolution

The following remain explicitly deferred:

- **Redis:** cache, rate limiting or queue backing store — `Planned`.
- **Queue worker:** asynchronous telemetry processing — `Planned`.
- **MQTT broker:** alternative ingestion transport — `Planned`.
- **Real-time delivery:** websocket or SSE dashboard updates — `Planned`.
- **Physical device integration:** ESP32 client — `Planned`.

Each extension requires a new decision and evidence that the current HTTP/
synchronous design is insufficient.
