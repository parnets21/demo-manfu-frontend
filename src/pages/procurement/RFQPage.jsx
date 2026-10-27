import { useState, useEffect, useCallback } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import RFQTab from './components/RFQTab';
import { rfqApi } from '../../api/rfqApi';
import { MdRequestQuote, MdHourglassEmpty, MdCheckCircle, MdAdd } from 'react-icons/md';


export default function RFQPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, quoted: 0, closed: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await rfqApi.getAll();
      const list = res.data || [];
      setStats({
        total:  list.length,
        sent:   list.filter(r => r.status === 'Sent').length,
        quoted: list.filter(r => r.status === 'Quoted').length,
        closed: list.filter(r => r.status === 'Closed').length,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const kpis = [
    { label: 'Total RFQs', value: stats.total,  icon: <MdRequestQuote size={18} />,  color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Sent',       value: stats.sent,   icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    { label: 'Quoted',     value: stats.quoted, icon: <MdCheckCircle size={18} />,    color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)' },
    { label: 'Closed',     value: stats.closed, icon: <MdCheckCircle size={18} />,    color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
  ];

  return (
    <div>
      <PageHeader
        title="RFQ Management"
        breadcrumb="Procurement › RFQ"
        action={
          <button onClick={() => setShowCreate(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}>
            <MdAdd size={16} /> Create RFQ
          </button>
        }
      />

      <KpiStrip kpis={kpis} />

      <PageCard noPad>
        <div style={{ padding: '20px 20px 0' }}>
          <RFQTab
            externalShowCreate={showCreate}
            onExternalClose={() => setShowCreate(false)}
            onSaved={fetchStats}
          />
        </div>
      </PageCard>
    </div>
  );
}
