export interface Device {
  id: string
  name: string
  identifier: string
  created_at: string
  updated_at: string
}
export interface DeviceInput { name: string; identifier: string }
export interface Sensor {
  id: string
  device_id: string
  key: string
  name: string
  type: 'temperature' | 'humidity' | 'pressure' | 'generic'
  unit: string | null
}
export interface SensorInput { name: string; key: string; type: Sensor['type']; unit: string | null }
export type SensorUpdate = Pick<SensorInput, 'name' | 'type' | 'unit'>
export interface Measurement {
  id: string
  sensor_id: string
  value: number
  unit: string | null
  measured_at: string
  created_at: string
}
export interface PaginationMeta { current_page: number; per_page: number; total: number; last_page: number }
export interface Page<T> { data: T[]; meta: PaginationMeta }
export interface MeasurementFilters { from?: string; to?: string; page: number; perPage: number }
