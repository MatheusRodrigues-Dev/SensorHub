import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string }
export function FormField({ label, error, id, className = '', ...props }: Props) {
  return <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-200">{label}</label>
    <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={`w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 ${className}`} {...props} />
    {error && <p id={`${id}-error`} className="text-sm text-rose-300">{error}</p>}
  </div>
}
