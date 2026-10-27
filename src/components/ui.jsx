// ─── Shared Tailwind UI primitives ───────────────────────────────────────────
// Import from here in every page: import { Card, Btn, Badge, ... } from '../components/ui'

import { useState } from 'react';

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, color = '#1e40af', icon, change, up }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200 relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      {icon && (
        <div className="flex items-center justify-between mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
            <span style={{ color }}>{icon}</span>
          </div>
          {change && (
            <span className={`text-xs font-bold ${up ? 'text-green-600' : 'text-red-500'}`}>
              {up ? '↑' : '↓'} {change}
            </span>
          )}
        </div>
      )}
      <div className="text-2xl font-black tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
    </div>
  );
}

// ── Section Title ─────────────────────────────────────────────────────────────
export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-3">
      <div className="text-sm font-bold text-gray-800">{children}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
const btnBase = 'inline-flex items-center gap-1.5 font-semibold rounded-lg cursor-pointer transition-all duration-150 border-0 font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed';
const btnSizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
const btnVariants = {
  primary: 'bg-gradient-to-br from-red-400 to-red-700 text-white shadow-md hover:-translate-y-px hover:shadow-lg',
  outline: 'bg-transparent text-red-700 border border-red-600 hover:bg-red-700 hover:text-white',
  accent:  'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md hover:-translate-y-px',
  danger:  'bg-gradient-to-br from-red-400 to-red-700 text-white hover:-translate-y-px',
  success: 'bg-gradient-to-br from-green-400 to-green-600 text-white hover:-translate-y-px',
  ghost:   'bg-gray-100 text-gray-700 hover:bg-gray-200',
};

export function Btn({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button className={`${btnBase} ${btnSizes[size]} ${btnVariants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── Badge / Status ────────────────────────────────────────────────────────────
const badgeMap = {
  // status → [bg, text]
  active:       ['bg-green-100', 'text-green-800'],
  approved:     ['bg-green-100', 'text-green-800'],
  completed:    ['bg-green-100', 'text-green-800'],
  delivered:    ['bg-green-100', 'text-green-800'],
  passed:       ['bg-green-100', 'text-green-800'],
  received:     ['bg-green-100', 'text-green-800'],
  matched:      ['bg-green-100', 'text-green-800'],
  regularized:  ['bg-green-100', 'text-green-800'],
  yes:          ['bg-green-100', 'text-green-800'],
  pending:      ['bg-amber-100', 'text-amber-800'],
  'in-progress':['bg-amber-100', 'text-amber-800'],
  processing:   ['bg-amber-100', 'text-amber-800'],
  partial:      ['bg-amber-100', 'text-amber-800'],
  scheduled:    ['bg-amber-100', 'text-amber-800'],
  sent:         ['bg-amber-100', 'text-amber-800'],
  rejected:     ['bg-red-100',   'text-red-800'],
  cancelled:    ['bg-red-100',   'text-red-800'],
  failed:       ['bg-red-100',   'text-red-800'],
  overdue:      ['bg-red-100',   'text-red-800'],
  critical:     ['bg-red-100',   'text-red-800'],
  mismatch:     ['bg-red-100',   'text-red-800'],
  no:           ['bg-red-100',   'text-red-800'],
  'loss confirmed': ['bg-red-100','text-red-800'],
  draft:        ['bg-gray-100',  'text-gray-600'],
  inactive:     ['bg-gray-100',  'text-gray-600'],
  closed:       ['bg-gray-100',  'text-gray-600'],
  dead:         ['bg-gray-100',  'text-gray-600'],
  expired:      ['bg-gray-100',  'text-gray-600'],
  shipped:      ['bg-blue-100',  'text-blue-800'],
  'in transit': ['bg-blue-100',  'text-blue-800'],
  open:         ['bg-blue-100',  'text-blue-800'],
  info:         ['bg-blue-100',  'text-blue-800'],
  'out for delivery': ['bg-blue-100','text-blue-800'],
  disputed:     ['bg-purple-100','text-purple-800'],
  maintenance:  ['bg-amber-100', 'text-amber-800'],
  'in progress':['bg-amber-100', 'text-amber-800'],
};

const typeMap = {
  success: ['bg-green-100', 'text-green-800'],
  warning: ['bg-amber-100', 'text-amber-800'],
  danger:  ['bg-red-100',   'text-red-800'],
  info:    ['bg-blue-100',  'text-blue-800'],
  purple:  ['bg-purple-100','text-purple-800'],
  gray:    ['bg-gray-100',  'text-gray-600'],
};

export function Badge({ status, type }) {
  // Guard: if status is an object (e.g. accidentally passed a data item), extract label or stringify
  const safeStatus = status && typeof status === 'object'
    ? (status.label || status.name || status.value || JSON.stringify(status))
    : status;
  const key = safeStatus?.toString().toLowerCase();
  const [bg, text] = (type ? typeMap[type] : badgeMap[key]) || ['bg-gray-100', 'text-gray-600'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${bg} ${text}`}>
      {safeStatus != null ? String(safeStatus) : '—'}
    </span>
  );
}

