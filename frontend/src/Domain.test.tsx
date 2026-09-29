import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { authApi } from './lib/api'
import { notifySessionExpired } from './lib/sessionEvents'
import { devicesApi } from './features/devices/api'
import { sensorsApi } from './features/sensors/api'
import { measurementsApi } from './features/measurements/api'
import { ApiError } from './types/api'
import type { Device, Measurement, Sensor } from './types/domain'

vi.mock('./lib/api', () => ({ authApi: { currentUser: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() } }))
vi.mock('./features/devices/api', () => ({ devicesApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))
vi.mock('./features/sensors/api', () => ({ sensorsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))
vi.mock('./features/measurements/api', () => ({ measurementsApi: { list: vi.fn() } }))
vi.mock('./features/measurements/MeasurementChart', () => ({ MeasurementChart: ({ measurements }: { measurements: Measurement[] }) => <div data-testid="measurement-chart">{measurements.map(item => item.value).join(',')}</div> }))

const device: Device = { id: '01K6C8R07QJ2J8XZ6HVQ9EX001', name: 'Lab device', identifier: 'lab-01', created_at: '2026-09-29T12:00:00Z', updated_at: '2026-09-29T12:00:00Z' }
const sensor: Sensor = { id: '01K6C8R07QJ2J8XZ6HVQ9EX002', device_id: device.id, name: 'Temperature', key: 'temperature', type: 'temperature', unit: '°C' }
const measurement: Measurement = { id: '01K6C8R07QJ2J8XZ6HVQ9EX003', sensor_id: sensor.id, value: 24.8, unit: '°C', measured_at: '2026-09-29T12:30:00Z', created_at: '2026-09-29T12:31:00Z' }
const meta = { current_page: 1, per_page: 25, total: 1, last_page: 1 }
const mocked = {
  listDevices: vi.mocked(devicesApi.list), getDevice: vi.mocked(devicesApi.get), createDevice: vi.mocked(devicesApi.create), updateDevice: vi.mocked(devicesApi.update), removeDevice: vi.mocked(devicesApi.remove),
  listSensors: vi.mocked(sensorsApi.list), getSensor: vi.mocked(sensorsApi.get), createSensor: vi.mocked(sensorsApi.create), updateSensor: vi.mocked(sensorsApi.update), removeSensor: vi.mocked(sensorsApi.remove),
  listMeasurements: vi.mocked(measurementsApi.list),
}
function visit(path: string) { window.history.replaceState({}, '', path); return render(<App />) }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authApi.currentUser).mockResolvedValue({ id: 1, name: 'Alex', email: 'alex@example.test' })
  mocked.listDevices.mockResolvedValue({ data: [device], meta })
  mocked.getDevice.mockResolvedValue(device)
  mocked.listSensors.mockResolvedValue([sensor])
  mocked.getSensor.mockResolvedValue(sensor)
  mocked.listMeasurements.mockResolvedValue({ data: [measurement], meta })
  mocked.createDevice.mockResolvedValue(device)
  mocked.updateDevice.mockResolvedValue(device)
  mocked.removeDevice.mockResolvedValue()
  mocked.createSensor.mockResolvedValue(sensor)
  mocked.updateSensor.mockResolvedValue(sensor)
  mocked.removeSensor.mockResolvedValue()
})
afterEach(cleanup)

