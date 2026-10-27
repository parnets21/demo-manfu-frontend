export default function RFQFlowBadge({ prRef, rfqId, poRef }) {
  const step = poRef ? 2 : 1;
  const nodes = [
    { label: prRef || '—', title: 'PR' },
    { label: rfqId, title: 'RFQ' },
    { label: poRef || 'Pending', title: 'PO' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {nodes.map((n, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: i <= step ? '#fdf5f5' : '#f1f5f9',
            color: i <= step ? 'var(--primary)' : '#94a3b8',
            border: `1px solid ${i <= step ? '#f5c6c2' : '#e2e8f0'}`,
          }}>
            <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 1 }}>{n.title}</div>
            {n.label}
          </div>
          {i < nodes.length - 1 && (
            <div style={{ width: 20, height: 1, background: i < step ? 'var(--primary)' : '#e2e8f0', margin: '0 2px' }} />
          )}
        </div>
      ))}
    </div>
  );
}
