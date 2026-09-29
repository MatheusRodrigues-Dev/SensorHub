import { lazy, Suspense, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Pagination } from '../../components/ui/Pagination'
import { queryKeys } from '../../lib/queryKeys'
import type { MeasurementFilters } from '../../types/domain'
import { ApiError } from '../../types/api'
import { measurementsApi } from './api'
const MeasurementChart = lazy(() => import('./MeasurementChart').then(module => ({ default: module.MeasurementChart })))

export function MeasurementHistory({ sensorId }: { sensorId: string }) {
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [filterError, setFilterError] = useState('')
  const [filters, setFilters] = useState<MeasurementFilters>({ page: 1, perPage: 25 })
  const history = useQuery({ queryKey: queryKeys.measurements(sensorId, filters), queryFn: () => measurementsApi.list(sensorId, filters) })
  function applyFilters(event: FormEvent) {
    event.preventDefault(); setFilterError('')
    const fromDate = fromInput ? new Date(fromInput) : null
    const toDate = toInput ? new Date(toInput) : null
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) { setFilterError('Enter valid dates.'); return }
    if (fromDate && toDate && fromDate > toDate) { setFilterError('End time must be on or after start time.'); return }
    setFilters({ from: fromDate?.toISOString(), to: toDate?.toISOString(), page: 1, perPage: 25 })
  }
  function clearFilters() { setFromInput(''); setToInput(''); setFilterError(''); setFilters({ page: 1, perPage: 25 }) }
  return <section className="space-y-6" aria-label="Measurement history">
    <div><h2 className="text-2xl font-semibold">Measurement history</h2><p className="mt-1 text-sm text-slate-400">Raw measurements ordered by measurement time, oldest first. Times below use your browser timezone.</p></div>
    <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="min-w-52 flex-1 space-y-1.5"><label htmlFor="history-from" className="block text-sm font-medium">From</label><input id="history-from" type="datetime-local" value={fromInput} onChange={event => setFromInput(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 focus:border-cyan-400 focus:outline-none" /></div>
      <div className="min-w-52 flex-1 space-y-1.5"><label htmlFor="history-to" className="block text-sm font-medium">To</label><input id="history-to" type="datetime-local" value={toInput} onChange={event => setToInput(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 focus:border-cyan-400 focus:outline-none" /></div>
      <Button type="submit">Apply</Button><Button type="button" variant="secondary" onClick={clearFilters}>Clear</Button>
    </form>
    {filterError && <Alert>{filterError}</Alert>}
    {history.isPending && <p role="status" className="text-slate-400">Loading measurements…</p>}
    {history.isError && (history.error instanceof ApiError && [403, 404].includes(history.error.status) ? <Alert>History unavailable. This sensor history could not be opened.</Alert> : <Alert>Could not load measurement history. <button className="underline" onClick={() => void history.refetch()}>Try again</button></Alert>)}
    {history.data && <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="font-semibold">Current page trend</h3><p className="mt-1 text-xs text-slate-400">This chart shows only the {history.data.data.length} {history.data.data.length === 1 ? 'measurement' : 'measurements'} on the loaded page, not the complete history.</p><Suspense fallback={<p role="status" className="py-12 text-center text-slate-400">Loading chart…</p>}><MeasurementChart measurements={history.data.data} /></Suspense></div>
      {history.data.data.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center"><h3 className="text-lg font-semibold">No measurements in this range</h3><p className="mt-2 text-slate-400">Try a wider time range or clear the filters.</p></div> : <div className="overflow-x-auto rounded-2xl border border-slate-800"><table className="w-full min-w-lg text-left text-sm"><caption className="sr-only">Measurements on the current page</caption><thead className="bg-slate-900 text-slate-300"><tr><th scope="col" className="px-5 py-4 font-medium">Measured at</th><th scope="col" className="px-5 py-4 font-medium">Value</th><th scope="col" className="px-5 py-4 font-medium">Historical unit</th></tr></thead><tbody>{history.data.data.map(item => <tr key={item.id} className="border-t border-slate-800"><td className="whitespace-nowrap px-5 py-4">{new Date(item.measured_at).toLocaleString()}</td><td className="px-5 py-4 font-mono text-cyan-300">{item.value}</td><td className="px-5 py-4">{item.unit ?? '—'}</td></tr>)}</tbody></table></div>}
      <Pagination page={history.data.meta.current_page} perPage={history.data.meta.per_page} total={history.data.meta.total} onPage={page => setFilters(current => ({ ...current, page }))} />
    </div>}
  </section>
}
