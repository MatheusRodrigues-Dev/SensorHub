# SensorHub V1 Architecture

**Status:** Planned

## Summary

SensorHub will be a lightweight modular monolith: one Laravel application will
own the domain, authentication, REST API and persistence, while the React
dashboard and IoT simulator will remain separate clients in the same
repository.

```text
IoT device / simulator ──HTTPS──┐
                                ├──> Laravel REST API ──> MySQL
React SPA ─────────────JSON─────┘
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
| `nginx` | HTTP entrypoint and routing to API/frontend services | Planned |
| `api` | Laravel REST API, authentication, validation, domain actions and resources | Planned |
| `frontend` | React dashboard consuming JSON over HTTP | Planned |
| `mysql` | Durable application and telemetry data | Planned |
| `simulator` | Reproducible device telemetry producer for demos | Planned |
| `redis` | Cache, queues or rate-limit backing store | Planned later |
| `queue-worker` | Asynchronous processing | Planned later |
| `mqtt-broker` | MQTT ingestion for constrained devices | Planned later |

## Backend shape

Requests will flow through Laravel Form Requests, API controllers, Actions or
Services, Eloquent models and API Resources:

```text
Request -> Controller -> Action/Service -> Model -> Database
Database -> Model -> API Resource -> JSON response
```

Controllers should remain orchestration layers. Domain behavior belongs in
Actions or Services, validation in Form Requests, authorization in Policies,
and response serialization in API Resources.

## Authentication boundaries

- Human users authenticate with Sanctum's stateful SPA cookie flow and CSRF
  protection.
- Devices authenticate with a dedicated bearer token. Only a hash is stored in
  MySQL. The plaintext token is shown once when created or rotated.
- User endpoints use user authentication; telemetry ingestion uses device
  authentication. The two credentials must never be interchangeable.

## Deliberately deferred capabilities

MQTT ingestion, Redis, queue workers, websocket or SSE updates, mobile clients,
and multi-user device sharing are outside V1. Each may be introduced through a
separate decision after a measurable requirement appears.
