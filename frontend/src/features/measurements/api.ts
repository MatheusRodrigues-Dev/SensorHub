import { apiRequest } from '../../lib/api'
import type { Measurement, MeasurementFilters, Page } from '../../types/domain'

export const measurementsApi = {
  list: (sensorId: string, filters: MeasurementFilters) => {
    const params = new URLSearchParams({ page: String(filters.page), per_page: String(filters.perPage) })
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    return apiRequest<Page<Measurement>>(`/sensors/${encodeURIComponent(sensorId)}/measurements?${params}`, 'GET', undefined, true)
  },
}
