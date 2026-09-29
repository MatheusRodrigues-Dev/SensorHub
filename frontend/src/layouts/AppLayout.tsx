import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/useAuth'

export function AppLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  if (auth.status !== 'authenticated') return null
  async function signOut() {
    setPending(true); setError('')
    try { await auth.logout(); navigate('/login', { replace: true }) }
    catch { setError('Could not sign out. Please try again.') }
    finally { setPending(false) }
  }
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="border-b border-slate-800"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5"><span className="text-xl font-bold"><span className="text-cyan-400">S</span> SensorHub</span><div className="flex items-center gap-5"><span className="hidden text-sm text-slate-300 sm:block">{auth.user.email}</span><Button onClick={signOut} disabled={pending} className="min-h-9 bg-slate-800 px-4 text-slate-100 hover:bg-slate-700">{pending ? 'Signing out…' : 'Sign out'}</Button></div></div></header>
    <main className="mx-auto max-w-6xl px-6 py-16"><p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">Workspace</p><h1 className="text-4xl font-semibold tracking-tight">Welcome, {auth.user.name}.</h1><p className="mt-4 max-w-xl text-slate-400">Your account is connected. Device management and measurement views are coming in the next phase.</p>{error && <p role="alert" className="mt-6 text-rose-300">{error}</p>}</main>
  </div>
}
