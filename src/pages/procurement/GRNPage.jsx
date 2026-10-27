import { useState, useEffect, useCallback } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import GRNTab from './components/GRNTab';
import { grnApi } from '../../api/grnApi';
import { MdInventory, MdCheckCircle, MdHourglassEmpty, MdWarning, MdAdd } from 'react-icons/md';
import { useDataEvent } from '../../utils/dataEvents';


export default function GRNPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, partial: 0, pending: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await grnApi.getAll();
      const list = res.data || [];
      setStats({
        total:     list.length,
        completed: list.filter(g => g.status === 'Completed').length,
        partial:   list.filter(g => g.status === 'Partial').length,
        pending:   list.filter(g => g.status === 'Pending').length,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useDataEvent('grn:changed', fetchStats);

  const kpis = [
    { label: 'Total GRNs', value: stats.total,     icon: <MdInventory size={18} />,      color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Completed',  value: stats.completed, icon: <MdCheckCircle size={18} />,    color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Partial',    value: stats.partial,   icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    { label: 'Pending',    value: stats.pending,   icon: <MdWarning size={18} />,        color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)' },
  ];

  return (
    <div>
      <PageHeader
        title="GRN Entry"
        breadcrumb="Procurement › GRN"
        action={
          <button onClick={() => setShowCreate(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}>
            <MdAdd size={16} /> Create GRN
          </button>
        }
      />

      <KpiStrip kpis={kpis} />

      <PageCard noPad>
        <div style={{ padding: '20px 20px 0' }}>
          <GRNTab
            externalShowCreate={showCreate}
            onExternalClose={() => setShowCreate(false)}
            onSaved={fetchStats}
          />
        </div>
      </PageCard>
    </div>
  );
}
