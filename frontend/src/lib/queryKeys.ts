import type { MeasurementFilters } from '../types/domain'

export const queryKeys = {
  deviceLists: ['devices', 'list'] as const,
  deviceList: (page: number) => ['devices', 'list', page] as const,
  device: (deviceId: string) => ['devices', 'detail', deviceId] as const,
  sensors: (deviceId: string) => ['sensors', 'list', deviceId] as const,
  sensor: (deviceId: string, sensorId: string) => ['sensors', 'detail', deviceId, sensorId] as const,
  measurements: (sensorId: string, filters: MeasurementFilters) => ['measurements', sensorId, filters.from ?? '', filters.to ?? '', filters.page, filters.perPage] as const,
}
