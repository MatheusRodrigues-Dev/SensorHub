import assert from 'node:assert/strict'
import test from 'node:test'
import { makeReadings, parseConfig, sendBatch } from './simulator.js'

const token = `sensorhub_${'A'.repeat(43)}`
const env = { SENSORHUB_DEVICE_ID: '01m3q5z2ythfvbyc7zfyr7hs2c', SENSORHUB_DEVICE_TOKEN: token, SENSORHUB_SENSORS: '[{"key":"temperature","unit":"°C","base":24,"amplitude":2}]' }

test('configuration rejects missing secrets and invalid sensors', () => {
  assert.throws(() => parseConfig({ ...env, SENSORHUB_DEVICE_TOKEN: '' }))
  assert.throws(() => parseConfig({ ...env, SENSORHUB_SENSORS: '[]' }))
  assert.throws(() => parseConfig({ ...env, SENSORHUB_INTERVAL_SECONDS: '0' }))
})
test('payload generation is bounded and uses UTC timestamps', () => {
  const config = parseConfig(env)
  const readings = makeReadings(config, 0, new Date('2026-09-29T12:30:00Z'))
  assert.deepEqual(readings, [{ sensor_key: 'temperature', value: 24, unit: '°C', measured_at: '2026-09-29T12:30:00.000Z' }])
  assert.ok(makeReadings(config, 5)[0].value >= 22 && makeReadings(config, 5)[0].value <= 26)
})
test('one shot request sends Bearer telemetry and parses accepted count', async () => {
  const config = parseConfig(env)
  const accepted = await sendBatch(config, makeReadings(config, 0), async (input, init) => {
    assert.equal(input, `http://nginx/api/v1/devices/${config.deviceId}/telemetry`)
    assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${token}`)
    assert.equal(JSON.parse(init?.body as string).measurements.length, 1)
    return new Response(JSON.stringify({ accepted: 1 }), { status: 201 })
  })
  assert.equal(accepted, 1)
})
test('errors remain safe and do not echo the token', async () => {
  const config = parseConfig(env)
  await assert.rejects(sendBatch(config, makeReadings(config, 0), async () => new Response('', { status: 401 })), /authentication failed/)
  await assert.rejects(sendBatch(config, makeReadings(config, 0), async () => new Response('', { status: 422 })), /Telemetry rejected/)
  await assert.rejects(sendBatch(config, makeReadings(config, 0), async () => { throw new Error(token) }), /Could not reach/)
})
