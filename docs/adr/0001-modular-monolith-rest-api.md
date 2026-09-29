# ADR 0001: Use a Modular Monolith with a Versioned REST API

- **Status:** Accepted — Planned for implementation
- **Date:** 2026-09-29

## Context

SensorHub must demonstrate Laravel, REST, IoT ingestion, React, Docker and
testable application boundaries in an internationally understandable portfolio.
The repository starts empty, so the first architectural choice will shape both
the implementation and its public documentation.

## Decision

Use a modular monolith with a Laravel 13 API under `/api/v1`, a separately
structured React/TypeScript frontend, a simulator client, and MySQL. Run the
development environment through Docker Compose with Nginx as the HTTP entrypoint.

Use Sanctum's stateful SPA cookie flow for human users and separate hashed
bearer tokens for IoT devices. Represent device credentials as a dedicated
`DeviceCredential` entity so creation, rotation, expiry and revocation have a
real lifecycle. Keep the domain model intentionally small:
`User -> Device -> DeviceCredential/Sensor -> Measurement`.

Use immutable `Sensor.key` values as the device-facing telemetry identifier.
Telemetry batches validate every reading and unit assertion before inserting all
measurements atomically in one database transaction.

## Alternatives considered

### Inertia

Rejected for V1 because it couples the React experience to Laravel page
responses and hides the explicit client/API boundary this portfolio needs to
demonstrate.

### Microservices

Rejected because the initial domain and traffic do not justify distributed
deployment, independent data ownership or operational complexity.

### MQTT-first ingestion

Deferred because HTTP makes the first demo reproducible without a broker. MQTT
can be added later and compared with the HTTP ingestion path.

### Deep clean architecture or CQRS

Deferred because repositories, DTO layers and multiple architectural rings
would add indirection before the domain requires it.

## Consequences

Positive consequences include a clear API contract, independently testable
clients, a small operational footprint and an easy path to future mobile or
physical-device clients.

The trade-off is that Laravel must explicitly maintain authentication, API
versioning and serialization boundaries instead of relying on server-rendered
views. The planned structure also leaves future scaling work, such as queues
and MQTT consumers, for a later decision.
