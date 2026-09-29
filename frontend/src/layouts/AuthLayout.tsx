import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
    <div className="w-full max-w-md">
      <Link to="/" className="mb-10 inline-flex items-center gap-3 rounded-lg text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-cyan-400"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 font-black text-slate-950">S</span> SensorHub</Link>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl shadow-black/20 sm:p-9"><Outlet /></div>
      <p className="mt-8 text-center text-sm text-slate-500">Connected telemetry, clearly understood.</p>
    </div>
  </main>
}
