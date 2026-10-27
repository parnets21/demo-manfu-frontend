/**
 * Pagination.jsx
 * Reusable pagination bar used across the inventory module.
 *
 * Props:
 *   total      – total number of items
 *   page       – current page (1-indexed)
 *   pageSize   – items per page
 *   onPage     – (newPage: number) => void
 *   onPageSize – (newSize: number) => void   (optional — omit to hide size selector)
 *   sizes      – array of page-size options  (default [10, 25, 50, 100])
 */
export default function Pagination({
  total = 0,
  page = 1,
  pageSize = 25,
  onPage,
  onPageSize,
  sizes = [10, 25, 50, 100],
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build page-number windows:  [1] … [p-1] [p] [p+1] … [last]
  const buildPages = () => {
    const pages = [];
    const delta = 2;
    const left  = page - delta;
    const right = page + delta;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…');
      }
    }
    return pages;
  };

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 32, height: 32, padding: '0 8px',
    borderRadius: 8, border: '1.5px solid #e2e8f0',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s',
    background: '#fff', color: '#475569',
    lineHeight: 1,
  };
  const btnActive = {
    ...btnBase,
    background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
    borderColor: 'transparent',
    color: '#fff',
    boxShadow: '0 3px 8px rgba(185,28,28,0.25)',
  };
  const btnDisabled = { ...btnBase, opacity: 0.38, cursor: 'not-allowed', pointerEvents: 'none' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10,
      padding: '12px 16px',
      borderTop: '1px solid #f1f5f9',
      background: '#fafbfc',
      borderRadius: '0 0 14px 14px',
    }}>
      {/* Left: info + page-size picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>
          {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
        </span>
        {onPageSize && (
          <select
            value={pageSize}
            onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
            style={{
              padding: '4px 8px', borderRadius: 8, border: '1.5px solid #e2e8f0',
              fontSize: 12.5, fontFamily: 'inherit', color: '#475569',
              background: '#fff', cursor: 'pointer', outline: 'none',
            }}
          >
            {sizes.map(s => <option key={s} value={s}>{s} / page</option>)}
          </select>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Prev */}
          <button
            style={page === 1 ? btnDisabled : btnBase}
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            title="Previous"
          >‹</button>

          {buildPages().map((p, i) =>
            p === '…'
              ? <span key={`ellipsis-${i}`} style={{ minWidth: 28, textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>…</span>
              : <button
                  key={p}
                  style={p === page ? btnActive : btnBase}
                  onClick={() => onPage(p)}
                  onMouseEnter={e => { if (p !== page) e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseLeave={e => { if (p !== page) e.currentTarget.style.background = '#fff'; }}
                >{p}</button>
          )}

          {/* Next */}
          <button
            style={page === totalPages ? btnDisabled : btnBase}
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            title="Next"
          >›</button>
        </div>
      )}
    </div>
  );
}
