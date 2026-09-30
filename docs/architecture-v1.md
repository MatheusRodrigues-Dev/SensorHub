# SensorHub V1 Architecture

**Status:** Implemented V1 topology; post-V1 components remain under consideration

## Summary

SensorHub is a lightweight modular monolith: one Laravel application owns the
domain, authentication, REST API and persistence. The React dashboard and
optional simulator are separate API clients in the same repository.

```text
Browser → Nginx → React SPA ── session/CSRF ──→ Laravel REST API → MySQL
Simulator ── Bearer DeviceCredential ──→ Nginx → Laravel telemetry API → MySQL
MySQL → Measurement history API → React table and chart
```

## Principles

### Docker-first

Docker Compose is the official development environment. PHP, Composer, Node,
the frontend toolchain and MySQL run in containers. The host is not expected to
provide those runtimes.

### API-first

The dashboard and devices use the Laravel API exclusively. The API is versioned
from the first endpoint at `/api/v1`, so additional clients can be added
without coupling them to Laravel views.

### Simple-first

The first version uses synchronous HTTP ingestion and MySQL persistence. Redis,
queue workers, MQTT and real-time updates are planned extensions, not required
dependencies of the initial system.

## Components

| Component | Responsibility | V1 status |
| --- | --- | --- |
| `nginx` | HTTP entrypoint and routing to API/frontend services | Implemented |
| `api` | Laravel REST API, authentication, validation, domain actions and resources | Implemented |
| `frontend` | React dashboard consuming JSON over HTTP | Implemented |
| `mysql` | Durable application and telemetry data | Implemented |
| `simulator` | Reproducible synthetic telemetry producer for demos | Implemented, optional Compose profile |
| `redis` | Cache, queues or rate-limit backing store | Planned later |
| `queue-worker` | Asynchronous processing | Planned later |
| `mqtt-broker` | MQTT ingestion for constrained devices | Planned later |

## Backend shape

Requests flow through Laravel Form Requests, API controllers, focused Actions,
Eloquent models and API Resources where each is appropriate:

```text
Request -> Controller -> Action (when needed) -> Model -> Database
Database -> Model -> API Resource -> JSON response
```

Controllers remain orchestration layers. Batch telemetry logic lives in an
Action; validation uses Form Requests, authorization uses Policies, and response
serialization uses API Resources.

## Authentication boundaries

- Human users authenticate with Sanctum's stateful SPA cookie flow and CSRF
  protection.
- Devices authenticate with a dedicated bearer token represented by a
  `DeviceCredential` record. Only a hash is stored in MySQL. The plaintext token
  is shown once when created or rotated.
- User endpoints use user authentication; telemetry ingestion uses device
  authentication. The two credentials must never be interchangeable.

The local Docker/Nginx topology serves the frontend and API from one
first-party origin (`http://localhost`). Sanctum stateful domains, cookie
settings, CSRF and CORS are configured together. A future split across
subdomains would require an explicit coordinated configuration change.

## Deliberately deferred capabilities

MQTT ingestion, Redis, queue workers, websocket or SSE updates, mobile clients,
and multi-user device sharing are outside V1. Each may be introduced through a
separate decision after a measurable requirement appears.
