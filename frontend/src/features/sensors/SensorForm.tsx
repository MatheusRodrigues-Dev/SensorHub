import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { FormField } from '../../components/ui/FormField'
import { ApiError } from '../../types/api'
import type { Sensor, SensorInput, SensorUpdate } from '../../types/domain'

interface Props { initial?: Sensor; onSubmit: (input: SensorInput | SensorUpdate) => Promise<void>; onCancel: () => void }
export function SensorForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [key, setKey] = useState('')
  const [type, setType] = useState<Sensor['type']>(initial?.type ?? 'generic')
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string[]>>({})
  async function save(event: FormEvent) {
    event.preventDefault(); if (pending) return
    setPending(true); setError(''); setFields({})
    const shared = { name: name.trim(), type, unit: unit.trim() || null }
    try { await onSubmit(initial ? shared : { ...shared, key: key.trim() }) }
    catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.errors)
        setError(caught.status === 409 ? initial ? 'The unit cannot change after measurements exist.' : 'This key is already reserved on the device.' : caught.status === 422 ? 'Please correct the highlighted fields.' : caught.message)
      } else setError('Could not save the sensor. Please try again.')
    } finally { setPending(false) }
  }
  return <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6">
    {error && <Alert>{error}</Alert>}
    <FormField id="sensor-name" label="Sensor name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} error={fields.name?.[0]} />
    <p className="-mt-3 text-xs text-slate-400">A name people can recognize.</p>
    {initial ? <div><p className="text-sm font-medium text-slate-200">Sensor key</p><code className="mt-2 block break-all text-sm text-cyan-300">{initial.key}</code><p className="mt-1 text-xs text-slate-400">This machine identifier cannot change after creation.</p></div> : <><FormField id="sensor-key" label="Sensor key" required maxLength={80} pattern="[a-z0-9_-]+" value={key} onChange={event => setKey(event.target.value)} error={fields.key?.[0]} /><p className="-mt-3 text-xs text-slate-400">Stable machine identifier used in telemetry, for example temperature.</p></>}
    <div className="space-y-1.5"><label htmlFor="sensor-type" className="block text-sm font-medium text-slate-200">Type</label><select id="sensor-type" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-3 text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20" value={type} onChange={event => setType(event.target.value as Sensor['type'])}><option value="generic">Generic</option><option value="temperature">Temperature</option><option value="humidity">Humidity</option><option value="pressure">Pressure</option></select>{fields.type?.[0] && <p className="text-sm text-rose-300">{fields.type[0]}</p>}</div>
    <FormField id="sensor-unit" label="Unit (optional)" maxLength={20} value={unit} onChange={event => setUnit(event.target.value)} error={fields.unit?.[0]} />
    <p className="-mt-3 text-xs text-slate-400">Defines the unit for future measurements. It cannot change once measurements exist.</p>
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={pending} aria-busy={pending}>{pending ? 'Saving…' : initial ? 'Save sensor' : 'Create sensor'}</Button><Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button></div>
  </form>
}
