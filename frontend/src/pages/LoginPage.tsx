import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { FormField } from '../components/ui/FormField'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../types/api'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string[]>>({})
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending) return
    setPending(true); setError(''); setFields({})
    try { await auth.login({ email, password }); navigate('/app', { replace: true }) }
    catch (caught) {
      if (caught instanceof ApiError) {
        setFields(caught.errors)
        setError(caught.status === 401 ? 'Invalid email or password.' : caught.status === 422 ? 'Please correct the highlighted fields.' : caught.message)
      } else setError('Something went wrong. Please try again.')
    } finally { setPending(false) }
  }
  return <><h1 className="text-3xl font-semibold tracking-tight">Sign in</h1><p className="mt-2 text-slate-400">Access your SensorHub workspace.</p><form onSubmit={submit} className="mt-8 space-y-5">
    {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    <FormField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} error={fields.email?.[0]} />
    <FormField id="password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} error={fields.password?.[0]} />
    <Button type="submit" disabled={pending} aria-busy={pending} className="w-full">{pending ? 'Signing in…' : 'Sign in'}</Button>
  </form><p className="mt-7 text-center text-sm text-slate-400">New to SensorHub? <Link className="font-medium text-cyan-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-300" to="/register">Create an account</Link></p></>
}
