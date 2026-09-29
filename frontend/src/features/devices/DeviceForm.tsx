import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { ApiError } from '../../types/api'
import type { DeviceInput } from '../../types/domain'

interface Props { initial?: DeviceInput; submitLabel: string; onSubmit: (input: DeviceInput) => Promise<void>; onCancel: () => void }
export function DeviceForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [identifier, setIdentifier] = useState(initial?.identifier ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string[]>>({})
  async function save(event: FormEvent) {
    event.preventDefault(); if (pending) return
    setPending(true); setError(''); setFields({})
    try { await onSubmit({ name: name.trim(), identifier: identifier.trim() }) }
    catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.errors)
        setError(caught.status === 409 ? 'This device identifier is already in use, or the change conflicts with existing data.' : caught.status === 422 ? 'Please correct the highlighted fields.' : caught.message)
      } else setError('Could not save the device. Please try again.')
    } finally { setPending(false) }
  }
  return <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6">
    {error && <Alert>{error}</Alert>}
    <FormField id="device-name" label="Device name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} error={fields.name?.[0]} />
    <FormField id="device-identifier" label="Device identifier" required maxLength={120} value={identifier} onChange={event => setIdentifier(event.target.value)} error={fields.identifier?.[0]} />
    <p className="text-sm text-slate-400">Use a recognizable identifier for the physical or simulated device.</p>
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={pending} aria-busy={pending}>{pending ? 'Saving…' : submitLabel}</Button><Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button></div>
  </form>
}
