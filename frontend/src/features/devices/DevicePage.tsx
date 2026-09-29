import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { queryKeys } from '../../lib/queryKeys'
import { ApiError } from '../../types/api'
import type { SensorInput } from '../../types/domain'
import { sensorsApi } from '../sensors/api'
import { SensorForm } from '../sensors/SensorForm'
import { devicesApi } from './api'
import { DeviceForm } from './DeviceForm'

export function DevicePage() {
  const { deviceId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [creatingSensor, setCreatingSensor] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const device = useQuery({ queryKey: queryKeys.device(deviceId), queryFn: () => devicesApi.get(deviceId) })
  const sensors = useQuery({ queryKey: queryKeys.sensors(deviceId), queryFn: () => sensorsApi.list(deviceId), enabled: device.isSuccess })
  const update = useMutation({ mutationFn: (input: { name: string; identifier: string }) => devicesApi.update(deviceId, input), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.device(deviceId) }), queryClient.invalidateQueries({ queryKey: queryKeys.deviceLists })]); setEditing(false) } })
  const remove = useMutation({ mutationFn: () => devicesApi.remove(deviceId), onSuccess: async () => { queryClient.removeQueries({ queryKey: queryKeys.device(deviceId) }); await queryClient.invalidateQueries({ queryKey: queryKeys.deviceLists }); navigate('/app', { replace: true }) } })
  const createSensor = useMutation({ mutationFn: (input: SensorInput) => sensorsApi.create(deviceId, input), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.sensors(deviceId) }); setCreatingSensor(false) } })
  async function confirmDelete() {
    setDeleteError('')
    try { await remove.mutateAsync() }
    catch (error) { setDeleting(false); setDeleteError(error instanceof ApiError && error.status === 409 ? 'This device has dependent records and cannot be deleted.' : 'Could not delete this device. Please try again.') }
  }
  if (device.isPending) return <main className="mx-auto max-w-6xl px-6 py-12" role="status">Loading device…</main>
  if (device.isError) {
    const unavailable = device.error instanceof ApiError && [403, 404].includes(device.error.status)
    return <main className="mx-auto max-w-6xl px-6 py-12"><h1 className="text-2xl font-semibold">{unavailable ? 'Device unavailable' : 'Could not load device'}</h1><p className="mt-3 text-slate-400">{unavailable ? 'This device could not be opened.' : 'Check your connection and try again.'}</p><div className="mt-5 flex gap-4">{!unavailable && <Button onClick={() => void device.refetch()}>Try again</Button>}<Link className="self-center text-cyan-300 underline" to="/app">Back to Devices</Link></div></main>
  }
  return <main className="mx-auto max-w-6xl space-y-9 px-6 py-10 sm:py-14">
    <div><Link to="/app" className="text-sm text-cyan-300 hover:underline">← All devices</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Device</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{device.data.name}</h1><p className="mt-2 break-all font-mono text-sm text-slate-400">{device.data.identifier}</p></div><div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={() => setEditing(true)}>Edit device</Button><Button variant="secondary" onClick={() => { setDeleteError(''); setDeleting(true) }}>Delete device</Button></div></div></div>
    {editing && <section aria-label="Edit device"><h2 className="mb-4 text-xl font-semibold">Edit device</h2><DeviceForm initial={device.data} submitLabel="Save device" onSubmit={input => update.mutateAsync(input).then(() => undefined)} onCancel={() => setEditing(false)} /></section>}
    {deleteError && <Alert>{deleteError}</Alert>}
    <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold">Sensors</h2><p className="mt-1 text-sm text-slate-400">Channels that produce telemetry for this device.</p></div><Button onClick={() => setCreatingSensor(true)}>Add sensor</Button></div>
      {creatingSensor && <SensorForm onSubmit={async input => { await createSensor.mutateAsync(input as SensorInput) }} onCancel={() => setCreatingSensor(false)} />}
      {sensors.isPending && <p role="status" className="text-slate-400">Loading sensors…</p>}
      {sensors.isError && <Alert>Could not load sensors. <button className="underline" onClick={() => void sensors.refetch()}>Try again</button></Alert>}
      {sensors.data && (sensors.data.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center"><h3 className="text-lg font-semibold">No active sensors</h3><p className="mt-2 text-slate-400">Add a sensor to identify a measurement channel.</p></div> : <div className="grid gap-4 md:grid-cols-2">{sensors.data.map(sensor => <article key={sensor.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-xs uppercase tracking-widest text-slate-500">{sensor.type}</p><h3 className="mt-2 text-xl font-semibold"><Link to={`/app/devices/${deviceId}/sensors/${sensor.id}`} className="hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300">{sensor.name}</Link></h3><p className="mt-2 font-mono text-sm text-cyan-300">{sensor.key}</p><p className="mt-1 text-sm text-slate-400">Unit: {sensor.unit ?? 'Not specified'}</p><Link className="mt-5 inline-block text-sm font-medium text-cyan-300 hover:underline" to={`/app/devices/${deviceId}/sensors/${sensor.id}`}>View history →</Link></article>)}</div>)}
    </section>
    {deleting && <ConfirmDialog title={`Delete ${device.data.name}?`} description="Deleting this device is permanent and only succeeds if it has no dependent records." confirmLabel="Delete device" pending={remove.isPending} onCancel={() => setDeleting(false)} onConfirm={() => void confirmDelete()} />}
  </main>
}
