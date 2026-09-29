import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Pagination } from '../../components/ui/Pagination'
import { queryKeys } from '../../lib/queryKeys'
import { ApiError } from '../../types/api'
import type { Device } from '../../types/domain'
import { devicesApi } from './api'
import { DeviceForm } from './DeviceForm'

export function DevicesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Device | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const devices = useQuery({ queryKey: queryKeys.deviceList(page), queryFn: () => devicesApi.list(page) })
  const create = useMutation({ mutationFn: (input: { name: string; identifier: string }) => devicesApi.create(input), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.deviceLists }); setCreating(false) } })
  const remove = useMutation({ mutationFn: (id: string) => devicesApi.remove(id), onSuccess: async (_data, id) => { queryClient.removeQueries({ queryKey: queryKeys.device(id) }); await queryClient.invalidateQueries({ queryKey: queryKeys.deviceLists }); setDeleting(null) } })
  async function confirmDelete() {
    if (!deleting) return
    setDeleteError('')
    try { await remove.mutateAsync(deleting.id) }
    catch (error) { setDeleting(null); setDeleteError(error instanceof ApiError && error.status === 409 ? 'This device has sensors, credentials or measurements and cannot be deleted.' : 'Could not delete this device. Please try again.') }
  }
  return <main className="mx-auto max-w-6xl space-y-8 px-6 py-10 sm:py-14">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Devices</h1><p className="mt-2 text-slate-400">Manage the devices connected to your SensorHub account.</p></div><Button onClick={() => setCreating(true)}>Add device</Button></div>
    {creating && <section aria-label="New device"><h2 className="mb-4 text-xl font-semibold">New device</h2><DeviceForm submitLabel="Create device" onSubmit={async input => { const device = await create.mutateAsync(input); navigate(`/app/devices/${device.id}`) }} onCancel={() => setCreating(false)} /></section>}
    {devices.isPending && <p role="status" className="text-slate-400">Loading devices…</p>}
    {devices.isError && <Alert>Could not load devices. <button className="underline" onClick={() => void devices.refetch()}>Try again</button></Alert>}
    {devices.data && <>
      {devices.data.data.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-700 p-10 text-center"><h2 className="text-xl font-semibold">No devices yet</h2><p className="mt-2 text-slate-400">Add your first device to start organizing sensors.</p></section> : <div className="grid gap-4 md:grid-cols-2">{devices.data.data.map(device => <article key={device.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Device</p><h2 className="mt-2 text-xl font-semibold"><Link className="rounded text-slate-100 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300" to={`/app/devices/${device.id}`}>{device.name}</Link></h2><p className="mt-2 break-all font-mono text-sm text-slate-400">{device.identifier}</p><div className="mt-6 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => navigate(`/app/devices/${device.id}`)}>Open device</Button><Button variant="secondary" onClick={() => { setDeleteError(''); setDeleting(device) }}>Delete</Button></div></article>)}</div>}
      <Pagination page={devices.data.meta.current_page} perPage={devices.data.meta.per_page} total={devices.data.meta.total} onPage={setPage} />
    </>}
    {deleteError && <Alert>{deleteError}</Alert>}
    {deleting && <ConfirmDialog title={`Delete ${deleting.name}?`} description="This permanently removes an empty device. Devices with dependent records cannot be deleted." confirmLabel="Delete device" pending={remove.isPending} onCancel={() => setDeleting(null)} onConfirm={() => void confirmDelete()} />}
  </main>
}
