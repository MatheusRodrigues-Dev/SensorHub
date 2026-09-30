import { apiRequest } from '../../lib/api'
import type { DeviceCredential, IssuedDeviceCredential } from '../../types/domain'

const base = (deviceId: string) => `/devices/${encodeURIComponent(deviceId)}/credentials`
export const credentialsApi = {
  list: async (deviceId: string) => (await apiRequest<{ data: DeviceCredential[] }>(base(deviceId), 'GET', undefined, true)).data,
  create: async (deviceId: string, name: string) => (await apiRequest<{ data: IssuedDeviceCredential }>(base(deviceId), 'POST', { name }, true)).data,
  rotate: async (deviceId: string, credentialId: string) => (await apiRequest<{ data: IssuedDeviceCredential }>(`${base(deviceId)}/${encodeURIComponent(credentialId)}/rotate`, 'POST', undefined, true)).data,
  revoke: (deviceId: string, credentialId: string) => apiRequest<void>(`${base(deviceId)}/${encodeURIComponent(credentialId)}`, 'DELETE', undefined, true),
}
