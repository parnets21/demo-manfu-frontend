import { useState, useEffect } from 'react';
import { materialReturnApi } from '../../api/materialReturnApi';
import { inventoryApi } from '../../api/inventoryApi';
import docketTrackingApi from '../../api/docketTrackingApi';
import { logisticsApi } from '../../api/logisticsApi';
import { toast } from '../../components/common/Toast';
import {
  MdRefresh, MdClose, MdSearch, MdCalendarToday,
  MdCheckCircle, MdLocalShipping,
  MdInventory, MdWarning, MdDescription,
  MdKeyboardArrowRight, MdMoreVert, MdPhone, MdDirectionsCar
} from 'react-icons/md';

const STATUS_COLORS = {
  'ALL': { bg: '#f1f5f9', text: '#475569', label: 'ALL' },
  'VEHICLE_ASSIGNED': { bg: '#eff6ff', text: '#1d4ed8', label: 'ASSIGNED' },
  'PICKED_UP': { bg: '#fff7ed', text: '#c2410c', label: 'PICKED UP' },
  'IN_TRANSIT': { bg: '#fff7ed', text: '#c2410c', label: 'IN TRANSIT' },
  'ARRIVED_AT_WAREHOUSE': { bg: '#f0fdf4', text: '#16a34a', label: 'ARRIVED' },
  'RECEIVED': { bg: '#f0fdfa', text: '#0d9488', label: 'RECEIVED' },
  'QC_PENDING': { bg: '#faf5ff', text: '#7e22ce', label: 'QC PENDING' }
};

const getStatusStyle = (status) => {
  const s = status?.toUpperCase() || 'ALL';
  return STATUS_COLORS[s] || STATUS_COLORS.ALL;
};

