import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import { MdCheckCircle, MdWarning, MdError, MdNotifications } from 'react-icons/md';
import { creditNoteApi } from '../../../api/creditNoteApi';

export default function CreditNoteTracker() {
  const [notes, setNotes] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCreditNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const res = await creditNoteApi.getAll(params);
      setNotes(res.data || []);
    } catch (e) {
      console.error('CreditNoteTracker fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchCreditNotes(); }, [fetchCreditNotes]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':     return { bg: '#fef3c7', color: '#92400e' };
      case 'Closed':   return { bg: '#dcfce7', color: '#166534' };
      case 'Disputed': return { bg: '#fee2e2', color: '#991b1b' };
      default:         return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getPriorityIcon = (daysOpen) => {
    if (daysOpen >= 15) return <MdError size={16} style={{ color: '#dc2626' }} />;
    if (daysOpen >= 7)  return <MdWarning size={16} style={{ color: '#f59e0b' }} />;
    return <MdNotifications size={16} style={{ color: '#3b82f6' }} />;
  };

  const stats = {
    total:       notes.length,
    open:        notes.filter(n => n.status === 'Open').length,
    overdue:     notes.filter(n => n.daysOpen >= 7 && n.status === 'Open').length,
    totalAmount: notes.reduce((sum, n) => sum + (n.amount || 0), 0),
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>TOTAL NOTES</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>OPEN</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{stats.open}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>OVERDUE (7d+)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{stats.overdue}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>TOTAL AMOUNT</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>₹{Math.round(stats.totalAmount).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Status</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
          <option value="Disputed">Disputed</option>
        </select>
      </div>

      {/* Credit Notes List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No credit notes found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  {['CN ID', 'VENDOR', 'AMOUNT', 'REASON', 'STATUS', 'DAYS OPEN', 'ALERT'].map(h => (
                    <th key={h} style={{ padding: '12px', textAlign: h === 'AMOUNT' ? 'right' : 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => {
                  const statusColor = getStatusColor(note.status);
                  const isOverdue = note.daysOpen >= 7 && note.status === 'Open';
                  return (
                    <tr key={note._id} style={{ borderBottom: '1px solid #e2e8f0', background: isOverdue ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>{note.cnId}</td>
                      <td style={{ padding: '12px' }}>{note.vendorName || '—'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{(note.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.reason || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, background: statusColor.bg, color: statusColor.color, fontSize: 11, fontWeight: 600 }}>
                          {note.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: isOverdue ? '#dc2626' : '#64748b' }}>
                        {note.daysOpen ?? 0}d
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {isOverdue && getPriorityIcon(note.daysOpen)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
