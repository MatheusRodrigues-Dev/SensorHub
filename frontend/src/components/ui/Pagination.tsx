import { Button } from './Button'

interface Props { page: number; perPage: number; total: number; onPage: (page: number) => void }
export function Pagination({ page, perPage, total, onPage }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5 text-sm text-slate-400">
    <span>Page {page} of {lastPage} · {total} total</span><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><Button variant="secondary" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>Next</Button></div>
  </nav>
}
