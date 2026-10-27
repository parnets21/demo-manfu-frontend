import { useState, useEffect, useCallback } from 'react';
import { categoryApi } from '../../api/categoryApi';
import { vendorApi } from '../../api/vendorApi';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import VendorsTab from './components/VendorsTab';
import { MdBusiness, MdCheckCircle, MdWarning, MdBlock, MdAdd } from 'react-icons/md';
import { useDataEvent } from '../../utils/dataEvents';

export default function VendorsPage() {
  const [categories, setCategories]         = useState([]);
  const [newCategory, setNewCategory]       = useState('');
  const [showVendorModal, setShowVendorModal]     = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, blacklisted: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await vendorApi.getAll({});
      const list = res.data || [];
      setStats({
        total:       list.length,
        active:      list.filter(v => v.status === 'Active').length,
        inactive:    list.filter(v => v.status === 'Inactive').length,
        blacklisted: list.filter(v => v.status === 'Blacklisted').length,
      });
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useDataEvent('vendor:changed', fetchStats);

  useEffect(() => {
    categoryApi.getAll()
      .then(res => setCategories(res.data || []))
      .catch(() => {});
  }, []);

  const handleAddCategory = async (name) => {
    if (!name?.trim()) return;
    try {
      const res = await categoryApi.create(name.trim());
      setCategories(prev => [...prev, res.data]);
      setNewCategory('');
    } catch (e) { alert(e.message); }
  };

  const handleDeleteCategory = async (cat) => {
    if (!cat._id) {
      setCategories(prev => prev.filter(c => (c.name || c) !== (cat.name || cat)));
      return;
    }
    try {
      await categoryApi.delete(cat._id);
      setCategories(prev => prev.filter(c => c._id !== cat._id));
    } catch (e) { alert(e.message); }
  };

  const kpis = [
    { label: 'Total Vendors',   value: stats.total,       icon: <MdBusiness size={18} />,    color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Active',          value: stats.active,      icon: <MdCheckCircle size={18} />, color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Inactive',        value: stats.inactive,    icon: <MdWarning size={18} />,     color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    { label: 'Blacklisted',     value: stats.blacklisted, icon: <MdBlock size={18} />,       color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)' },
  ];

  const categoryNames = categories.map(c => c.name || c);

  return (
    <div>
      <PageHeader
        title="Vendor Management"
        breadcrumb="Procurement › Vendors"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCategoryModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Categories
            </button>
            <button
              onClick={() => setShowVendorModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 3px 10px rgba(185,28,28,0.3)' }}
            >
              <MdAdd size={18} /> Add Vendor
            </button>
          </div>
        }
      />

      <KpiStrip kpis={kpis} />

      <PageCard>
        <VendorsTab
          categories={categoryNames}
          categoriesRaw={categories}
          showVendorModal={showVendorModal}
          setShowVendorModal={setShowVendorModal}
          showCategoryModal={showCategoryModal}
          setShowCategoryModal={setShowCategoryModal}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onStatsChange={fetchStats}
        />
      </PageCard>
    </div>
  );
}
