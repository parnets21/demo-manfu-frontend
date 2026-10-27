import { useState, useCallback, useEffect } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import ClientsTab from './components/ClientsTab';
import { clientApi } from '../../api/clientApi';
import { useDataEvent } from '../../utils/dataEvents';
import { MdPerson, MdCheckCircle, MdWarning, MdBlock, MdAdd } from 'react-icons/md';

export default function ClientsPage() {
  const [showClientModal, setShowClientModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, blocked: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await clientApi.getAll({});
      const list = res.data || [];
      setStats({
        total:    list.length,
        active:   list.filter(c => c.status === 'Active').length,
        inactive: list.filter(c => c.status === 'Inactive').length,
        blocked:  list.filter(c => c.status === 'Blocked').length,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useDataEvent('client:changed', fetchStats);

  const kpis = [
    { label: 'Total Clients', value: stats.total,    icon: <MdPerson size={18} />,       color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Active',        value: stats.active,   icon: <MdCheckCircle size={18} />,  color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Inactive',      value: stats.inactive, icon: <MdWarning size={18} />,      color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    { label: 'Blocked',       value: stats.blocked,  icon: <MdBlock size={18} />,        color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)' },
  ];

  return (
    <div>
      <PageHeader
        title="Client Management"
        breadcrumb="Procurement › Clients"
        action={
          <button
            onClick={() => setShowClientModal(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', background:'linear-gradient(135deg,#3b82f6,#1e40af)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, boxShadow:'0 3px 10px rgba(185,28,28,0.3)' }}
          >
            <MdAdd size={18} /> Add Client
          </button>
        }
      />
      <KpiStrip kpis={kpis} />
      <PageCard>
        <ClientsTab
          showClientModal={showClientModal}
          setShowClientModal={setShowClientModal}
          onStatsChange={fetchStats}
        />
      </PageCard>
    </div>
  );
}
