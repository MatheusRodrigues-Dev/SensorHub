import { apiRequest } from '../../lib/api'
import type { Sensor, SensorInput, SensorUpdate } from '../../types/domain'

const base = (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}/sensors`
export const sensorsApi = {
  list: async (deviceId: string) => (await apiRequest<{ data: Sensor[] }>(base(deviceId), 'GET', undefined, true)).data,
  get: async (deviceId: string, sensorId: string) => (await apiRequest<{ data: Sensor }>(`${base(deviceId)}/${encodeURIComponent(sensorId)}`, 'GET', undefined, true)).data,
  create: async (deviceId: string, input: SensorInput) => (await apiRequest<{ data: Sensor }>(base(deviceId), 'POST', input, true)).data,
  update: async (deviceId: string, sensorId: string, input: SensorUpdate) => (await apiRequest<{ data: Sensor }>(`${base(deviceId)}/${encodeURIComponent(sensorId)}`, 'PATCH', input, true)).data,
  remove: (deviceId: string, sensorId: string) => apiRequest<void>(`${base(deviceId)}/${encodeURIComponent(sensorId)}`, 'DELETE', undefined, true),
}
