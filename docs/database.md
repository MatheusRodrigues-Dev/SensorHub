# SensorHub V1 Database Model

**Status:** Planned

## Ownership graph

```text
User 1 ──── * Device 1 ──── * DeviceCredential
                         └── * Sensor 1 ──── * Measurement
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
| `created_at`, `updated_at` | UTC timestamps |

Device authentication state belongs to `device_credentials`, not to the device
itself. A device may have credential history while only non-revoked, non-expired
credentials can authenticate telemetry.

### `device_credentials`

Represents one device authentication credential and its lifecycle.

| Field | Meaning |
| --- | --- |
| `id` | ULID primary key |
| `device_id` | Parent device |
| `name` | Human-readable credential label |
| `token_hash` | Cryptographic hash; never plaintext |
| `last_used_at` | Last accepted telemetry time, nullable |
| `expires_at` | Expiration time, nullable |
| `revoked_at` | Revocation time, nullable |
| `created_at` | Credential creation time in UTC |

Rotation creates a new credential and revokes the credential being rotated.
Revocation is idempotent for an already revoked credential.

### `sensors`

Represents one measurement channel on a device.

| Field | Meaning |
| --- | --- |
| `id` | ULID primary key |
| `device_id` | Parent device |
| `key` | Stable immutable machine name such as `temperature` |
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
| `unit` | Canonical unit copied from the sensor definition, nullable |
| `measured_at` | Device measurement time in UTC |
| `created_at` | Server receipt/persistence time in UTC |

Measurements are append-only in V1. Corrections or deletion workflows are out
of scope.

## Indexes and constraints

- Foreign-key indexes on `devices.user_id`, `device_credentials.device_id`,
  `sensors.device_id` and `measurements.sensor_id`.
- Composite index on `measurements.sensor_id, measured_at` for time-series
  queries.
- Unique constraint on `devices.identifier`.
- Unique constraint on `sensors.device_id, sensors.key`.
- Indexes on `device_credentials.device_id, revoked_at` and
  `device_credentials.expires_at` for credential validation.
- Foreign keys use restrictive deletion for devices and sensors until an
  explicit domain deletion policy is implemented.
- All persisted timestamps use UTC; the API serializes them as ISO 8601.

## Telemetry and timestamp rules

`Sensor.key` is the stable device-facing identifier. Sensor display names may
change without changing the telemetry contract. The request field is named
`sensor_key` to make this distinction explicit.

`Sensor.unit` is the source of truth. A telemetry reading may include an
optional `unit` assertion, but a different value is rejected with `422`. The
stored measurement unit is the sensor's canonical unit.

Telemetry batches are atomic: the API authenticates the device, validates every
reading and sensor, then inserts all measurements in one transaction. If one
reading fails, no reading from that batch is persisted.

`measured_at` is supplied by the device and describes when the sensor reading
occurred. `created_at` is recorded by the server and describes when the API
received/persisted it. Both are UTC and serialized as ISO 8601.

## Identifier trade-off

Devices, sensors and measurements use ULIDs for consistency and globally unique,
sortable identifiers. This makes public references predictable across clients,
but produces larger indexes than integer keys. Storage and index implications
must be reassessed if telemetry volume becomes significant.

## Credential lifecycle

Device credentials support create, rotate and revoke. A generated token is
returned only in the creation or rotation response. The database stores only a
cryptographic hash and lifecycle metadata needed for validation and auditing.
