import { apiRequest } from '../../lib/api'
import type { Device, DeviceInput, Page } from '../../types/domain'

export const devicesApi = {
  list: (page: number) => apiRequest<Page<Device>>(`/devices?page=${page}&per_page=25`, 'GET', undefined, true),
  get: async (id: string) => (await apiRequest<{ data: Device }>(`/devices/${encodeURIComponent(id)}`, 'GET', undefined, true)).data,
  create: async (input: DeviceInput) => (await apiRequest<{ data: Device }>('/devices', 'POST', input, true)).data,
  update: async (id: string, input: DeviceInput) => (await apiRequest<{ data: Device }>(`/devices/${encodeURIComponent(id)}`, 'PATCH', input, true)).data,
  remove: (id: string) => apiRequest<void>(`/devices/${encodeURIComponent(id)}`, 'DELETE', undefined, true),
}
