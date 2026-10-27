import { useState, useEffect } from 'react';
import InventoryPage from './InventoryPage';
import StockItemsPage from './StockItemsPage';
import ProductionManagementPage from './ProductionManagementPage';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import { inventoryApi } from '../../api/inventoryApi';
import { itemMasterApi } from '../../api/itemMasterApi';
import { productionApi } from '../../api/productionApi';
import {
  MdInventory2, MdWarehouse, MdSwapHoriz, MdCheckBox,
  MdInventory, MdBatchPrediction, MdHourglassEmpty,
  MdBrokenImage, MdLocationOn, MdPinDrop, MdAdd,
  MdPrecisionManufacturing,
} from 'react-icons/md';

const TAB_MAP = {
  dashboard:    0,
  stock:        1,
  warehouses:   2,
  movement:     3,
  picking:      4,
  packing:      5,
  batch:        6,
  ageing:       7,
  defective:    8,
  storage:      9,
  pincode:      10,
  returns:      11,
  'stock-items': 12,
  'production-manage': 13,
};

const PAGE_META = {
  dashboard:  {
    title: 'Stock Dashboard',
    breadcrumb: 'Inventory › Dashboard',
    actionLabel: '+ Add Stock',
    kpis: [
      { label: 'Total Stock Units', value: '—', icon: <MdInventory2 size={18} />,     color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
      { label: 'Low Stock Items',   value: '—', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
      { label: 'Dead Stock',        value: '—', icon: <MdBrokenImage size={18} />,    color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)' },
      { label: 'Active SKU',       value: '—', icon: <MdCheckBox size={18} />,       color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    ],
  },
  stock: {
    title: 'Stock Table',
    breadcrumb: 'Inventory › Stock',
    actionLabel: '+ Add Stock',
    kpis: [
      { label: 'Total SKU',     value: '—', icon: <MdInventory2 size={18} />,     color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
      { label: 'Critical Items', value: '—', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
      { label: 'Warehouses',     value: '—', icon: <MdWarehouse size={18} />,      color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'  },
      { label: 'Total Units',    value: '—', icon: <MdInventory size={18} />,      color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    ],
  },
  warehouses: {
    title: 'Multi-Warehouse Management',
    breadcrumb: 'Inventory › Warehouses',
    actionLabel: '+ Add Warehouse',
    kpis: [
      { label: 'Total Warehouses', value: '—', icon: <MdWarehouse size={18} />,   color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
      { label: 'Total Capacity',   value: '—', icon: <MdInventory2 size={18} />,  color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'  },
      { label: 'Used Capacity',    value: '—', icon: <MdInventory size={18} />,   color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
      { label: 'Avg Utilization',  value: '—', icon: <MdCheckBox size={18} />,    color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    ],
  },
  movement: {
    title: 'Stock Movement',
    breadcrumb: 'Inventory › Movement',
    actionLabel: '+ Record Movement',
    kpis: [
      { label: 'Inward Today',    value: '2', icon: <MdSwapHoriz size={18} />, color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
      { label: 'Outward Today',   value: '1', icon: <MdSwapHoriz size={18} />, color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
      { label: 'Transfers',       value: '1', icon: <MdSwapHoriz size={18} />, color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Total Movements', value: '4', icon: <MdInventory2 size={18} />,color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
    ],
  },
  picking: {
    title: 'Picking Workflow',
    breadcrumb: 'Inventory › Picking',
    actionLabel: '+ New Pick List',
    kpis: [
      { label: 'Pending Picks',    value: '1', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'In Progress',      value: '1', icon: <MdInventory2 size={18} />,     color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Completed Today',  value: '1', icon: <MdCheckBox size={18} />,       color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
      { label: 'Total Pick Lists', value: '3', icon: <MdInventory size={18} />,      color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
    ],
  },
  packing: {
    title: 'Sorting & Packing',
    breadcrumb: 'Inventory › Packing',
    actionLabel: '+ New Sort Job',
    kpis: [
      { label: 'Pending Packing', value: '1', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'In Progress',     value: '1', icon: <MdInventory2 size={18} />,     color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Packed Today',    value: '1', icon: <MdCheckBox size={18} />,       color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
      { label: 'Sorting Queue',   value: '3', icon: <MdInventory size={18} />,      color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
    ],
  },
  batch: {
    title: 'Batch Tracking',
    breadcrumb: 'Inventory › Batch',
    actionLabel: '+ Add Batch',
    kpis: [
      { label: 'Active Batches',  value: '2', icon: <MdBatchPrediction size={18} />, color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
      { label: 'Critical Expiry', value: '1', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'Dead Batches',    value: '1', icon: <MdBrokenImage size={18} />,    color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)'  },
      { label: 'Total Batches',   value: '4', icon: <MdInventory2 size={18} />,     color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
    ],
  },
  ageing: {
    title: 'Ageing Stock Analysis',
    breadcrumb: 'Inventory › Ageing',
   
    kpis: [
      { label: '0–30 Days',  value: '2', icon: <MdInventory2 size={18} />,     color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
      { label: '31–60 Days', value: '1', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: '61–90 Days', value: '1', icon: <MdInventory size={18} />,      color: '#f97316', color2: '#fb923c', glow: 'rgba(249,115,22,0.25)'  },
      { label: '90+ Days',   value: '2', icon: <MdBrokenImage size={18} />,    color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
    ],
  },
  defective: {
    title: 'Defective Stock',
    breadcrumb: 'Inventory › Defective',
    actionLabel: '+ Log Defect',
    kpis: [
      { label: 'Total Defective', value: '10', icon: <MdBrokenImage size={18} />,    color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
      { label: 'QC Hold',         value: '3',  icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'In Repair',       value: '2',  icon: <MdInventory2 size={18} />,     color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Disposed',        value: '5',  icon: <MdCheckBox size={18} />,       color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)'  },
    ],
  },
  storage: {
    title: 'Storage Location Mapping',
    breadcrumb: 'Inventory › Storage Locations',
    actionLabel: '+ Add Location',
    kpis: [
      { label: 'Total Zones',  value: '3', icon: <MdLocationOn size={18} />,  color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
      { label: 'Total Racks',  value: '4', icon: <MdWarehouse size={18} />,   color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Total Shelves',value: '5', icon: <MdInventory2 size={18} />,  color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'Total Bins',   value: '9', icon: <MdInventory size={18} />,   color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
    ],
  },
  pincode: {
    title: 'Pincode & Godown Stock',
    breadcrumb: 'Inventory › Pincode View',
    kpis: [
      { label: 'Pincodes Mapped', value: '—',   icon: <MdPinDrop size={18} />,    color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
      { label: 'Total Godowns',   value: '—',   icon: <MdWarehouse size={18} />,  color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Total SKU',      value: '—',   icon: <MdInventory2 size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'Total Units',     value: '—', icon: <MdInventory size={18} />,  color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
    ],
  },
  returns: {
    title: 'Warehouse Returns',
    breadcrumb: 'Inventory › Returns',
    kpis: [
      { label: 'Pending Returns', value: '—', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)'  },
      { label: 'In Queue',        value: '—', icon: <MdWarehouse size={18} />,      color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)'   },
      { label: 'Received Today',  value: '—', icon: <MdCheckBox size={18} />,       color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)'  },
      { label: 'Total Returns',   value: '—', icon: <MdInventory2 size={18} />,     color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)'  },
    ],
  },
  'stock-items': {
    title: 'Stock Items (Item Master)',
    breadcrumb: 'Inventory › Stock Items',
    actionLabel: '+ Add Item',
    kpis: [
      { label: 'Total Items',    value: '—', icon: <MdInventory2 size={18} />,     color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
      { label: 'Active Items',   value: '—', icon: <MdCheckBox size={18} />,       color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
      { label: 'Inactive Items', value: '—', icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
      { label: 'Low Stock',      value: '—', icon: <MdBrokenImage size={18} />,    color: '#64748b', color2: '#94a3b8', glow: 'rgba(100,116,139,0.2)' },
    ],
  },
  'production-manage': {
    title: 'Production Management',
    breadcrumb: 'Inventory › Production Management',
    actionLabel: '+ Add Production',
    kpis: [
      { label: 'Total Productions', value: '—', icon: <MdPrecisionManufacturing size={18} />, color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
      { label: 'Today Productions', value: '—', icon: <MdCheckBox size={18} />,       color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
      { label: 'Avg Efficiency',    value: '—', icon: <MdInventory2 size={18} />,    color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)' },
      { label: 'Damage Rate',       value: '—', icon: <MdBrokenImage size={18} />,   color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
    ],
  },
};

export default function InventorySubPage({ tab }) {
  const tabIndex = TAB_MAP[tab] ?? 0;
  const meta = PAGE_META[tab] || PAGE_META.dashboard;
  const [showModal, setShowModal] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [liveKpis, setLiveKpis] = useState(meta.kpis);

  // Load live KPI data from the API
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (tab === 'warehouses' || tab === 'stock' || tab === 'dashboard') {
          const [whRes, statsRes] = await Promise.all([
            inventoryApi.getWarehouses(),
            inventoryApi.getStats(),
          ]);
          if (cancelled) return;

          const warehouses = whRes.data || [];
          const stats = statsRes.data || {};
          const totalCapacity = warehouses.reduce((s, w) => s + (w.capacity || 0), 0);
          const usedCapacity  = warehouses.reduce((s, w) => s + (w.used || 0), 0);
          const avgUtil = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

          if (tab === 'warehouses') {
            setLiveKpis([
              { ...meta.kpis[0], value: String(warehouses.length) },
              { ...meta.kpis[1], value: totalCapacity.toLocaleString() },
              { ...meta.kpis[2], value: usedCapacity.toLocaleString() },
              { ...meta.kpis[3], value: `${avgUtil}%` },
            ]);
          } else if (tab === 'stock') {
            setLiveKpis([
              { ...meta.kpis[0], value: String(stats.total || 0) },
              { ...meta.kpis[1], value: String(stats.critical || 0) },
              { ...meta.kpis[2], value: String(warehouses.length) },
              { ...meta.kpis[3], value: String(stats.totalQty || 0) },
            ]);
          } else if (tab === 'dashboard') {
            setLiveKpis([
              { ...meta.kpis[0], value: String(stats.totalQty || 0) },
              { ...meta.kpis[1], value: String(stats.total - stats.active || 0) },
              { ...meta.kpis[2], value: String(stats.dead || 0) },
              { ...meta.kpis[3], value: String(stats.active || 0) },
            ]);
          }
        } else if (tab === 'movement') {
          const movRes = await inventoryApi.getMovements();
          if (cancelled) return;
          const movs = movRes.data || [];
          const today = new Date().toDateString();
          const todayMovs = movs.filter(m => new Date(m.createdAt).toDateString() === today);
          setLiveKpis([
            { ...meta.kpis[0], value: String(todayMovs.filter(m => m.type === 'Inward').length) },
            { ...meta.kpis[1], value: String(todayMovs.filter(m => m.type === 'Outward').length) },
            { ...meta.kpis[2], value: String(movs.filter(m => m.type === 'Transfer').length) },
            { ...meta.kpis[3], value: String(movs.length) },
          ]);
        } else if (tab === 'pincode') {
          const pinRes = await getPincodeStock();
          if (cancelled) return;
          const data = pinRes.data || [];
          
          let totalGodowns = 0;
          let totalSKUs = 0;
          let totalUnits = 0;
          
          data.forEach(p => {
            totalGodowns += (p.godowns?.length || 0);
            p.godowns?.forEach(g => {
              totalSKUs += (g.locations?.length || 0);
              totalUnits += g.locations?.reduce((sum, loc) => sum + (loc.availableQty || 0), 0);
            });
          });

          setLiveKpis([
            { ...meta.kpis[0], value: String(data.length) },
            { ...meta.kpis[1], value: String(totalGodowns) },
            { ...meta.kpis[2], value: String(totalSKUs) },
            { ...meta.kpis[3], value: totalUnits.toLocaleString() },
          ]);
        } else if (tab === 'stock-items') {
          const statsRes = await itemMasterApi.getStats();
          if (cancelled) return;
          const s = statsRes.data || {};
          setLiveKpis([
            { ...meta.kpis[0], value: String(s.total || 0) },
            { ...meta.kpis[1], value: String(s.active || 0) },
            { ...meta.kpis[2], value: String((s.total || 0) - (s.active || 0)) },
            { ...meta.kpis[3], value: String(s.lowStock || s.critical || 0) },
          ]);
        } else if (tab === 'production-manage') {
          const dashRes = await productionApi.getDashboard();
          if (cancelled) return;
          const d = dashRes.data || {};
          const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          const todayMonth = todayStr.slice(0, 7); // YYYY-MM
          const monthRes = await productionApi.getMonthlyReport(todayMonth).catch(() => ({ data: {} }));
          if (cancelled) return;
          const todayCount = monthRes.data?.totalEntries || 0;
          setLiveKpis([
            { ...meta.kpis[0], value: String(d.totalProductions || 0) },
            { ...meta.kpis[1], value: String(todayCount) },
            { ...meta.kpis[2], value: `${(d.avgEfficiency || 0).toFixed(1)}%` },
            { ...meta.kpis[3], value: `${(d.avgDamageRate || 0).toFixed(1)}%` },
          ]);
        }
      } catch {
        // silently keep showing '—' on error
      }
    };

    load();
    return () => { cancelled = true; };
  }, [tab]); // eslint-disable-line

  const ActionBtn = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {meta.actionLabel && (
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}
        >
          <MdAdd size={16} />
          {meta.actionLabel.replace(/^\+\s*/, '')}
        </button>
      )}
      {tab === 'warehouses' && (
        <button
          onClick={() => setShowReturns(true)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 10,
            background: '#dc2626', 
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(220,38,38,0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <MdSwapHoriz size={18} />
          Receive Returns
        </button>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader title={meta.title} breadcrumb={meta.breadcrumb} action={ActionBtn} />
      <KpiStrip kpis={liveKpis} />
      {tab === 'stock-items' ? (
        <PageCard>
          <StockItemsPage externalShowModal={showModal} onExternalModalClose={() => setShowModal(false)} hideAddButton={true} />
        </PageCard>
      ) : tab === 'production-manage' ? (
        <PageCard>
          <ProductionManagementPage externalShowModal={showModal} onExternalModalClose={() => setShowModal(false)} />
        </PageCard>
      ) : (
        <InventoryPage key={tabIndex} initialTab={tabIndex} externalShowModal={showModal} onExternalModalClose={() => setShowModal(false)} />
      )}
    </div>
  );
}