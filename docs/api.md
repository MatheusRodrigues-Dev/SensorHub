# SensorHub V1 API Guide

**Status:** Planned  
**Base path:** `/api/v1`

The authoritative machine-readable contract is [`openapi.yaml`](openapi.yaml).

## Authentication

### User SPA

The React client first obtains the Sanctum CSRF cookie, then submits login
credentials. Subsequent requests use the stateful session cookie and CSRF token.
User endpoints require the authenticated session.

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
| `POST` | `/devices/{device}/credentials` | User | Create a device token |
| `POST` | `/devices/{device}/credentials/rotate` | User | Rotate the token |
| `DELETE` | `/devices/{device}/credentials` | User | Revoke the token |
| `GET` | `/sensors/{sensor}/measurements` | User | Query measurements |
| `POST` | `/devices/{device}/telemetry` | Device | Ingest a batch |

## Telemetry example

```json
{
  "measurements": [
    {
      "sensor": "temperature",
      "value": 24.8,
      "unit": "°C",
      "measured_at": "2026-09-29T12:30:00Z"
    },
    {
      "sensor": "humidity",
      "value": 61.2,
      "unit": "%",
      "measured_at": "2026-09-29T12:30:00Z"
    }
  ]
}
```

The `sensor` value is the stable sensor key belonging to the addressed device.
The server validates ownership of the key and persists each accepted reading.

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
