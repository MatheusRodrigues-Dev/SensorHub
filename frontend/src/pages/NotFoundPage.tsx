import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="mx-auto max-w-3xl px-6 py-24 text-slate-100"><p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">404</p><h1 className="mt-3 text-3xl font-semibold">Page not found</h1><p className="mt-4 text-slate-400">This address is unavailable.</p><Link to="/app" className="mt-6 inline-block text-cyan-300 underline">Go to Devices</Link></main>
}
