/**
 * PageShell — shared premium layout primitives used across all module pages.
 * Provides: PageHeader, PageCard, PageTabs, KpiStrip, SectionLabel
 */

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, breadcrumb, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 22, flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Home</span>
          <span style={{ fontSize: 11.5, color: '#cbd5e1' }}>›</span>
          <span style={{ fontSize: 11.5, color: '#1e40af', fontWeight: 600 }}>{breadcrumb || title}</span>
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── KPI Strip ─────────────────────────────────────────────────────────────────
export function KpiStrip({ kpis }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, 1fr)`,
      gap: 14, marginBottom: 20,
    }}>
      {kpis.map((k, i) => (
        <div key={i} style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e8edf2',
          padding: '18px 20px',
          boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s ease',
          cursor: 'default',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${k.glow || 'rgba(192,57,43,0.15)'}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(15,23,42,0.05)'; }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.gradient || `linear-gradient(90deg,${k.color || '#1e40af'},${k.color2 || '#f39c12'})`, borderRadius: '16px 16px 0 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {k.icon && (
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: k.gradient || `linear-gradient(135deg,${k.color || '#1e40af'},${k.color2 || '#f39c12'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16, flexShrink: 0,
                boxShadow: `0 3px 10px ${k.glow || 'rgba(192,57,43,0.3)'}`,
              }}>{k.icon}</div>
            )}
            {k.change && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: k.up ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: k.up ? '#16a34a' : '#dc2626',
              }}>{k.up ? '↑' : '↓'} {k.change}</span>
            )}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: k.color || '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>{String(k.value || '—')}</div>
          <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500, marginTop: 5 }}>{String(k.label || '')}</div>
        </div>
      ))}
    </div>
  );
}

// ── Page Card ─────────────────────────────────────────────────────────────────
export function PageCard({ children, style = {}, noPad = false }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: '1px solid #e8edf2',
      boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
      overflow: 'hidden',
      ...(noPad ? {} : { padding: '20px' }),
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Card Header ───────────────────────────────────────────────────────────────
export function CardHead({ title, sub, right, style = {} }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 16, ...style,
    }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.2px' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

// ── Page Tabs ─────────────────────────────────────────────────────────────────
export function PageTabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 0,
      borderBottom: '2px solid #f1f5f9',
      marginBottom: 20,
      overflowX: 'auto',
    }} className="scrollbar-none">
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          style={{
            padding: '10px 20px',
            fontSize: 13, fontWeight: 600,
            whiteSpace: 'nowrap', flexShrink: 0,
            border: 'none', background: 'transparent',
            fontFamily: 'inherit', cursor: 'pointer',
            borderBottom: `2px solid ${active === i ? '#1e40af' : 'transparent'}`,
            marginBottom: -2,
            color: active === i ? '#1e40af' : '#94a3b8',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { if (active !== i) e.currentTarget.style.color = '#1e40af'; }}
          onMouseLeave={e => { if (active !== i) e.currentTarget.style.color = '#94a3b8'; }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Section Label ─────────────────────────────────────────────────────────────
export function SectionLabel({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ── Premium Table ─────────────────────────────────────────────────────────────
export function PTable({ columns, rows, emptyText = 'No data' }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #f1f5f9' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {columns.map((c, i) => (
              <th key={i} style={{
                padding: '10px 16px', textAlign: 'left',
                fontSize: 10.5, fontWeight: 700, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.7px',
                borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>{emptyText}</td></tr>
          ) : rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid #f8fafc', transition: 'background .1s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map((c, ci) => (
                <td key={ci} style={{ padding: '11px 16px', fontSize: 12.5, color: '#1e293b', verticalAlign: 'middle' }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onClick, size = 'md', style = {} }) {
  const pad = size === 'sm' ? '6px 14px' : '9px 18px';
  const fs  = size === 'sm' ? 12 : 13;
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad, borderRadius: 10,
      background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
      color: '#fff', border: 'none', cursor: 'pointer',
      fontSize: fs, fontWeight: 600, fontFamily: 'inherit',
      boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
      transition: 'all .15s', ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(185,28,28,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(185,28,28,0.3)'; }}
    >
      {children}
    </button>
  );
}

// ── Outline Button ────────────────────────────────────────────────────────────
export function OutlineBtn({ children, onClick, size = 'md', style = {} }) {
  const pad = size === 'sm' ? '5px 12px' : '8px 16px';
  const fs  = size === 'sm' ? 12 : 13;
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad, borderRadius: 10,
      background: 'transparent', color: '#1e40af',
      border: '1.5px solid #1e40af', cursor: 'pointer',
      fontSize: fs, fontWeight: 600, fontFamily: 'inherit',
      transition: 'all .15s', ...style,
    }}
      onMouseEnter={e => { e.currentTarget.style.background = '#1e40af'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1e40af'; }}
    >
      {children}
    </button>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ pct, color = '#1e40af', height = 7 }) {
  return (
    <div style={{ height, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99,
        width: `${Math.min(pct, 100)}%`,
        background: color,
        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}
// ── Default PageShell Wrapper ────────────────────────────────────────────────
export default function PageShell({ 
  title, 
  subtitle, 
  breadcrumb, 
  action, 
  children 
}) {
  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#f8fafc' }}>
      {(title || subtitle) && (
        <PageHeader 
          title={title} 
          breadcrumb={breadcrumb} 
          action={action}
        />
      )}
      {subtitle && (
        <div style={{ 
          fontSize: 14, 
          color: '#64748b', 
          marginBottom: 20,
          marginTop: title ? -10 : 0 
        }}>
          {subtitle}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}