describe('Device dashboard', () => {
  it('shows loading, then an empty state', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof devicesApi.list>>) => void
    mocked.listDevices.mockReturnValue(new Promise(callback => { resolve = callback }))
    visit('/app')
    expect(await screen.findByText('Loading devices…')).toBeInTheDocument()
    resolve({ data: [], meta: { ...meta, total: 0 } })
    expect(await screen.findByText('No devices yet')).toBeInTheDocument()
  })

  it('renders an owned device and opens its detail route', async () => {
    visit('/app')
    fireEvent.click(await screen.findByRole('link', { name: device.name }))
    expect(await screen.findByRole('heading', { name: device.name })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/app/devices/${device.id}`)
    expect(await screen.findByRole('link', { name: sensor.name })).toBeInTheDocument()
  })

  it('creates a device without ownership fields', async () => {
    visit('/app')
    fireEvent.click(await screen.findByRole('button', { name: 'Add device' }))
    fireEvent.change(screen.getByLabelText('Device name'), { target: { value: device.name } })
    fireEvent.change(screen.getByLabelText('Device identifier'), { target: { value: device.identifier } })
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }))
    await waitFor(() => expect(mocked.createDevice).toHaveBeenCalledWith({ name: device.name, identifier: device.identifier }))
    expect(await screen.findByRole('heading', { name: device.name })).toBeInTheDocument()
  })

  it('shows Laravel validation beside a device field', async () => {
    mocked.createDevice.mockRejectedValue(new ApiError(422, 'Validation failed', { identifier: ['Identifier is invalid.'] }))
    visit('/app')
    fireEvent.click(await screen.findByRole('button', { name: 'Add device' }))
    fireEvent.change(screen.getByLabelText('Device name'), { target: { value: device.name } })
    fireEvent.change(screen.getByLabelText('Device identifier'), { target: { value: device.identifier } })
    fireEvent.click(screen.getByRole('button', { name: 'Create device' }))
    expect(await screen.findByText('Identifier is invalid.')).toBeInTheDocument()
  })

  it('edits allowed device fields', async () => {
    visit(`/app/devices/${device.id}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit device' }))
    fireEvent.change(screen.getByLabelText('Device name'), { target: { value: 'Updated lab' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save device' }))
    await waitFor(() => expect(mocked.updateDevice).toHaveBeenCalledWith(device.id, { name: 'Updated lab', identifier: device.identifier }))
  })

  it('requires confirmation and handles a deletion conflict', async () => {
    mocked.removeDevice.mockRejectedValue(new ApiError(409, 'Device has dependent records.'))
    visit('/app')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(mocked.removeDevice).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Delete device' }))
    expect(await screen.findByText(/has sensors, credentials or measurements/)).toBeInTheDocument()
  })

  it('deletes only after confirmation', async () => {
    visit('/app')
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete device' }))
    await waitFor(() => expect(mocked.removeDevice).toHaveBeenCalledWith(device.id))
  })
})

describe('Sensor management', () => {
  it('lists and creates a sensor with the approved fields', async () => {
    visit(`/app/devices/${device.id}`)
    expect(await screen.findByRole('link', { name: sensor.name })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add sensor' }))
    fireEvent.change(screen.getByLabelText('Sensor name'), { target: { value: sensor.name } })
    fireEvent.change(screen.getByLabelText('Sensor key'), { target: { value: sensor.key } })
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: sensor.type } })
    fireEvent.change(screen.getByLabelText('Unit (optional)'), { target: { value: sensor.unit } })
    fireEvent.click(screen.getByRole('button', { name: 'Create sensor' }))
    await waitFor(() => expect(mocked.createSensor).toHaveBeenCalledWith(device.id, { name: sensor.name, key: sensor.key, type: sensor.type, unit: sensor.unit }))
  })

  it('keeps the key out of update payloads', async () => {
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sensor' }))
    expect(screen.queryByLabelText('Sensor key')).not.toBeInTheDocument()
    expect(screen.getByText('This machine identifier cannot change after creation.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Sensor name'), { target: { value: 'Ambient temperature' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save sensor' }))
    await waitFor(() => expect(mocked.updateSensor).toHaveBeenCalledWith(device.id, sensor.id, { name: 'Ambient temperature', type: sensor.type, unit: sensor.unit }))
  })

  it('reports a backend unit conflict', async () => {
    mocked.updateSensor.mockRejectedValue(new ApiError(409, 'Sensor unit cannot change.'))
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sensor' }))
    fireEvent.change(screen.getByLabelText('Unit (optional)'), { target: { value: '°F' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save sensor' }))
    expect(await screen.findByText('The unit cannot change after measurements exist.')).toBeInTheDocument()
  })

  it('archives only after confirmation and preserves history view', async () => {
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Archive sensor' }))
    expect(mocked.removeSensor).not.toHaveBeenCalled()
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Archive sensor' }))
    await waitFor(() => expect(mocked.removeSensor).toHaveBeenCalledWith(device.id, sensor.id))
    expect(await screen.findByText('Historical measurements')).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/app/sensors/${sensor.id}/history`)
  })
})

describe('Measurement history', () => {
  it('shows loading and an empty history', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof measurementsApi.list>>) => void
    mocked.listMeasurements.mockReturnValue(new Promise(callback => { resolve = callback }))
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    expect(await screen.findByText('Loading measurements…')).toBeInTheDocument()
    resolve({ data: [], meta: { ...meta, total: 0 } })
    expect(await screen.findByText('No measurements in this range')).toBeInTheDocument()
  })

  it('renders stored historical values and passes the current page to the chart', async () => {
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    expect(await screen.findByRole('cell', { name: '24.8' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '°C' })).toBeInTheDocument()
    expect(await screen.findByTestId('measurement-chart')).toHaveTextContent('24.8')
    expect(screen.getByText(/chart shows only the 1 measurement on the loaded page/)).toBeInTheDocument()
  })

  it('converts local filter inputs to ISO timestamps and resets page', async () => {
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    await screen.findByRole('cell', { name: '24.8' })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-29T12:00' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-29T13:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(mocked.listMeasurements).toHaveBeenCalledWith(sensor.id, { from: new Date('2026-09-29T12:00').toISOString(), to: new Date('2026-09-29T13:00').toISOString(), page: 1, perPage: 25 }))
  })

  it('validates date order before requesting the API', async () => {
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    await screen.findByRole('cell', { name: '24.8' })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-30T12:00' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-29T12:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.getByText('End time must be on or after start time.')).toBeInTheDocument()
    expect(mocked.listMeasurements).toHaveBeenCalledTimes(1)
  })

  it('requests the next page from the backend', async () => {
    mocked.listMeasurements.mockResolvedValue({ data: [measurement], meta: { ...meta, total: 26 } })
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))
    await waitFor(() => expect(mocked.listMeasurements).toHaveBeenCalledWith(sensor.id, { page: 2, perPage: 25 }))
  })

  it('shows API errors and does not leak an inaccessible sensor', async () => {
    mocked.listMeasurements.mockRejectedValue(new ApiError(500, 'Internal failure'))
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    expect(await screen.findByText(/Could not load measurement history/)).toBeInTheDocument()
    cleanup()
    mocked.getSensor.mockRejectedValue(new ApiError(403, 'Forbidden'))
    visit(`/app/devices/${device.id}/sensors/${sensor.id}`)
    expect(await screen.findByRole('heading', { name: 'Sensor unavailable' })).toBeInTheDocument()
  })
})

describe('Session and routing', () => {
  it('renders a frontend not-found page', async () => {
    visit('/app/unknown')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('returns to login when a domain request reports session expiry', async () => {
    visit('/app')
    await screen.findByRole('heading', { name: 'Devices' })
    notifySessionExpired()
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
  })

  it('does not reuse the previous user’s cached devices after logout and login', async () => {
    mocked.listDevices.mockResolvedValueOnce({ data: [device], meta }).mockResolvedValue({ data: [], meta: { ...meta, total: 0 } })
    vi.mocked(authApi.currentUser).mockResolvedValueOnce({ id: 1, name: 'Alex', email: 'alex@example.test' }).mockResolvedValue({ id: 2, name: 'Taylor', email: 'taylor@example.test' })
    vi.mocked(authApi.logout).mockResolvedValue()
    vi.mocked(authApi.login).mockResolvedValue()
    visit('/app')
    await screen.findByRole('link', { name: device.name })
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'taylor@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('No devices yet')).toBeInTheDocument()
    expect(mocked.listDevices).toHaveBeenCalledTimes(2)
  })
})