export default function WarehouseReturnReceivePage({ onClose }) {
  const [queue, setQueue] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ARRIVED_AT_WAREHOUSE');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All Warehouses');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  
  // Detail Panel States
  const [receiveData, setReceiveData] = useState({}); // { sku: { received, damaged, missing, extra } }
  
  // Delivery Tracking Integration
  const [dockets, setDockets] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    // Fetch dockets and vehicles first (for enrichment)
    const loadData = async () => {
      await Promise.all([
        fetchDockets(),
        fetchVehicles(),
        fetchWarehouses()
      ]);
      // Then fetch queue after enrichment data is loaded
      fetchQueue();
    };
    loadData();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await inventoryApi.getWarehouses();
      setWarehouses(res.data || []);
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  };

  const fetchDockets = async () => {
    try {
      const res = await docketTrackingApi.getAllDockets({ limit: 500 });
      setDockets(res.data || []);
    } catch (error) {
      // Silently fail - docket enrichment is optional
      console.warn('Docket tracking data not available - continuing without enrichment');
      setDockets([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await logisticsApi.getVehicles();
      setVehicles(res.data || []);
    } catch (error) {
      // Silently fail - vehicle enrichment is optional
      console.warn('Vehicle data not available - continuing without enrichment');
      setVehicles([]);
    }
  };

  const normalizeStage = (rawStage) => {
    if (!rawStage) return '';
    return String(rawStage).trim().replace(/\s+/g, '_').toUpperCase();
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await materialReturnApi.getWarehouseQueue();
      let data = response.data || [];

      // Enrich queue data with docket and vehicle information (if available)
      if (dockets.length > 0 || vehicles.length > 0) {
        data = data.map(item => {
          // Find matching docket by MR ID or Docket ID
          const matchingDocket = dockets.find(d => 
            d.mrId === item.mrId || 
            d.docketId === item.docketId
          );

          if (matchingDocket) {
            // Find matching vehicle by vehicle number
            const matchingVehicle = vehicles.find(v => 
              v.number === matchingDocket.vehicleNumber || 
              v.number === item.vehicleNo
            );

            return {
              ...item,
              // Override with docket data if available
              vehicleNo: matchingDocket.vehicleNumber || item.vehicleNo,
              driverName: matchingDocket.driverName || item.driverName,
              driverMobile: matchingDocket.driverMobile || item.driverMobile,
              docketId: matchingDocket.docketId || item.docketId,
              courierPartner: matchingDocket.courierPartner || item.transport,
              awbNo: matchingDocket.awbLrNumber || item.awbNo,
              priority: matchingDocket.priority || item.priority,
              // Add vehicle details if found
              vehicleType: matchingVehicle?.type,
              vehicleCapacity: matchingVehicle?.capacity,
              vehicleStatus: matchingVehicle?.status,
              currentRoute: matchingVehicle?.currentRoute,
              // Add tracking info
              transportStatus: matchingDocket.transportStatus,
              lastScanLocation: matchingDocket.lastScanLocation,
              estimatedDelivery: matchingDocket.estimatedDelivery,
              // Flag as enriched
              isEnriched: true
            };
          }

          return item;
        });
      }

      setQueue(data);
      // Auto-select first item if exists and nothing selected
      if (data.length > 0 && !selectedReturn) {
        handleSelectReturn(data[0]);
      }
    } catch (error) {
      toast('Failed to load dynamic return queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReturn = (item) => {
    setSelectedReturn(item);
    // Initialize receive data
    const initialData = {};
    // Backend returns single item structure for now, multi-item ready
    const items = Array.isArray(item.items) ? item.items : [{
      sku: item.skuCode,
      name: item.productName,
      expected: item.returnQty,
      batch: item.batchId || 'N/A',
      uom: 'Nos'
    }];
    
    items.forEach(it => {
      initialData[it.sku] = {
        received: it.received || it.expected || 0,
        damaged: 0,
        missing: 0,
        extra: 0
      };
    });
    setReceiveData(initialData);
  };

  const handleUpdateItem = (sku, field, value) => {
    setReceiveData(prev => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const handleConfirmReceive = async () => {
    if (!selectedReturn) return;
    try {
      const sku = selectedReturn.skuCode;
      const data = receiveData[sku] || { received: 0, damaged: 0, missing: 0, extra: 0 };
      
      const payload = {
        receivedQty: data.received || 0,
        damagedQty: data.damaged || 0,
        missingQty: data.missing || 0,
        extraQty: data.extra || 0,
        packagingCondition: 'Good',
        receiverName: 'Warehouse Team',
        remarks: 'Received via Console'
      };

      await materialReturnApi.receiveMaterial(selectedReturn._id, payload);

      // Update docket status to delivered if docket exists
      if (selectedReturn.docketId) {
        try {
          const matchingDocket = dockets.find(d => d.docketId === selectedReturn.docketId);
          if (matchingDocket) {
            await docketTrackingApi.updateDocketStatus(matchingDocket._id, {
              status: 'delivered',
              location: selectedReturn.warehouseName || 'Warehouse',
              remarks: 'Material received at warehouse'
            });
          }
        } catch (err) {
          console.warn('Failed to update docket status:', err);
        }
      }

      // Update vehicle status to Available if vehicle exists
      if (selectedReturn.vehicleNo) {
        try {
          const matchingVehicle = vehicles.find(v => v.number === selectedReturn.vehicleNo);
          if (matchingVehicle && matchingVehicle.status === 'In Transit') {
            await logisticsApi.updateVehicle(matchingVehicle._id, {
              status: 'Available',
              currentDocket: '',
              currentRoute: '',
              currentLoad: ''
            });
          }
        } catch (err) {
          console.warn('Failed to update vehicle status:', err);
        }
      }

      toast('Return received successfully. Workflow moved to QC & Inventory synced.', 'success');
      fetchQueue();
      fetchDockets();
      fetchVehicles();
    } catch (error) {
      toast(error.message || 'Receive failed', 'error');
    }
  };

  const filteredQueue = queue.filter(item => {
    const itemStage = normalizeStage(item.currentStage || item.stage || item.status);
    const matchesSearch = 
      item.mrId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.docketId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === 'ALL' || itemStage === activeFilter;
    const matchesWarehouse = selectedWarehouse === 'All Warehouses' || item.warehouseName === selectedWarehouse;
    
    const itemDate = new Date(item.createdAt || item.updatedAt).toISOString().split('T')[0];
    const matchesDate = (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);

    return matchesSearch && matchesFilter && matchesWarehouse && matchesDate;
  });

  const stats = {
    total: queue.length,
    inTransit: queue.filter(q => {
      const stage = normalizeStage(q.currentStage || q.stage || q.status);
      return stage === 'IN_TRANSIT' || stage === 'PICKED_UP';
    }).length,
    arrived: queue.filter(q => normalizeStage(q.currentStage || q.stage || q.status) === 'ARRIVED_AT_WAREHOUSE').length,
    received: queue.filter(q => normalizeStage(q.currentStage || q.stage || q.status) === 'RECEIVED').length,
    qcPending: queue.filter(q => normalizeStage(q.currentStage || q.stage || q.status) === 'QC_PENDING').length
  };

  const totals = selectedReturn ? Object.values(receiveData).reduce((acc, curr) => ({
    expected: acc.expected + (selectedReturn.returnQty || 0),
    received: acc.received + curr.received,
    damaged: acc.damaged + curr.damaged,
    missing: acc.missing + curr.missing,
    extra: acc.extra + curr.extra
  }), { expected: 0, received: 0, damaged: 0, missing: 0, extra: 0 }) : { expected: 0, received: 0, damaged: 0, missing: 0, extra: 0 };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#f8fafc', zIndex: 100, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>RETURN RECEIVE </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}></div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Warehouse Receive</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { fetchQueue(); fetchDockets(); fetchVehicles(); }} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Refresh all data including docket & vehicle tracking">
            <MdRefresh size={20} color="#64748b" className={loading ? 'animate-spin' : ''} />
          </button>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="https://ui-avatars.com/api/?name=Warehouse+Admin&background=0f172a&color=fff" style={{ width: 24, height: 24, borderRadius: 6 }} alt="user" />
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#0f172a', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <MdClose size={20} />
          </button>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ─────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 340 }}>
          <MdSearch size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Search MR ID, Docket, Invoice or Supplier..." 
            style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MdCalendarToday size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: '#475569' }}
          />
          <span style={{ color: '#94a3b8' }}>-</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: '#475569' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}>
          <select 
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#475569', background: 'transparent' }}
          >
            <option>All Warehouses</option>
            {warehouses.map(w => (
              <option key={w._id} value={w.name}>{w.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }}></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px', background: '#f1f5f9', borderRadius: 10 }}>
          {['ALL', 'IN_TRANSIT', 'ARRIVED_AT_WAREHOUSE', 'RECEIVED', 'QC_PENDING'].map(f => (
            <button 
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{ 
                padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, 
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeFilter === f ? '#fff' : 'transparent',
                color: activeFilter === f ? '#0f172a' : '#64748b',
                boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {f === 'ARRIVED_AT_WAREHOUSE' ? 'ARRIVED' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Returns', val: stats.total, icon: <MdInventory size={20} />, color: '#3b82f6' },
          { label: 'In Transit', val: stats.inTransit, icon: <MdLocalShipping size={20} />, color: '#f97316' },
          { label: 'Arrived', val: stats.arrived, icon: <MdCheckCircle size={20} />, color: '#22c55e' },
          { label: 'Received', val: stats.received, icon: <MdCheckCircle size={20} />, color: '#0d9488' },
          { label: 'QC Pending', val: stats.qcPending, icon: <MdWarning size={20} />, color: '#8b5cf6' },
        ].map((k, i) => (
          <div key={i} style={{ padding: '16px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: k.color + '10', color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{k.val}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN TABLE ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 24px 20px', overflow: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: 40, padding: '12px 16px' }}></th>
                {['Return ID', 'Docket ID', 'Invoice No.', 'Supplier / Customer', 'Vehicle No.', 'Driver', 'Arrival Time', 'Expected Qty', 'Received Qty', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records found in current queue</td></tr>
              ) : filteredQueue.map((item) => {
                const isSelected = selectedReturn?._id === item._id;
                const status = getStatusStyle(normalizeStage(item.currentStage || item.stage || item.status));
                return (
                  <tr 
                    key={item._id} 
                    onClick={() => handleSelectReturn(item)}
                    style={{ borderBottom: '1px solid #f1f5f9', background: isSelected ? '#f8fafc' : '#fff', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <MdKeyboardArrowRight size={20} color={isSelected ? '#3b82f6' : '#94a3b8'} style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#3b82f6' }}>{item.mrId}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{item.docketId}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{item.invoiceNo}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{item.supplierName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.vehicleNo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MdDirectionsCar size={16} color={item.isEnriched ? '#22c55e' : '#94a3b8'} />
                          <span style={{ fontWeight: 600, color: item.isEnriched ? '#0f172a' : '#475569' }}>
                            {item.vehicleNo}
                          </span>
                          {item.vehicleType && (
                            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                              ({item.vehicleType})
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.driverName ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 600, color: item.isEnriched ? '#0f172a' : '#475569' }}>
                            {item.driverName}
                          </span>
                          {item.driverMobile && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MdPhone size={12} color={item.isEnriched ? '#22c55e' : '#94a3b8'} />
                              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                {item.driverMobile}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {item.receiveDate ? new Date(item.receiveDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{item.returnQty}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#94a3b8' }}>{item.receivedQty || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: status.bg, color: status.text, border: `1px solid ${status.text}20` }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button 
                          style={{ 
                            padding: '6px 14px', borderRadius: 8, border: '1.5px solid #3b82f6', background: '#fff', 
                            color: '#3b82f6', fontSize: 11, fontWeight: 800, cursor: 'pointer'
                          }}
                        >
                          {normalizeStage(item.currentStage || item.stage || item.status) === 'RECEIVED' ? 'View' : 'Receive'}
                        </button>
                        <MdMoreVert size={20} color="#94a3b8" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL PANEL ─────────────────────────────────────────────────── */}
      {selectedReturn && (
        <div style={{ background: '#fff', borderTop: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '42%' }}>
          {/* Detail Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>RETURN DETAILS</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>{selectedReturn.mrId}</span>
              <span style={{ padding: '4px 10px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 800 }}>{getStatusStyle(selectedReturn.currentStage).label}</span>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              {[
                { label: 'Docket ID', val: selectedReturn.docketId, icon: <MdDescription size={14} /> },
                { label: 'Invoice No.', val: selectedReturn.invoiceNo },
                { label: 'Supplier / Customer', val: selectedReturn.supplierName },
                { 
                  label: 'Vehicle No.', 
                  val: selectedReturn.vehicleNo,
                  extra: selectedReturn.vehicleType ? `(${selectedReturn.vehicleType})` : null,
                  icon: <MdDirectionsCar size={14} />,
                  enriched: selectedReturn.isEnriched
                },
                { 
                  label: 'Driver', 
                  val: selectedReturn.driverName,
                  extra: selectedReturn.driverMobile ? `📞 ${selectedReturn.driverMobile}` : null,
                  enriched: selectedReturn.isEnriched
                },
                { label: 'Arrival Time', val: selectedReturn.receiveDate ? new Date(selectedReturn.receiveDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
              ].map((h, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {h.icon}
                    {h.label}
                    {h.enriched && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} title="Auto-synced from Docket Tracking"></span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: h.enriched ? '#0f172a' : '#475569', marginTop: 2 }}>
                    {h.val || '—'}
                    {h.extra && (
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{h.extra}</div>
                    )}
                  </div>
                </div>
              ))}
              <MdClose size={20} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSelectedReturn(null)} />
            </div>
          </div>

          {/* Items Table */}
          <div style={{ flex: 1, padding: '12px 24px', overflow: 'auto' }}>
            <h3 style={{ fontSize: 11, fontWeight: 800, color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase' }}>Items to Receive</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['SKU', 'Item Name', 'Batch No.', 'Expected Qty', 'Received Qty', 'Damaged Qty', 'Missing Qty', 'Extra Qty', 'UOM', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{selectedReturn.skuCode}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>{selectedReturn.productName}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{selectedReturn.batchId || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{selectedReturn.returnQty}</td>
                  <td style={{ padding: '8px 16px' }}>
                    <input 
                      type="number" 
                      style={{ width: 80, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 }}
                      value={receiveData[selectedReturn.skuCode]?.received || 0}
                      onChange={(e) => handleUpdateItem(selectedReturn.skuCode, 'received', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input 
                      type="number" 
                      placeholder="—"
                      style={{ width: 80, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}
                      value={receiveData[selectedReturn.skuCode]?.damaged || 0}
                      onChange={(e) => handleUpdateItem(selectedReturn.skuCode, 'damaged', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input 
                      type="number" 
                      placeholder="—"
                      style={{ width: 80, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}
                      value={receiveData[selectedReturn.skuCode]?.missing || 0}
                      onChange={(e) => handleUpdateItem(selectedReturn.skuCode, 'missing', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input 
                      type="number" 
                      placeholder="—"
                      style={{ width: 80, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}
                      value={receiveData[selectedReturn.skuCode]?.extra || 0}
                      onChange={(e) => handleUpdateItem(selectedReturn.skuCode, 'extra', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>Nos</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', fontSize: 11, fontWeight: 800, color: '#3b82f6', cursor: 'pointer' }}>Scan / Receive</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Expected Total', val: totals.expected, color: '#475569' },
                { label: 'Received Total', val: totals.received, color: '#10b981' },
                { label: 'Damaged Total', val: totals.damaged, color: '#f59e0b' },
                { label: 'Missing Total', val: totals.missing, color: '#ef4444' },
                { label: 'Extra Total', val: totals.extra, color: '#3b82f6' },
              ].map((t, i) => (
                <div key={i} style={{ padding: '8px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', minWidth: 120 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{t.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: t.color, marginTop: 2 }}>{t.val} Nos</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                View Documents
              </button>
              <button style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #ef444430', background: '#fff', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Loss Details
              </button>
              <button 
                onClick={handleConfirmReceive}
                style={{ padding: '10px 32px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.2)' }}
              >
                Confirm Receive
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; borderRadius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
