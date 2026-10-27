export default function BarChart({ data, color = '#1e40af', height = 180 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 10, color: 'var(--text-light)', fontWeight: 600 }}>
              {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
            </span>
            <div
              style={{
                width: '100%',
                height: `${(d.value / max) * 85}%`,
                background: d.color || color,
                borderRadius: '4px 4px 0 0',
                minHeight: 4,
                transition: 'height 0.5s ease',
                cursor: 'pointer',
                opacity: 0.85,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '6px 4px 0', borderTop: '1px solid var(--border)' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
