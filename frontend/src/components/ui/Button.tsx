import type { ComponentPropsWithRef } from 'react'

interface Props extends ComponentPropsWithRef<'button'> { variant?: 'primary' | 'secondary' | 'danger' }
const styles = {
  primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  secondary: 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
}
export function Button({ className = '', variant = 'primary', ...props }: Props) {
  return <button className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props} />
}
