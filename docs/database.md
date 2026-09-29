# SensorHub V1 Database Model

**Status:** Planned

## Ownership graph

```text
User 1 ──── * Device 1 ──── * Sensor 1 ──── * Measurement
```

Every device belongs to exactly one user. Sensors and measurements are reached
through that ownership chain. User-authenticated queries must never expose a
resource outside the current user's device set.

## Entities

### `users`

Laravel's authenticated user record. The V1 API needs the normal identity and
credential fields plus timestamps.

### `devices`

Represents a physical or simulated device.

| Field | Meaning |
| --- | --- |
| `id` | ULID primary key |
| `user_id` | Owning user |
| `name` | Human-readable device name |
| `identifier` | Device identifier, unique within the system |
| `token_hash` | Hash of the active device credential; never plaintext |
| `token_last_used_at` | Last accepted telemetry time, nullable |
| `created_at`, `updated_at` | UTC timestamps |
| `revoked_at` | Credential/device revocation marker, nullable |

### `sensors`

Represents one measurement channel on a device.

| Field | Meaning |
| --- | --- |
| `id` | ULID primary key |
| `device_id` | Parent device |
| `key` | Stable machine name such as `temperature` |
| `name` | Human-readable sensor name |
| `type` | Measurement type such as `temperature`, `humidity` or `pressure` |
| `unit` | Default display unit, nullable |
| `created_at`, `updated_at` | UTC timestamps |
| `deleted_at` | Soft-delete marker, nullable |

The pair `device_id + key` is unique.

### `measurements`

An immutable value recorded by a sensor.

| Field | Meaning |
| --- | --- |
| `id` | ULID primary key |
| `sensor_id` | Parent sensor |
| `value` | Decimal measurement value |
| `unit` | Unit reported by the client, nullable |
| `measured_at` | Device measurement time in UTC |
| `created_at` | Server persistence time in UTC |

Measurements are append-only in V1. Corrections or deletion workflows are out
of scope.

## Indexes and constraints

- Foreign-key indexes on `devices.user_id`, `sensors.device_id` and
  `measurements.sensor_id`.
- Composite index on `measurements.sensor_id, measured_at` for time-series
  queries.
- Unique constraint on `devices.identifier`.
- Unique constraint on `sensors.device_id, sensors.key`.
- Foreign keys use restrictive deletion for devices and sensors until an
  explicit domain deletion policy is implemented.
- All persisted timestamps use UTC; the API serializes them as ISO 8601.

## Credential lifecycle

Device credentials support create, rotate and revoke. A generated token is
returned only in the creation or rotation response. The database stores only a
cryptographic hash and metadata needed for operational auditing.
