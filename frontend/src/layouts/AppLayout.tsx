import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
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
    <header className="border-b border-slate-800 bg-slate-900/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link to="/app" className="rounded-lg text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-cyan-300"><span className="text-cyan-400">S</span> SensorHub</Link>
        <nav aria-label="Main navigation" className="order-3 w-full sm:order-none sm:w-auto"><Link to="/app" className="inline-flex rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-300">Devices</Link></nav>
        <div className="flex items-center gap-3 sm:gap-5"><span className="hidden max-w-44 truncate text-sm text-slate-400 md:block" title={auth.user.email}>{auth.user.name}</span><Button onClick={signOut} disabled={pending} variant="secondary" className="min-h-9 px-4 text-sm">{pending ? 'Signing out…' : 'Sign out'}</Button></div>
      </div>
    </header>
    {error && <div className="mx-auto max-w-6xl px-6 pt-6"><Alert>{error}</Alert></div>}
    <Outlet />
  </div>
}
