import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { FormField } from '../../components/ui/FormField'
import { queryKeys } from '../../lib/queryKeys'
import { ApiError } from '../../types/api'
import type { IssuedDeviceCredential } from '../../types/domain'
import { credentialsApi } from './api'

export function CredentialsPanel({ deviceId }: { deviceId: string }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [issued, setIssued] = useState<IssuedDeviceCredential | null>(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<{ id: string; action: 'rotate' | 'revoke' } | null>(null)
  const [copied, setCopied] = useState(false)
  const credentials = useQuery({ queryKey: queryKeys.credentials(deviceId), queryFn: () => credentialsApi.list(deviceId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.credentials(deviceId) })
  const create = useMutation({ mutationFn: async () => { setIssued(await credentialsApi.create(deviceId, name.trim())) }, onSuccess: () => { setName(''); setNameError(''); void refresh() } })
  const rotate = useMutation({ mutationFn: async (id: string) => { setIssued(await credentialsApi.rotate(deviceId, id)) }, onSuccess: () => { setConfirm(null); void refresh() } })
  const revoke = useMutation({ mutationFn: (id: string) => credentialsApi.revoke(deviceId, id), onSuccess: () => { setConfirm(null); void refresh() } })

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setNameError('')
    if (!name.trim()) { setNameError('Enter a credential name.'); return }
    try { await create.mutateAsync() }
    catch (cause) {
      if (cause instanceof ApiError && cause.errors.name?.[0]) setNameError(cause.errors.name[0])
      else setError('Could not create the credential. Please try again.')
    }
  }
  async function handleConfirm() {
    if (!confirm) return
    setError('')
    try {
      if (confirm.action === 'rotate') await rotate.mutateAsync(confirm.id)
      else await revoke.mutateAsync(confirm.id)
    } catch (cause) {
      setConfirm(null)
      setError(cause instanceof ApiError && cause.status === 409 ? 'This credential has already been revoked.' : 'Could not update the credential. Please try again.')
    }
  }
  function dismissToken() { setIssued(null); setCopied(false); create.reset(); rotate.reset() }

  return <section className="space-y-5" aria-labelledby="credentials-title">
    <div><h2 id="credentials-title" className="text-2xl font-semibold">Device credentials</h2><p className="mt-1 text-sm text-slate-400">Each credential authenticates this device when sending telemetry. Keep its token private.</p></div>
    {error && <Alert>{error}</Alert>}
    {issued && <div role="dialog" aria-label="New device token" className="rounded-2xl border border-amber-400/50 bg-amber-400/10 p-6">
      <h3 className="text-lg font-semibold">Save this token now</h3><p className="mt-2 text-sm text-slate-200">The token for {issued.credential.name} is shown only once. It cannot be retrieved after you dismiss this message.</p>
      <code className="mt-4 block overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-amber-200">{issued.token}</code>
      <div className="mt-4 flex flex-wrap gap-3"><Button type="button" onClick={async () => { try { await navigator.clipboard.writeText(issued.token); setCopied(true) } catch { setError('Copy failed. Select and copy the token manually.') } }}>{copied ? 'Copied' : 'Copy token'}</Button><Button type="button" variant="secondary" onClick={dismissToken}>I saved it</Button></div>
    </div>}
    <form onSubmit={event => void handleCreate(event)} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-end">
      <div className="flex-1"><FormField id="credential-name" label="Credential name" value={name} maxLength={120} onChange={event => setName(event.target.value)} error={nameError} placeholder="e.g. Production ESP32" /></div>
      <Button type="submit" disabled={create.isPending}>Create credential</Button>
    </form>
    {credentials.isPending && <p role="status" className="text-slate-400">Loading credentials…</p>}
    {credentials.isError && <Alert>Could not load credentials. <button className="underline" onClick={() => void credentials.refetch()}>Try again</button></Alert>}
    {credentials.data && (credentials.data.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">No credentials yet.</p> : <ul className="grid gap-3 md:grid-cols-2">{credentials.data.map(item => <li key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{item.name}</h3><span className={item.revoked_at ? 'text-rose-300' : item.expires_at ? 'text-amber-300' : 'text-emerald-300'}>{item.revoked_at ? 'Revoked' : item.expires_at ? 'Expiration set' : 'Active'}</span></div>
      <p className="mt-2 text-xs text-slate-400">Created {new Date(item.created_at).toLocaleString()} · Last used {item.last_used_at ? new Date(item.last_used_at).toLocaleString() : 'Never'}</p>
      {item.expires_at && <p className="mt-1 text-xs text-slate-400">Expires {new Date(item.expires_at).toLocaleString()}</p>}
      {!item.revoked_at && <div className="mt-4 flex gap-2"><Button type="button" variant="secondary" onClick={() => setConfirm({ id: item.id, action: 'rotate' })}>Rotate</Button><Button type="button" variant="danger" onClick={() => setConfirm({ id: item.id, action: 'revoke' })}>Revoke</Button></div>}
    </li>)}</ul>)}
    {confirm && <ConfirmDialog title={`${confirm.action === 'rotate' ? 'Rotate' : 'Revoke'} credential?`} description={confirm.action === 'rotate' ? 'The current token will stop working. A replacement token will be shown once.' : 'This token will stop authenticating the device.'} confirmLabel={confirm.action === 'rotate' ? 'Rotate credential' : 'Revoke credential'} pending={rotate.isPending || revoke.isPending} onCancel={() => setConfirm(null)} onConfirm={() => void handleConfirm()} />}
  </section>
}
