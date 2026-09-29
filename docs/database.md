# SensorHub V1 Database Model

**Status:** Persistence implemented; API behavior planned

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
Multiple credentials may remain active on one Device. Rotation affects only
the selected credential; the replacement has a new ULID and copies its name.
Tokens use `sensorhub_` followed by 43 base64url characters from 32 random
bytes (256 bits of entropy). Only the complete token's SHA-256 digest is stored.
`last_used_at` advances in the same transaction as a successfully persisted
telemetry batch; rejected batches leave it unchanged.

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
`Sensor.key` is immutable through Eloquent. Its unique constraint continues to
reserve the key after soft deletion.
`Sensor.name` may change. `Sensor.unit` may change only before the first
measurement; after that it is immutable, even though each measurement also
stores a copy of the canonical unit for historical interpretation.

### `measurements`

An immutable value recorded by a sensor.

| Field | Meaning |
| --- | --- |
| `id` | ULID primary key |
| `sensor_id` | Parent sensor |
| `value` | MySQL `DOUBLE` measurement value |
| `unit` | Canonical unit copied from the sensor definition, nullable |
| `measured_at` | Device measurement time in UTC |
| `created_at` | Server receipt/persistence time in UTC |

Measurements are append-only in V1. Corrections or deletion workflows are out
of scope. Eloquent prevents updates and deletes; database writes must follow
the same rule. Telemetry ingestion creates Measurements; the query endpoint
remains planned.

`value` uses `DOUBLE` because heterogeneous physical telemetry needs a broad
numeric range without one arbitrary decimal scale. Exact decimal arithmetic is
not a V1 requirement. Floating-point values must not be compared for exact
equality; use a tolerance appropriate to the sensor and its uncertainty.

## Indexes and constraints

- Foreign-key indexes on `devices.user_id`, `device_credentials.device_id`,
  `sensors.device_id` and `measurements.sensor_id`.
- Composite index on `measurements.sensor_id, measured_at` for time-series
  queries.
- Unique constraint on `devices.identifier`.
- Unique constraint on `sensors.device_id, sensors.key`.
- Indexes on `device_credentials.device_id, revoked_at` and
  `device_credentials.expires_at` for credential validation.
- Unique index on `device_credentials.token_hash` for credential lookup.
- Foreign keys restrict physical deletion of a user with devices, a device
  with credentials or sensors, and a sensor with measurements. Sensor soft
  deletion retains its measurements and key reservation. A credential can be
  physically deleted without affecting its parent device; revocation retains
  history and is the intended lifecycle operation. An explicit domain deletion
  policy remains a later decision.
- All persisted timestamps use UTC; the API serializes them as ISO 8601.

The four domain primary keys and their ULID foreign keys use `CHAR(26)` in
MySQL. `devices.user_id` remains `BIGINT UNSIGNED` to match Laravel's `users.id`.
Device and sensor `created_at`/`updated_at` columns follow Laravel's nullable
`timestamps(6)` convention and are populated by Eloquent. Credential and
measurement `created_at` columns are non-null `TIMESTAMP(6)` with a database
default; those tables have no `updated_at` column. All domain time columns use
microsecond precision, and Laravel's MySQL connection sets its session timezone
to `+00:00`.

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
The persisted hash is the lowercase SHA-256 hex digest of the complete,
high-entropy bearer token. This deterministic digest permits indexed lookup.
The token hash is hidden from ordinary Eloquent serialization and is not mass
assignable. Future issuance must generate a cryptographically random token;
short or user-chosen tokens would not be safe with this lookup strategy.
