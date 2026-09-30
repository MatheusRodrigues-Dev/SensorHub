export interface SensorConfig { key: string; unit?: string | null; base: number; amplitude: number }
export interface SimulatorConfig { apiUrl: string; deviceId: string; token: string; sensors: SensorConfig[]; intervalSeconds: number }
export interface Reading { sensor_key: string; value: number; unit?: string | null; measured_at: string }

export function parseConfig(env: NodeJS.ProcessEnv): SimulatorConfig {
  const apiUrl = env.SENSORHUB_API_URL || 'http://nginx/api/v1'
  const deviceId = env.SENSORHUB_DEVICE_ID || ''
  const token = env.SENSORHUB_DEVICE_TOKEN || ''
  const intervalSeconds = Number(env.SENSORHUB_INTERVAL_SECONDS || '30')
  let sensors: unknown
  try { sensors = JSON.parse(env.SENSORHUB_SENSORS || '[]') } catch { throw new Error('SENSORHUB_SENSORS must be valid JSON.') }
  if (!/^https?:\/\/[^\s]+$/.test(apiUrl)) throw new Error('SENSORHUB_API_URL must be an HTTP URL.')
  if (!/^[0-9a-hjkmnp-tv-z]{26}$/i.test(deviceId)) throw new Error('SENSORHUB_DEVICE_ID must be a Device ULID.')
  if (!/^sensorhub_[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('SENSORHUB_DEVICE_TOKEN must be an issued device token.')
  if (!Number.isFinite(intervalSeconds) || intervalSeconds < 1) throw new Error('SENSORHUB_INTERVAL_SECONDS must be at least 1.')
  if (!Array.isArray(sensors) || sensors.length < 1 || sensors.length > 100 || !sensors.every(isSensorConfig)) throw new Error('SENSORHUB_SENSORS must contain 1–100 valid sensor definitions.')
  if (new Set(sensors.map(sensor => sensor.key)).size !== sensors.length) throw new Error('SENSORHUB_SENSORS keys must be unique.')
  return { apiUrl: apiUrl.replace(/\/$/, ''), deviceId, token, sensors, intervalSeconds }
}

function isSensorConfig(value: unknown): value is SensorConfig {
  if (!value || typeof value !== 'object') return false
  const sensor = value as Record<string, unknown>
  return typeof sensor.key === 'string' && /^[a-z0-9_-]{1,80}$/.test(sensor.key)
    && (sensor.unit === undefined || sensor.unit === null || (typeof sensor.unit === 'string' && sensor.unit.length <= 20))
    && typeof sensor.base === 'number' && Number.isFinite(sensor.base)
    && typeof sensor.amplitude === 'number' && Number.isFinite(sensor.amplitude) && sensor.amplitude >= 0
    && Number.isFinite(sensor.base + sensor.amplitude) && Number.isFinite(sensor.base - sensor.amplitude)
}

export function makeReadings(config: SimulatorConfig, sequence: number, at: Date = new Date()): Reading[] {
  const measured_at = at.toISOString()
  return config.sensors.map((sensor, index) => ({
    sensor_key: sensor.key,
    value: Number((sensor.base + sensor.amplitude * Math.sin(sequence * 0.4 + index)).toFixed(5)),
    ...(sensor.unit === undefined ? {} : { unit: sensor.unit }),
    measured_at,
  }))
}

export async function sendBatch(config: SimulatorConfig, readings: Reading[], fetcher: typeof fetch = fetch): Promise<number> {
  let response: Response
  try {
    response = await fetcher(`${config.apiUrl}/devices/${config.deviceId}/telemetry`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
      body: JSON.stringify({ measurements: readings }),
      signal: AbortSignal.timeout(15000),
    })
  } catch { throw new Error('Could not reach the SensorHub API.') }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Device authentication failed (401). Check or rotate the token.')
    if (response.status === 404) throw new Error('Device endpoint unavailable (404). Check the Device ID.')
    if (response.status === 422) throw new Error('Telemetry rejected (422). Check sensor keys, units and values.')
    throw new Error(`Telemetry request failed (HTTP ${response.status}).`)
  }
  const body: unknown = await response.json().catch(() => null)
  if (!body || typeof body !== 'object' || !('accepted' in body) || typeof body.accepted !== 'number') throw new Error('The API returned an unexpected response.')
  return body.accepted
}
