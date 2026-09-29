import type { ReactNode } from 'react'

export function Alert({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{children}</p>
}
