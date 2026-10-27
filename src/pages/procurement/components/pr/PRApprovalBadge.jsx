const levels = ['L1 Manager', 'L2 HOD', 'L3 Finance'];

const statusColor = {
  Approved: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Pending:  { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export default function PRApprovalBadge({ status }) {
  // Derive which levels are done based on overall status
  const approvedCount = status === 'Approved' ? 3 : status === 'Pending' ? 1 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'nowrap' }}>
      {levels.map((lvl, i) => {
        const done = i < approvedCount;
        const s = done ? statusColor.Approved : statusColor.Pending;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div title={lvl} style={{
              width: 20, height: 20, borderRadius: '50%', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
            }}>{i + 1}</div>
            {i < levels.length - 1 && (
              <div style={{ width: 8, height: 1, background: done ? '#16a34a' : '#e2e8f0', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
