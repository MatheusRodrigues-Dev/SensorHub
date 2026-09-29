import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { queryKeys } from '../../lib/queryKeys'
import { ApiError } from '../../types/api'
import type { SensorUpdate } from '../../types/domain'
import { devicesApi } from '../devices/api'
import { MeasurementHistory } from '../measurements/MeasurementHistory'
import { sensorsApi } from './api'
import { SensorForm } from './SensorForm'

export function SensorPage() {
  const { deviceId = '', sensorId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const device = useQuery({ queryKey: queryKeys.device(deviceId), queryFn: () => devicesApi.get(deviceId) })
  const sensor = useQuery({ queryKey: queryKeys.sensor(deviceId, sensorId), queryFn: () => sensorsApi.get(deviceId, sensorId), enabled: device.isSuccess })
  const update = useMutation({ mutationFn: (input: SensorUpdate) => sensorsApi.update(deviceId, sensorId, input), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.sensor(deviceId, sensorId) }), queryClient.invalidateQueries({ queryKey: queryKeys.sensors(deviceId) })]); setEditing(false) } })
  const remove = useMutation({ mutationFn: () => sensorsApi.remove(deviceId, sensorId), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.sensor(deviceId, sensorId) }), queryClient.invalidateQueries({ queryKey: queryKeys.sensors(deviceId) })]); setDeleting(false); navigate(`/app/sensors/${sensorId}/history`, { replace: true }) } })
  async function confirmDelete() {
    setDeleteError('')
    try { await remove.mutateAsync() }
    catch { setDeleteError('Could not archive this sensor. Please try again.') }
  }
  if (device.isPending || sensor.isPending) return <main className="mx-auto max-w-6xl px-6 py-12" role="status">Loading sensor…</main>
  if (device.isError || sensor.isError) {
    const error = device.isError ? device.error : sensor.error
    const unavailable = error instanceof ApiError && [403, 404].includes(error.status)
    return <main className="mx-auto max-w-6xl px-6 py-12"><h1 className="text-2xl font-semibold">{unavailable ? 'Sensor unavailable' : 'Could not load sensor'}</h1><p className="mt-3 text-slate-400">{unavailable ? 'This sensor could not be opened.' : 'Check your connection and try again.'}</p><div className="mt-5 flex gap-4">{!unavailable && <Button onClick={() => void (device.isError ? device.refetch() : sensor.refetch())}>Try again</Button>}<Link className="self-center text-cyan-300 underline" to="/app">Back to Devices</Link></div></main>
  }
  return <main className="mx-auto max-w-6xl space-y-9 px-6 py-10 sm:py-14">
    <div><Link to={`/app/devices/${deviceId}`} className="text-sm text-cyan-300 hover:underline">← {device.data.name}</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Sensor</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{sensor.data.name}</h1><p className="mt-2 font-mono text-sm text-cyan-300">{sensor.data.key}</p><p className="mt-2 text-sm text-slate-400">{sensor.data.type} · Unit: {sensor.data.unit ?? 'Not specified'}</p></div><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setEditing(true)}>Edit sensor</Button><Button variant="secondary" onClick={() => { setDeleteError(''); setDeleting(true) }}>Archive sensor</Button></div></div></div>
    {editing && <section aria-label="Edit sensor"><h2 className="mb-4 text-xl font-semibold">Edit sensor</h2><SensorForm initial={sensor.data} onSubmit={input => update.mutateAsync(input as SensorUpdate).then(() => undefined)} onCancel={() => setEditing(false)} /></section>}
    {deleteError && <Alert>{deleteError}</Alert>}
    <MeasurementHistory sensorId={sensorId} />
    {deleting && <ConfirmDialog title={`Archive ${sensor.data.name}?`} description="The sensor will disappear from active lists and stop receiving telemetry. Historical measurements will remain available." confirmLabel="Archive sensor" pending={remove.isPending} onCancel={() => setDeleting(false)} onConfirm={() => void confirmDelete()} />}
  </main>
}
