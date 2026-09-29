# SensorHub V1 API Guide

**Status:** User authentication implemented; domain endpoints planned
**Base path:** `/api/v1`

The authoritative machine-readable contract is [`openapi.yaml`](openapi.yaml).

## Authentication

### User SPA

The React client first calls Laravel's `/sanctum/csrf-cookie` endpoint, then
submits login credentials to `/api/v1/auth/login`. Subsequent requests use the
stateful session cookie; state-changing requests send the URL-decoded
`XSRF-TOKEN` cookie value in `X-XSRF-TOKEN`. Login regenerates the session, so
clients must read the current CSRF cookie before each later write, including
logout. Registration creates an account and returns the user; it does not log
the user in. Login and logout return `204`; current-user returns only `id`,
`name` and `email` in `data`.

Locally, the React development server and Laravel API share the Nginx origin
`http://localhost`. The session cookie is host-only, HTTP-only and SameSite=Lax.
Sanctum recognizes the configured first-party host. Cross-origin deployment
would require coordinating the stateful domains, session domain, HTTPS cookies
and explicit credentialed CORS allowlist; it has not been validated.

### Device telemetry

Device ingestion uses:

```http
Authorization: Bearer sensorhub_<plaintext-token>
```

The token is generated, rotated or revoked through an authenticated user
operation. It is never returned by read endpoints.

## Endpoint catalogue

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create a user |
| `POST` | `/auth/login` | Public | Start a user session |
| `POST` | `/auth/logout` | User | End the session |
| `GET` | `/auth/user` | User | Return the current user |
| `GET` | `/devices` | User | List owned devices |
| `POST` | `/devices` | User | Create a device |
| `GET` | `/devices/{device}` | User | Show an owned device |
| `PATCH` | `/devices/{device}` | User | Update an owned device |
| `DELETE` | `/devices/{device}` | User | Remove an owned device |
| `GET` | `/devices/{device}/sensors` | User | List device sensors |
| `POST` | `/devices/{device}/sensors` | User | Create a sensor |
| `GET` | `/devices/{device}/sensors/{sensor}` | User | Show a sensor |
| `PATCH` | `/devices/{device}/sensors/{sensor}` | User | Update a sensor |
| `DELETE` | `/devices/{device}/sensors/{sensor}` | User | Remove a sensor |
| `POST` | `/devices/{device}/credentials` | User | Create a named device token |
| `POST` | `/devices/{device}/credentials/{credential}/rotate` | User | Rotate a token |
| `DELETE` | `/devices/{device}/credentials/{credential}` | User | Revoke a token |
| `GET` | `/sensors/{sensor}/measurements` | User | Query measurements |
| `POST` | `/devices/{device}/telemetry` | Device | Ingest a batch |

Only the four `/auth/*` routes above are implemented. The other catalogue
entries remain planned. Login is limited to ten attempts per minute per IP and
five per normalized email; excess requests receive `429`. Missing or invalid CSRF on a
state-changing first-party request returns `419`.

## Telemetry example

```json
{
  "measurements": [
    {
      "sensor_key": "temperature",
      "value": 24.8,
      "unit": "°C",
      "measured_at": "2026-09-29T12:30:00Z"
    },
    {
      "sensor_key": "humidity",
      "value": 61.2,
      "unit": "%",
      "measured_at": "2026-09-29T12:30:00Z"
    }
  ]
}
```

The `sensor_key` value is the immutable machine key belonging to the addressed
device. It is not the sensor's display name. The server validates ownership of
every key before writing the batch.

`Sensor.unit` is the source of truth. The optional telemetry `unit` is an
assertion only; if it differs from the sensor's configured unit, the entire
request returns `422` and nothing is persisted.

Telemetry batches are atomic. The API validates authentication, every sensor
key and every unit assertion before opening one database transaction. Any
failure rolls back the complete batch.

`measured_at` is the device-side event time. The measurement's `created_at` is
the server receipt/persistence time, allowing delayed or offline telemetry to
be diagnosed.

## Response and error conventions

- Single resources use a `data` object.
- Collections use `data` plus pagination metadata.
- Creation returns `201`; successful updates return `200`; successful deletes
  return `204`.
- Invalid input returns `422` with field-level errors.
- Missing or invalid authentication returns `401`.
- An authenticated user without ownership returns `403`.
- An unknown resource returns `404`.
- Credential conflicts or duplicate identifiers return `409`.
- A unit assertion that conflicts with the sensor definition returns `422`.
- Unexpected failures use `500` and must not expose internals.

Error bodies use a consistent shape:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "name": ["The name field is required."]
  }
}
```

Measurement queries accept `from`, `to`, `per_page` and `page`. `from` and `to`
are ISO 8601 timestamps and the default sort is ascending by `measured_at`.
