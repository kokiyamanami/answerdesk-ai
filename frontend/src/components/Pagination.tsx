import { useEffect, useMemo, useState } from 'react'

export function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  return { page, setPage, pageCount, pageItems, pageSize, total: items.length }
}

type Props = {
  page: number
  pageCount: number
  onChange: (page: number) => void
  total?: number
}

export default function Pagination({ page, pageCount, onChange, total }: Props) {
  if (pageCount <= 1) return null

  const nums: (number | '…')[] = []
  for (let i = 1; i <= pageCount; i++) {
    if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) nums.push(i)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }

  const btn = (active: boolean): React.CSSProperties => ({
    minWidth: 30, height: 30, padding: '0 6px', borderRadius: 6, fontSize: 13,
    border: '1px solid var(--gray-200)',
    background: active ? 'var(--brand)' : '#fff',
    color: active ? '#fff' : 'var(--gray-700)',
    cursor: active ? 'default' : 'pointer',
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', flexWrap: 'wrap' }}>
      <button style={btn(false)} disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {nums.map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} style={{ color: 'var(--gray-400)', padding: '0 2px' }}>…</span>
          : <button key={n} style={btn(n === page)} disabled={n === page} onClick={() => onChange(n)}>{n}</button>,
      )}
      <button style={btn(false)} disabled={page === pageCount} onClick={() => onChange(page + 1)}>›</button>
      {total != null && (
        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--gray-400)' }}>全 {total} 件</span>
      )}
    </div>
  )
}
