// Shared UI primitives used across all pages

export const inputCls = "w-full py-[9px] px-[13px] border-[1.5px] border-[#e2e8f0] rounded-[9px] text-[13px] text-[#1c2833] bg-white outline-none transition-all duration-[180ms] focus:border-[#1e40af] focus:shadow-[0_0_0_3px_rgba(192,57,43,0.1)] placeholder:text-[#a0aec0]";

export function PageHeader({ title, breadcrumb, children }) {
  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <div className="text-[21px] font-extrabold text-[#1c2833] tracking-[-0.3px]">{title}</div>
        <div className="flex items-center gap-[5px] text-[12px] text-[#a0aec0] mt-[3px]">
          <span>Home</span><span>›</span><span className="text-[#1e40af] font-semibold">{breadcrumb}</span>
        </div>
      </div>
      {children && <div className="flex gap-[10px]">{children}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-0 border-b-2 border-[#e2e8f0] mb-[22px] overflow-x-auto">
      {tabs.map((t, i) => (
        <div key={i} onClick={() => onChange(i)}
          className={`px-[22px] py-[11px] text-[13px] font-semibold cursor-pointer border-b-2 -mb-[2px] transition-all duration-[180ms] whitespace-nowrap ${active === i ? 'text-[#1e40af] border-[#1e40af]' : 'text-[#718096] border-transparent hover:text-[#1e40af]'}`}>
          {t}
        </div>
      ))}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-[14px] p-[22px] border border-[#e2e8f0] shadow-[0_2px_8px_rgba(192,57,43,0.06)] ${className}`}>{children}</div>;
}

export function KpiCard({ value, label, color, textColor, bg }) {
  return (
    <div className="bg-white rounded-[14px] p-5 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(192,57,43,0.06)] flex flex-col gap-[10px] relative overflow-hidden transition-all duration-[220ms] hover:-translate-y-[3px] hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)] group"
      style={bg ? { background: bg, border: 'none' } : {}}>
      <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: 'linear-gradient(90deg, #1e40af, #f39c12)' }} />
      <div className="text-[28px] font-extrabold tracking-[-0.5px]" style={{ color: textColor || color || '#1c2833' }}>{value}</div>
      <div className="text-[12px] text-[#718096] font-medium">{label}</div>
    </div>
  );
}

export function FormGroup({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-[6px] mb-4 ${className}`}>
      {label && <label className="text-[12px] font-semibold text-[#4a5568]">{label}</label>}
      {children}
    </div>
  );
}

export function Btn({ children, onClick, outline, sm, gray, danger, success, accent, disabled, full, type = 'button' }) {
  let cls = 'inline-flex items-center justify-center gap-[6px] rounded-[9px] font-semibold cursor-pointer border-none transition-all duration-[180ms] ';
  cls += sm ? 'px-3 py-[6px] text-[12px] rounded-[7px] ' : 'px-[18px] py-[9px] text-[13px] ';
  if (full) cls += 'w-full ';
  if (outline) cls += 'bg-transparent text-[#1e40af] border-[1.5px] border-[#1e40af] hover:bg-[#1e40af] hover:text-white ';
  else if (gray) cls += 'bg-[#f1f5f9] text-[#1c2833] border-[1.5px] border-[#f1f5f9] ';
  else if (danger) cls += 'text-white shadow-[0_2px_8px_rgba(192,57,43,0.2)] hover:-translate-y-px ';
  else if (success) cls += 'text-white shadow-[0_2px_8px_rgba(39,174,96,0.2)] hover:-translate-y-px ';
  else if (accent) cls += 'text-white shadow-[0_2px_8px_rgba(243,156,18,0.25)] hover:-translate-y-px ';
  else cls += 'text-white shadow-[0_2px_8px_rgba(192,57,43,0.25)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(192,57,43,0.35)] ';
  if (disabled) cls += 'opacity-50 cursor-not-allowed ';

  const bg = danger ? 'linear-gradient(135deg,#e74c3c,#1e40af)'
    : success ? 'linear-gradient(135deg,#2ecc71,#27ae60)'
    : accent ? 'linear-gradient(135deg,#f8c471,#f39c12)'
    : (!outline && !gray) ? 'linear-gradient(135deg,#e74c3c,#1e40af)' : undefined;

  return <button type={type} onClick={onClick} disabled={disabled} className={cls} style={bg ? { background: bg } : {}}>{children}</button>;
}

export function TableHead({ cols }) {
  return (
    <thead>
      <tr>
        {cols.map(c => (
          <th key={c} className="bg-[#f8fafc] px-4 py-[11px] text-left font-bold text-[#718096] text-[10.5px] uppercase tracking-[0.7px] border-b border-[#e2e8f0] whitespace-nowrap">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-[13px] align-middle ${className}`}>{children}</td>;
}

export function SimpleTable({ cols, children }) {
  return (
    <div className="overflow-x-auto rounded-[10px] border border-[#e2e8f0]">
      <table className="w-full border-collapse text-[13px]">
        <TableHead cols={cols} />
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ProgressBar({ pct, color = '#1e40af', height = 7 }) {
  return (
    <div className="rounded-[10px] overflow-hidden bg-[#edf2f7]" style={{ height }}>
      <div className="h-full rounded-[10px] transition-[width] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function StatRow({ label, value, last }) {
  return (
    <div className={`flex justify-between items-center py-[10px] text-[13px] ${last ? '' : 'border-b border-[#f0f4f8]'}`}>
      <span className="text-[#718096]">{label}</span>
      <span className="font-bold text-[#1c2833]">{value}</span>
    </div>
  );
}

export function Timeline({ items }) {
  return (
    <div className="relative pl-[26px]">
      <div className="absolute left-[9px] top-[6px] bottom-[6px] w-[2px] bg-[#e2e8f0] rounded-[2px]" />
      {items.map((t, i) => (
        <div key={i} className="relative mb-[22px]">
          <div className={`absolute -left-[21px] top-1 w-[13px] h-[13px] rounded-full border-[2.5px] border-white ${t.status === 'success' ? 'bg-[#27ae60] shadow-[0_0_0_2px_#27ae60]' : t.status === 'warning' ? 'bg-[#f39c12] shadow-[0_0_0_2px_#f39c12]' : 'bg-[#cbd5e0] shadow-[0_0_0_2px_#cbd5e0]'}`} />
          <div className="font-semibold text-[13px]">{t.event}</div>
          <div className="text-[11px] text-[#718096] mt-[2px]">{t.time}</div>
          <div className="text-[11px] text-[#1e40af] mt-[1px]">📍 {t.location}</div>
        </div>
      ))}
    </div>
  );
}
