import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../types/api'

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string[]>>({})
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending) return
    setPending(true); setError(''); setFields({})
    try { await auth.register({ name, email, password, password_confirmation: confirmation }); navigate('/app', { replace: true }) }
    catch (caught) {
      if (caught instanceof ApiError) { setFields(caught.errors); setError(caught.status === 422 ? 'Please correct the highlighted fields.' : caught.message) }
      else setError('Something went wrong. Please try again.')
    } finally { setPending(false) }
  }
  return <><h1 className="text-3xl font-semibold tracking-tight">Create your account</h1><p className="mt-2 text-slate-400">Start your SensorHub workspace.</p><form onSubmit={submit} className="mt-8 space-y-5">
    {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    <FormField id="name" label="Name" autoComplete="name" required maxLength={120} value={name} onChange={event => setName(event.target.value)} error={fields.name?.[0]} />
    <FormField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} error={fields.email?.[0]} />
    <FormField id="password" label="Password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} error={fields.password?.[0]} />
    <FormField id="confirmation" label="Confirm password" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)} error={fields.password_confirmation?.[0]} />
    <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">{pending ? 'Creating account…' : 'Create account'}</Button>
  </form><p className="mt-7 text-center text-sm text-slate-400">Already have an account? <Link className="font-medium text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-300" to="/login">Sign in</Link></p></>
}