// ── Form primitives ───────────────────────────────────────────────────────────
export function FormGroup({ label, children, span2 }) {
  return (
    <div className={`flex flex-col gap-1.5 ${span2 ? 'col-span-2' : ''}`}>
      {label && <label className="text-xs font-semibold text-gray-600">{label}</label>}
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none transition-all bg-white text-gray-800 font-[inherit] focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400';

export function Input(props) { return <input className={inputCls} {...props} />; }
export function Select({ children, ...props }) { return <select className={inputCls} {...props}>{children}</select>; }
export function Textarea(props) { return <textarea className={`${inputCls} resize-y min-h-[80px]`} {...props} />; }

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b-2 border-gray-200 mb-5 overflow-x-auto scrollbar-none">
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-0.5 transition-all font-[inherit] bg-transparent cursor-pointer flex-shrink-0
            ${active === i ? 'text-red-700 border-red-600' : 'text-gray-400 border-transparent hover:text-red-600'}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ columns, data, onRowClick }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = data.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 w-52 sm:w-64"
            placeholder="Search..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} records</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col, ci) => (
                <th key={`col-${ci}-${col.key}`} className="bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center py-8 text-gray-400">No records found</td></tr>
            ) : paged.map((row, i) => (
              <tr key={i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gray-50 last:border-0 transition-colors ${onRowClick ? 'cursor-pointer' : ''} hover:bg-red-50/40`}
              >
                {columns.map((col, ci) => (
                  <td key={`cell-${i}-${ci}-${col.key}`} className="px-4 py-3 text-gray-800 align-middle">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <Btn variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Btn>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Btn key={p} variant={p === page ? 'primary' : 'outline'} size="sm" onClick={() => setPage(p)}>{p}</Btn>
          ))}
          <Btn variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Btn>
        </div>
      )}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, color = '#1e40af', className = '' }) {
  return (
    <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
const dotColors = { success: 'bg-green-500 ring-green-500', warning: 'bg-amber-400 ring-amber-400', gray: 'bg-gray-300 ring-gray-300', default: 'bg-red-600 ring-red-600' };

export function Timeline({ items }) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-gray-200 rounded" />
      {items.map((item, i) => (
        <div key={i} className="relative mb-5 last:mb-0">
          <div className={`absolute -left-[17px] top-1 w-3 h-3 rounded-full ring-2 ring-offset-1 ${dotColors[item.status] || dotColors.default}`} />
          <div className="text-sm font-semibold text-gray-800">{item.event}</div>
          <div className="text-xs text-gray-400 mt-0.5">{item.time}</div>
          {item.location && <div className="text-xs text-gray-400">{item.location}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
export function Stepper({ steps, current }) {
  return (
    <div className="flex items-start mb-6">
      {steps.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex flex-col items-center flex-1 relative">
            {i < steps.length - 1 && (
              <div className={`absolute top-4 left-1/2 w-full h-0.5 ${done ? 'bg-red-600' : 'bg-gray-200'}`} />
            )}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border-2 transition-all
              ${done   ? 'bg-green-500 border-green-500 text-white'
              : active ? 'bg-red-600 border-red-600 text-white ring-4 ring-red-100'
              :          'bg-gray-100 border-gray-200 text-gray-400'}`}>
              {done ? '✓' : i + 1}
            </div>
            <div className={`text-[10px] mt-1.5 text-center font-medium ${active ? 'text-red-600 font-bold' : done ? 'text-green-600' : 'text-gray-400'}`}>
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export { default as Modal } from './common/Modal';

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() { return <div className="h-px bg-gray-200 my-4" />; }

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, breadcrumb, actions }) {
  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{title}</h1>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs text-gray-400">Home</span>
          <span className="text-xs text-gray-400">›</span>
          <span className="text-xs text-red-600 font-semibold">{breadcrumb || title}</span>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
