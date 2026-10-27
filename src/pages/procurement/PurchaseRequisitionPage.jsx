import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/common/Modal';
import { departmentApi } from '../../api/departmentApi';
import { prApi } from '../../api/prApi';
import PurchaseRequisitionTab from './components/PurchaseRequisitionTab';
import { useAuth } from '../../auth/AuthContext';
import { isViewOnly } from '../../auth/rbac';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import { MdAssignment, MdHourglassEmpty, MdCheckCircle, MdCancel, MdAdd } from 'react-icons/md';
import { useDataEvent } from '../../utils/dataEvents';


export default function PurchaseRequisitionPage() {
  const { user } = useAuth();
  const viewOnly = isViewOnly(user?.role, 'procurement');
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await prApi.getAll();
      const list = res.data || [];
      setStats({
        total:    list.length,
        pending:  list.filter(p => p.status === 'Pending').length,
        approved: list.filter(p => p.status === 'Approved').length,
        rejected: list.filter(p => p.status === 'Rejected').length,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Also re-fetch when PRList fires delete/approve events directly
  useDataEvent('pr:changed', fetchStats);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddDepartment = async (name) => {
    if (!name.trim()) return;
    try {
      const res = await departmentApi.create(name.trim());
      setDepartments(prev => [...prev, res.data]);
      setNewDepartment('');
    } catch (e) { alert(e.message); }
  };

  const handleDeleteDepartment = async (dept) => {
    try {
      await departmentApi.delete(dept._id);
      setDepartments(prev => prev.filter(d => d._id !== dept._id));
    } catch (e) { alert(e.message); }
  };

  const openDepartmentModal = () => { setShowDepartmentModal(true); loadDepartments(); };

  const kpis = [
    { label: 'Total PRs',  value: stats.total,    icon: <MdAssignment size={18} />,    color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Pending',    value: stats.pending,  icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    { label: 'Approved',   value: stats.approved, icon: <MdCheckCircle size={18} />,   color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Rejected',   value: stats.rejected, icon: <MdCancel size={18} />,        color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)' },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Requisition"
        breadcrumb="Procurement › Purchase Requisition"
        action={
          !viewOnly && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={openDepartmentModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                ⚙ Departments
              </button>
              <button
                onClick={() => setShowCreate(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 3px 10px rgba(185,28,28,0.3)' }}
              >
                <MdAdd size={16} /> Create PR
              </button>
            </div>
          )
        }
      />

      <KpiStrip kpis={kpis} />

      <PageCard noPad>
        <div style={{ padding: '20px 20px 0' }}>
          <PurchaseRequisitionTab
            externalShowCreate={showCreate}
            onExternalClose={() => setShowCreate(false)}
            onSaved={fetchStats}
          />
        </div>
      </PageCard>

      {/* Manage Departments Modal */}
      <Modal
        open={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        title="Manage Departments"
        footer={<button className="btn btn-primary" onClick={() => setShowDepartmentModal(false)}>Done</button>}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="New department name..."
            value={newDepartment}
            onChange={e => setNewDepartment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddDepartment(newDepartment); }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={() => handleAddDepartment(newDepartment)}
            style={{ flexShrink: 0, padding: '0 16px' }}>+</button>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {departments.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No departments found</div>
            ) : departments.map((dept) => (
              <div key={dept._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
              }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{dept.name}</span>
                <button
                  className="btn btn-sm"
                  style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', flexShrink: 0 }}
                  onClick={() => handleDeleteDepartment(dept)}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
