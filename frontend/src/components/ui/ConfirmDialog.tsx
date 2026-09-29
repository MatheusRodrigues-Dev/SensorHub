import { useEffect, useRef } from 'react'
import { Button } from './Button'

interface Props { title: string; description: string; confirmLabel: string; pending: boolean; onCancel: () => void; onConfirm: () => void }
export function ConfirmDialog({ title, description, confirmLabel, pending, onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => { cancelRef.current?.focus() }, [])
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel()
      if (event.key !== 'Tab') return
      const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
      if (buttons.length === 0) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus() }
      else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel, pending])
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation">
    <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
      <h2 id="confirm-title" className="text-xl font-semibold text-white">{title}</h2><p id="confirm-description" className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      <div className="mt-7 flex flex-wrap justify-end gap-3"><Button ref={cancelRef} type="button" variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button><Button type="button" variant="danger" disabled={pending} onClick={onConfirm}>{pending ? 'Working…' : confirmLabel}</Button></div>
    </div>
  </div>
}
