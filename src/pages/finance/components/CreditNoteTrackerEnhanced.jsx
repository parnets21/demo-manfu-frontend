import { useState, useEffect } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import { creditNoteApi } from '../../../api/creditNoteApi';
import { MdCheckCircle, MdWarning, MdError, MdAdd, MdEdit, MdDelete, MdNotifications } from 'react-icons/md';

export default function CreditNoteTrackerEnhanced() {
  const [notes, setNotes] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    vendor: '',
    poId: '',
    amount: 0,
    reason: 'Quality Issue',
    description: '',
    dueDate: '',
    priority: 'medium',
    remarks: ''
  });

  useEffect(() => {
    fetchCreditNotes();
    fetchStats();
  }, [filterStatus]);

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await creditNoteApi.getAll(params);
      setNotes(res.data || []);
    } catch (e) {
      console.error('Error fetching credit notes:', e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await creditNoteApi.getStats();
      setStats(res.data || {});
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const handleSendReminder = async (cnId) => {
    try {
      await creditNoteApi.sendReminder(cnId);
      alert('✓ Reminder sent successfully!');
      fetchCreditNotes();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleDelete = async (cnId) => {
    if (!window.confirm('Are you sure you want to delete this credit note?')) return;
    try {
      await creditNoteApi.delete(cnId);
      alert('✓ Credit note deleted successfully!');
      fetchCreditNotes();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return { bg: '#f3f4f6', color: '#6b7280' };
      case 'Pending': return { bg: '#fef3c7', color: '#92400e' };
      case 'Approved': return { bg: '#dcfce7', color: '#166534' };
      case 'Overdue': return { bg: '#fee2e2', color: '#991b1b' };
      case 'Paid': return { bg: '#dbeafe', color: '#0c4a6e' };
      case 'Cancelled': return { bg: '#f3f4f6', color: '#6b7280' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return <MdError size={16} style={{ color: '#dc2626' }} />;
      case 'high': return <MdWarning size={16} style={{ color: '#f59e0b' }} />;
      case 'medium': return <MdNotifications size={16} style={{ color: '#3b82f6' }} />;
      default: return <MdCheckCircle size={16} style={{ color: '#10b981' }} />;
    }
  };

  const getDaysOverdue = (dueDate) => {
    const days = Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const getDaysUntilDue = (dueDate) => {
    const days = Math.floor((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleSave = async () => {
    if (!formData.vendor || !formData.amount || !formData.dueDate) {
      alert('Vendor, amount and due date are required');
      return;
    }
    setSaving(true);
    try {
      await creditNoteApi.create({
        party: formData.vendor,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
        remarks: formData.remarks,
      });
      setShowForm(false);
      setFormData({ vendor: '', poId: '', amount: 0, reason: 'Quality Issue', description: '', dueDate: '', priority: 'medium', remarks: '' });
      fetchCreditNotes();
      fetchStats();
    } catch (e) {
      alert(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>TOTAL NOTES</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{stats.total || 0}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>PENDING</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{stats.pending || 0}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>OVERDUE</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{stats.overdue || 0}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>TOTAL AMOUNT</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>₹{Math.round(stats.totalAmount || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Filter & Add Button */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Status</option>
          <option>Draft</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Overdue</option>
          <option>Paid</option>
          <option>Cancelled</option>
        </select>
        <button 
          className="btn btn-sm btn-primary" 
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}
        >
          <MdAdd size={16} /> Add Credit Note
        </button>
      </div>

      {/* Credit Notes List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No credit notes found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>CN ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>VENDOR</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>AMOUNT</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>REASON</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>STATUS</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>DUE DATE</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>PRIORITY</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => {
                  const statusColor = getStatusColor(note.status);
                  const daysOverdue = getDaysOverdue(note.dueDate);
                  const daysUntilDue = getDaysUntilDue(note.dueDate);
                  const isOverdue = note.status === 'Overdue' || (new Date() > new Date(note.dueDate) && note.status !== 'Paid');

                  return (
                    <tr key={note._id} style={{ borderBottom: '1px solid #e2e8f0', background: isOverdue ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>{note.cnId}</td>
                      <td style={{ padding: '12px' }}>{note.vendor?.companyName || '—'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{note.amount.toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b' }}>{note.reason}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: statusColor.bg,
                          color: statusColor.color,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {note.status}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: '#64748b' }}>
                        {new Date(note.dueDate).toLocaleDateString('en-IN')}
                        {isOverdue && (
                          <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 2, fontSize: 11 }}>
                            {daysOverdue} days overdue
                          </div>
                        )}
                        {!isOverdue && daysUntilDue <= 7 && daysUntilDue > 0 && (
                          <div style={{ color: '#f59e0b', fontWeight: 600, marginTop: 2, fontSize: 11 }}>
                            {daysUntilDue} days left
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {getPriorityIcon(note.priority)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {isOverdue && !note.reminderSent && (
                          <button
                            onClick={() => handleSendReminder(note._id)}
                            title="Send Reminder"
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: '#fef3c7',
                              border: '1px solid #fcd34d',
                              color: '#92400e',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 500,
                              fontFamily: 'inherit'
                            }}
                          >
                            🔔
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(note._id)}
                          title="Delete"
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                            fontFamily: 'inherit'
                          }}
                        >
                          <MdDelete size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        open={showForm} 
        onClose={() => setShowForm(false)} 
        title="Add Credit Note"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Vendor *</label>
            <input type="text" className="form-input" placeholder="Vendor name" value={formData.vendor} onChange={e => setFormData(p => ({ ...p, vendor: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input type="number" className="form-input" placeholder="0.00" value={formData.amount || ''} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <select className="form-select" value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}>
              <option>Quality Issue</option>
              <option>Price Adjustment</option>
              <option>Defective Goods</option>
              <option>Partial Return</option>
              <option>Overcharge</option>
              <option>Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input type="date" className="form-input" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={formData.priority} onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select">
              <option>Draft</option>
              <option>Pending</option>
              <option>Approved</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} placeholder="Details..." value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
