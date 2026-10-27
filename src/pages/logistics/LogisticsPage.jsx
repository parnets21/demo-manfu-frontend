import { useState, useEffect, useCallback } from 'react';
import {
  MdSearch,
  MdLocalShipping,
  MdCheckCircle,
  MdPhone,
  MdDescription,
  MdPlace,
  MdInventory
} from 'react-icons/md';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { logisticsApi } from '../../api/logisticsApi';
import { poApi } from '../../api/poApi';
import { materialReturnApi } from '../../api/materialReturnApi';
import docketTrackingApi from '../../api/docketTrackingApi';
import DataTable from '../../components/tables/DataTable';
import DocketTrackingPage from './DocketTrackingPage';
import { dataEvents } from '../../utils/dataEvents';

// ── Style constants ───────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]';
const primaryBtn = {
  display:'inline-flex', alignItems:'center', gap:6,
  padding:'8px 16px', borderRadius:10,
  background:'linear-gradient(135deg,#3b82f6,#1e40af)',
  color:'#fff', border:'none', cursor:'pointer',
  fontSize:13, fontWeight:600, fontFamily:'inherit',
  boxShadow:'0 3px 10px rgba(185,28,28,0.3)',
};

// ── Empty form templates ──────────────────────────────────────────────────────
const EMPTY_DISPATCH = {
  orderRef:'', customer:'', vehicleNo:'', driver:'',
  origin:'', destination:'', items:0, weight:'',
  value:0, dispatchDate:'', expectedDelivery:'', instructions:'',
};
const EMPTY_VEHICLE = { type:'Truck', name:'', number:'', driver:'', driverMobile: '', capacity:'', status:'Available' };
const EMPTY_SHIPMENT = { courier:'', awbNo:'', orderRef:'', customer:'', destination:'', eta:'' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtCur = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
      <div className="text-2xl font-black tracking-tight" style={{ color }}>{value ?? '—'}</div>
      <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
    </div>
  );
}

// ── Tab 0: Dispatch Dashboard ─────────────────────────────────────────────────
function DispatchTab({ vehicles }) {
  const [dispatches, setDispatches] = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_DISPATCH);
  const [saving, setSaving]         = useState(false);
  const [poList, setPoList]         = useState([]);
  const [posLoading, setPosLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        logisticsApi.getDispatches(),
        logisticsApi.getStats(),
      ]);
      setDispatches(dRes.data || []);
      setStats(sRes.data || null);
    } catch { toast('Failed to load dispatches', 'error'); }
    finally { setLoading(false); }
  }, []);

  // Load approved POs when modal opens
  const loadPOs = useCallback(async () => {
    setPosLoading(true);
    try {
      const r = await poApi.getAll({ status: 'Approved' });
      setPoList(r.data || []);
    } catch { toast('Failed to load purchase orders', 'error'); }
    finally { setPosLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = () => { setForm(EMPTY_DISPATCH); setShowModal(true); loadPOs(); };

  // When a PO is selected, auto-fill customer (vendor name) + destination + value
  const handlePOSelect = (poId) => {
    const po = poList.find(p => p.poId === poId);
    if (!po) { setForm(f => ({ ...f, orderRef: poId })); return; }
    setForm(f => ({
      ...f,
      orderRef:    po.poId,
      customer:    po.vendor?.name || po.vendor || '',
      destination: po.shippingAddress || '',
      value:       po.grandTotal || 0,
    }));
  };

  const handleCreate = async () => {
    if (!form.orderRef || !form.customer || !form.destination) {
      toast('Order Ref, Customer and Destination are required', 'error'); return;
    }
    setSaving(true);
    try {
      await logisticsApi.createDispatch(form);
      toast('Dispatch created successfully');
      setShowModal(false);
      setForm(EMPTY_DISPATCH);
      dataEvents.emit('logistics:changed');
      load();
    } catch (e) { toast(e.message || 'Failed to create dispatch', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dispatch?')) return;
    try {
      await logisticsApi.deleteDispatch(id);
      toast('Dispatch deleted');
      dataEvents.emit('logistics:changed');
      load();
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await logisticsApi.updateDispatchStatus(id, { status });
      toast(`Status updated to ${status}`);
      dataEvents.emit('logistics:changed');
      load();
    } catch { toast('Failed to update status', 'error'); }
  };

  const availableVehicles = vehicles.filter(v => v.status === 'Available');

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button style={primaryBtn} onClick={openModal}>+ New Dispatch</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Ready to Dispatch"  value={dispatches.filter(d => d.status === 'Pending').length}                              color="#f59e0b" />
        <KpiCard label="In Transit"         value={stats?.inTransit ?? dispatches.filter(d => d.status === 'In Transit').length}       color="#3b82f6" />
        <KpiCard label="Delivered Today"    value={stats?.delivered ?? 0}                                                              color="#10b981" />
        <KpiCard label="Available Vehicles" value={stats?.availableVehicles ?? availableVehicles.length}                               color="#8b5cf6" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="text-sm font-bold text-gray-800 mb-3.5">All Dispatches</div>
        {loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'dispatchId',       label: 'Dispatch ID',   render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'orderRef',         label: 'PO Ref' },
              { key: 'customer',         label: 'Customer',      render: v => <span className="font-semibold">{v}</span> },
              { key: 'destination',      label: 'Destination' },
              { key: 'driver',           label: 'Driver' },
              { key: 'dispatchDate',     label: 'Dispatch Date', render: v => fmt(v) },
              { key: 'expectedDelivery', label: 'Expected',      render: v => fmt(v) },
              { key: 'status',           label: 'Status',        render: v => <StatusBadge status={v} /> },
              { key: '_id', label: 'Actions', render: (id, row) => (
                <div className="flex gap-1.5 flex-wrap">
                  {row.status !== 'Delivered' && row.status !== 'Cancelled' && (
                    <select
                      value={row.status}
                      onChange={e => handleStatusUpdate(id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white font-[inherit] cursor-pointer"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Dispatched">Dispatched</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  )}
                  <button onClick={() => handleDelete(id)} className="px-2 py-1 text-[11px] rounded-lg bg-red-50 text-red-600 border border-red-200 cursor-pointer font-[inherit]">Delete</button>
                </div>
              )},
            ]}
            data={dispatches}
          />
        )}
      </div>

      {/* Create Dispatch Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_DISPATCH); }}
        title="Create New Dispatch"
        size="lg"
        footer={
          <>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]"
              onClick={() => { setShowModal(false); setForm(EMPTY_DISPATCH); }}>Cancel</button>
            <button style={primaryBtn} onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Dispatch'}</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">

          {/* PO Reference dropdown — auto-fills customer, destination, value */}
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-gray-600">Purchase Order Reference *</label>
            {posLoading ? (
              <div className="text-xs text-gray-400 py-2">Loading purchase orders…</div>
            ) : (
              <select className={inp} value={form.orderRef} onChange={e => handlePOSelect(e.target.value)}>
                <option value="">— Select Approved PO —</option>
                {poList.map(po => (
                  <option key={po._id} value={po.poId}>
                    {po.poId} — {po.vendor?.name || 'Vendor'} — {fmtCur(po.grandTotal)}
                  </option>
                ))}
                {poList.length === 0 && <option disabled>No approved POs found</option>}
              </select>
            )}
            {form.orderRef && (
              <div className="text-[11px] text-green-600 font-semibold mt-0.5">✓ PO {form.orderRef} selected</div>
            )}
          </div>

          {/* Auto-filled but editable fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Customer / Vendor *</label>
            <input className={inp} placeholder="Auto-filled from PO" value={form.customer}
              onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Destination *</label>
            <input className={inp} placeholder="Auto-filled from PO shipping address" value={form.destination}
              onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Value (₹)</label>
            <input type="number" className={inp} placeholder="Auto-filled from PO" value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Origin</label>
            <input className={inp} placeholder="Warehouse / Plant" value={form.origin}
              onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
          </div>

          {/* Vehicle dropdown — only available vehicles */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Vehicle</label>
            <select className={inp} value={form.vehicleNo} onChange={e => {
              const v = vehicles.find(x => x.number === e.target.value);
              setForm(f => ({ ...f, vehicleNo: e.target.value, driver: v?.driver || f.driver }));
            }}>
              <option value="">— Select Vehicle —</option>
              {availableVehicles.map(v => (
                <option key={v._id} value={v.number}>{v.number} — {v.type} ({v.capacity})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Driver</label>
            <input className={inp} placeholder="Auto-filled from vehicle" value={form.driver}
              onChange={e => setForm(f => ({ ...f, driver: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Total Weight (kg)</label>
            <input className={inp} placeholder="0" value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Dispatch Date</label>
            <input type="date" className={inp} value={form.dispatchDate}
              onChange={e => setForm(f => ({ ...f, dispatchDate: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Expected Delivery</label>
            <input type="date" className={inp} value={form.expectedDelivery}
              onChange={e => setForm(f => ({ ...f, expectedDelivery: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-xs font-semibold text-gray-600">Delivery Instructions</label>
          <textarea className={inp} rows={3} placeholder="Special handling notes…" value={form.instructions}
            onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
}

// ── Tab 1: Vehicle Allocation ─────────────────────────────────────────────────
function VehiclesTab({ vehicles, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_VEHICLE);
  const [saving, setSaving]       = useState(false);
  
  // Fleet Search
  const [fleetSearch, setFleetSearch] = useState('');
  
  // Return Flow States
  const [returnQueue, setReturnQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(null); // { returnItem, vehicle }
  
  // Dynamic Data from Dockets
  const [docketData, setDocketData] = useState([]);
  const [searchTerms, setSearchTerms] = useState({ number: '', driver: '', driverMobile: '', capacity: '' });

  const loadReturnQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      // Fetch from both DocketTracking collection AND MaterialReturn records
      const [dRes, mrRes] = await Promise.allSettled([
        docketTrackingApi.getAllDockets(),
        materialReturnApi.getAll(),
      ]);

      const allDockets = dRes.status === 'fulfilled' ? (dRes.value?.data || []) : [];
      const allReturns = mrRes.status === 'fulfilled' ? (mrRes.value?.data || []) : [];

      // From DocketTracking: filter pickup_pending
      const pendingDockets = allDockets.filter(d => d.transportStatus === 'pickup_pending');

      // From MaterialReturn: filter records in transport stages that need vehicle assignment
      const TRANSPORT_STAGES = new Set(['APPROVED', 'DOCKET_CREATED', 'VEHICLE_ASSIGNED', 'PICKUP_PENDING']);
      const pendingReturns = allReturns.filter(r => {
        const stage = (r.currentStage || r.stage || '').toUpperCase().replace(/[\s-]/g, '_');
        return TRANSPORT_STAGES.has(stage) && !r.vehicleNo && !r.vehicle;
      });

      // Map docket tracking records
      const fromDockets = pendingDockets.map(docket => ({
        _id: docket._id,
        mrId: docket.mrId || 'N/A',
        docketId: docket.docketId || 'N/A',
        supplierName: docket.supplier || 'Unknown Supplier',
        customerName: docket.supplier || 'Unknown Supplier',
        returnQty: docket.qty || 0,
        pickupAddress: docket.sourceLocation || docket.pickupLocation || 'Location not specified',
        priority: docket.priority || 'Medium',
        vehicleNo: docket.vehicleNumber || '',
        vehicleName: docket.vehicleName || '',
        driverName: docket.driverName || '',
        driverMobile: docket.driverMobile || '',
        returnType: docket.returnType || 'Material Return',
        courierPartner: docket.courierPartner || '',
        productName: docket.productName || 'Product',
        destWarehouse: docket.destWarehouse || 'Warehouse',
        _source: 'docket',
      }));

      // Map material return records (avoid duplicates already in dockets)
      const existingMrIds = new Set(fromDockets.map(d => d.mrId));
      const fromReturns = pendingReturns
        .filter(r => !existingMrIds.has(r.mrId))
        .map(r => ({
          _id: r._id,
          mrId: r.mrId || 'N/A',
          docketId: r.docketId || `DKT-${r.mrId}`,
          supplierName: r.supplierName || r.customerName || 'Unknown Supplier',
          customerName: r.supplierName || r.customerName || 'Unknown Supplier',
          returnQty: r.returnQty || r.expectedQty || 0,
          pickupAddress: r.pickupAddress || r.address || 'Location not specified',
          priority: r.priority || 'Medium',
          vehicleNo: r.vehicleNo || '',
          vehicleName: '',
          driverName: r.driverName || '',
          driverMobile: r.driverMobile || '',
          returnType: r.returnType || 'Material Return',
          courierPartner: r.transport || '',
          productName: r.productName || 'Product',
          destWarehouse: r.warehouseName || 'Warehouse',
          _source: 'return',
        }));

      const pendingPickups = [...fromDockets, ...fromReturns];
      setReturnQueue(pendingPickups);
      setDocketData(allDockets);
    } catch (error) {
      console.error('Failed to load queue or docket data:', error);
      toast('Failed to load return pickup queue', 'error');
      setReturnQueue([]);
      setDocketData([]);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturnQueue();
  }, [loadReturnQueue, vehicles]);

  // Extract unique dynamic values from docketData
  const dynamicVehicles = [...new Set(docketData.map(d => d.vehicleNumber || d.vehicleNo).filter(Boolean))];
  const dynamicDrivers = [...new Set(docketData.map(d => d.driverName).filter(Boolean))];
  const dynamicMobiles = [...new Set(docketData.map(d => d.driverMobile).filter(Boolean))];
  const dynamicCapacities = [...new Set(docketData.map(d => d.priority ? `${d.priority} Priority` : d.capacity || d.shipmentWeight).filter(Boolean))];

  const handleDynamicSelect = (field, value) => {
    // Find a matching docket record based on the selected value in any field
    const match = docketData.find(d => {
      if (field === 'number') return d.vehicleNo === value;
      if (field === 'driver') return d.driverName === value;
      if (field === 'driverMobile') return d.driverMobile === value;
      if (field === 'capacity') return (d.capacity || d.shipmentWeight) === value;
      return false;
    });

    if (match) {
      // Sync Capacity by combining Priority, Weight and Qty to give full context
      const capacityParts = [];
      if (match.priority) capacityParts.push(`Priority: ${match.priority}`);
      if (match.shipmentWeight) capacityParts.push(`${match.shipmentWeight} kg`);
      else if (match.capacity) capacityParts.push(match.capacity);
      else if (match.qty) capacityParts.push(`${match.qty} Qty`);
      
      const syncCapacity = capacityParts.join(' | ') || '';

      setForm(f => ({
        ...f,
        number: match.vehicleNo || match.vehicleNumber || f.number,
        driver: match.driverName || f.driver,
        driverMobile: match.driverMobile || f.driverMobile,
        capacity: syncCapacity || f.capacity,
        [field]: value 
      }));
      setSearchTerms({
        number: match.vehicleNo || match.vehicleNumber || '',
        driver: match.driverName || '',
        driverMobile: match.driverMobile || '',
        capacity: syncCapacity || ''
      });
      toast(`Details auto-filled: ${match.docketId} (${syncCapacity})`, 'success');
      return;
    }

    setForm(f => ({ ...f, [field]: value }));
    setSearchTerms(prev => ({ ...prev, [field]: value }));
  };

  const filteredVehicles = vehicles.filter(v => {
    const s = fleetSearch.toLowerCase();
    return (v.number || '').toLowerCase().includes(s) || 
           (v.driver || '').toLowerCase().includes(s) || 
           (v.type || '').toLowerCase().includes(s);
  });

  const handleCreate = async () => {
    if (!form.number || !form.driver) {
      toast('Vehicle number and driver are required', 'error'); return;
    }
    setSaving(true);
    try {
      await logisticsApi.createVehicle(form);
      toast('Vehicle added successfully');
      setShowModal(false);
      setForm(EMPTY_VEHICLE);
      dataEvents.emit('logistics:changed');
      onRefresh();
      loadReturnQueue();
    } catch (e) { toast(e.message || 'Failed to add vehicle', 'error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await logisticsApi.updateVehicle(id, { status });
      toast(`Vehicle status → ${status}`);
      onRefresh();
    } catch { toast('Failed to update vehicle', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      await logisticsApi.deleteVehicle(id);
      toast('Vehicle deleted');
      dataEvents.emit('logistics:changed');
      onRefresh();
    } catch { toast('Failed to delete vehicle', 'error'); }
  };

  const handleAssignVehicle = async (returnItem, vehicle) => {
    if (!vehicle) {
      toast('Please select a vehicle first', 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      if (returnItem._source === 'return') {
        // Update the MaterialReturn record directly
        await materialReturnApi.updateTransport(returnItem._id, {
          vehicleNo: vehicle.number,
          vehicleName: vehicle.name || vehicle.number,
          driverName: vehicle.driver,
          driverMobile: vehicle.driverMobile || '',
          transport: vehicle.type || 'Truck',
          stage: 'VEHICLE_ASSIGNED',
          trackingStatus: 'Vehicle Assigned',
        });
      } else {
        // Update docket tracking record
        await docketTrackingApi.updateDocket(returnItem._id, {
          vehicleNumber: vehicle.number,
          vehicleName: vehicle.name || vehicle.number,
          driverName: vehicle.driver,
          driverMobile: vehicle.driverMobile || '—',
          transportStatus: 'picked_up'
        });
        await docketTrackingApi.updateDocketStatus(returnItem._id, {
          transportStatus: 'picked_up',
          location: returnItem.pickupAddress || 'Pickup Location',
          remarks: `Vehicle ${vehicle.number} assigned`
        });
      }

      // Update vehicle status
      await logisticsApi.updateVehicle(vehicle._id, { 
        status: 'Assigned',
        currentDocket: returnItem.docketId,
        currentRoute: `${returnItem.pickupAddress || 'Customer'} → ${returnItem.destWarehouse || 'Warehouse'}`,
        currentLoad: `${returnItem.productName || 'Material'} (${returnItem.returnQty || 0})`
      });

      toast(`Vehicle ${vehicle.number} assigned to Return ${returnItem.mrId}`);
      loadReturnQueue();
      onRefresh();
      setAssignModal(null);
    } catch (error) {
      toast(error.message || 'Failed to assign vehicle', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTransportAction = async (v, action) => {
    try {
      let transportStatus, vehicleStatus, location;
      if (action === 'out_for_pickup') {
        transportStatus = 'out_for_delivery'; 
        vehicleStatus = 'Assigned';
        location = 'Out for Pickup';
      } else if (action === 'pickup') {
        transportStatus = 'picked_up'; 
        vehicleStatus = 'In Transit';
        location = 'Picked Up';
      } else if (action === 'transit') {
        transportStatus = 'in_transit'; 
        vehicleStatus = 'In Transit';
        location = 'In Transit';
      } else if (action === 'arrive') {
        transportStatus = 'delivered'; 
        vehicleStatus = 'Available';
        location = 'Arrived at Warehouse';
      }

      // Find docket by docket ID
      const dockets = await docketTrackingApi.getAllDockets({ search: v.currentDocket });
      const docket = dockets.data?.find(d => d.docketId === v.currentDocket);
      if (!docket) throw new Error('Docket not found for this vehicle');

      // Update docket status
      await docketTrackingApi.updateDocketStatus(docket._id, { 
        transportStatus,
        location,
        remarks: `Status updated to ${location}`
      });

      // Update vehicle status
      await logisticsApi.updateVehicle(v._id, {
        status: vehicleStatus,
        currentDocket: action === 'arrive' ? '' : v.currentDocket,
        currentRoute: action === 'arrive' ? '' : v.currentRoute,
        currentLoad: action === 'arrive' ? '' : v.currentLoad
      });

      toast(`Transport updated: ${location}`);
      onRefresh();
      loadReturnQueue();
    } catch (e) { 
      console.error('Transport Action Error:', e);
      toast(e.message || 'Failed to update transport', 'error'); 
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Actions */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search fleet (Number, Driver, Type)..." 
            className={`${inp} pl-10`}
            value={fleetSearch}
            onChange={e => setFleetSearch(e.target.value)}
          />
        </div>
        <button style={primaryBtn} onClick={() => setShowModal(true)}>+ Add Vehicle</button>
      </div>

      {/* Fleet Summary: 4 Cards in one row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vehicles', value: vehicles.length, color: '#1c2833', icon: <MdLocalShipping /> },
          { label: 'Available', value: vehicles.filter(v => v.status === 'Available').length, color: '#10b981', icon: <MdCheckCircle /> },
          { label: 'In Transit', value: vehicles.filter(v => v.status === 'In Transit').length, color: '#3b82f6', icon: <MdLocalShipping /> },
          { label: 'Assigned', value: vehicles.filter(v => v.status === 'Assigned').length, color: '#f59e0b', icon: <MdLocalShipping /> },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${k.color}10`, color: k.color }}>
              {k.icon}
            </div>
            <div>
              <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Active Fleet Status */}
        <div className="xl:col-span-2 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 px-1">
              <MdLocalShipping className="text-red-600" /> Active Fleet Status
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? <Spinner /> : filteredVehicles.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400 text-sm">
                  {fleetSearch ? `No vehicles matching "${fleetSearch}"` : 'No vehicles registered in fleet'}
                </div>
              ) : filteredVehicles.map((v) => (
                <div key={v._id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    v.status === 'Available' ? 'bg-green-500' :
                    v.status === 'Assigned' ? 'bg-amber-500' :
                    v.status === 'In Transit' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
                        🚚
                      </div>
                      <div>
                        <div className="font-black text-sm text-gray-800 tracking-tight">{v.number}</div>
                        <div className="text-[11px] text-gray-500 font-bold uppercase">{v.type} • {v.capacity}</div>
                      </div>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>

                  {v.status !== 'Available' && v.currentDocket && (
                    <div className="grid grid-cols-1 gap-2 mb-4 border-t border-gray-50 pt-3">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Active Docket</span>
                          <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-1.5 rounded">{v.currentDocket}</span>
                        </div>
                        <div className="text-[11px] font-bold text-gray-700 truncate">{v.currentRoute}</div>
                        <div className="mt-2 flex gap-1.5">
                          {v.status === 'Assigned' && (
                            <button onClick={() => handleTransportAction(v, 'out_for_pickup')} className="flex-1 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg hover:bg-red-600 transition-colors">Out for Pickup</button>
                          )}
                          {v.status === 'Assigned' && (
                            <button onClick={() => handleTransportAction(v, 'pickup')} className="flex-1 py-1.5 bg-green-700 text-white text-[10px] font-bold rounded-lg">Picked Up</button>
                          )}
                          {v.status === 'In Transit' && (
                            <>
                              <button onClick={() => handleTransportAction(v, 'transit')} className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg">Update Location</button>
                              <button onClick={() => handleTransportAction(v, 'arrive')} className="flex-1 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg">Mark Arrived</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                      <MdPhone className="text-gray-400" /> {v.driverMobile || 'No Mobile'}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={v.status}
                        onChange={e => handleStatusChange(v._id, e.target.value)}
                        className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 outline-none bg-gray-50 font-bold cursor-pointer"
                      >
                        <option>Available</option>
                        <option>Assigned</option>
                        <option>In Transit</option>
                        <option>Maintenance</option>
                        <option>Inactive</option>
                      </select>
                      <button onClick={() => handleDelete(v._id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Return Pickup Queue */}
        <div className="xl:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 px-1">
            <MdInventory className="text-red-600" /> Return Pickup Queue
          </h3>
          
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="max-h-[650px] overflow-y-auto custom-scrollbar">
              {queueLoading ? <Spinner /> : returnQueue.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">No pending return pickups</div>
              ) : returnQueue.map((item) => (
                <div key={item._id} className="p-4 border-b border-gray-50 hover:bg-red-50/30 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black text-red-700 tracking-tighter">{item.mrId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                      item.priority === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-gray-800 mb-1">{item.supplierName || item.customerName}</div>
                  <div className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">
                    <MdDescription size={12} className="text-gray-400" /> {item.docketId} • {item.returnQty} Qty
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Pickup Location</div>
                  <div className="text-[11px] text-gray-600 font-semibold mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100 truncate italic">
                    <MdPlace className="inline mr-1" /> {item.pickupAddress || 'Location not specified'}
                  </div>
                  
                  <button 
                    onClick={() => setAssignModal(item)}
                    className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-[11px] font-bold shadow-md hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                  >
                    <MdLocalShipping size={14} /> Assign Vehicle
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Assignment Modal */}
      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title="Assign Logistics Vehicle"
        footer={
          <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600" onClick={() => setAssignModal(null)}>Cancel</button>
        }
      >
        {assignModal && (
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-black text-red-700">{assignModal.mrId}</span>
                <span className="text-xs font-bold text-gray-600">{assignModal.docketId}</span>
              </div>
              <div className="text-xs text-gray-700 font-bold mb-1">{assignModal.supplierName}</div>
              <div className="text-[11px] text-gray-500">{assignModal.pickupAddress}</div>
            </div>

            <div className="text-xs font-bold text-gray-800 px-1">Select Available Vehicle</div>
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {vehicles.filter(v => v.status === 'Available').length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">No available vehicles in fleet</div>
              ) : vehicles.filter(v => v.status === 'Available').map(v => (
                <button
                  key={v._id}
                  onClick={() => handleAssignVehicle(assignModal, v)}
                  disabled={saving}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:border-red-300 hover:bg-red-50/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">🚚</div>
                    <div>
                      <div className="font-bold text-sm text-gray-800">{v.number}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold">{v.driver} • {v.type}</div>
                    </div>
                  </div>
                  <div className="text-red-600 font-black text-xs">Assign →</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        open={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_VEHICLE); setSearchTerms({ number: '', driver: '', driverMobile: '', capacity: '' }); }}
        title="Add New Vehicle"
        footer={
          <>
            <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600" onClick={() => { setShowModal(false); setForm(EMPTY_VEHICLE); setSearchTerms({ number: '', driver: '', driverMobile: '', capacity: '' }); }}>Cancel</button>
            <button style={primaryBtn} onClick={handleCreate} disabled={saving}>{saving ? 'Adding...' : 'Add Vehicle'}</button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Quick Fill from Docket Tracking */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-200">
            <label className="text-xs font-bold text-green-900 mb-2 block flex items-center gap-2">
              <span>✅</span> Quick Fill - Select Vehicle to Auto-Fill All Fields
            </label>
            <select 
              className="w-full px-3 py-2.5 border-2 border-green-300 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-green-500 focus:ring-2 focus:ring-green-100 font-semibold"
              onChange={(e) => {
                const docket = docketData.find(d => d.docketId === e.target.value);
                if (docket) {
                  setForm({
                    type: docket.returnType || 'Truck',
                    name: docket.vehicleName || docket.vehicleName || docket.courierPartner || '',
                    number: docket.vehicleNo || docket.vehicleNumber || '',
                    driver: docket.driverName || '',
                    driverMobile: docket.driverMobile || '',
                    capacity: docket.priority ? `${docket.priority} Priority` : '',
                    status: 'Available'
                  });
                  toast(`✓ Vehicle: ${docket.vehicleName || 'Unnamed'} - All fields auto-filled!`, 'success');
                }
              }}
              value=""
            >
              <option value="">— Select Vehicle Name to Auto-Fill —</option>
              {docketData.filter(d => d.vehicleNo && d.driverName).map(d => (
                <option key={d._id} value={d.docketId}>
                  {d.vehicleName || 'Unnamed Vehicle'} - {d.vehicleNo} - {d.driverName} - {d.driverMobile || 'No Mobile'}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-green-700 font-bold mt-2 bg-green-100 px-2 py-1 rounded">
              ✓ {docketData.filter(d => d.vehicleNo && d.driverName).length} vehicles available • Select to auto-fill all fields
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Vehicle Type *</label>
              <select className={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="">— Select Type —</option>
                <option>Mini Truck</option><option>Truck</option><option>Tempo</option><option>Container</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Vehicle Name *</label>
              <input 
                className={`${inp} bg-gray-50`}
                placeholder="Auto-filled from Quick Fill" 
                value={form.name || ''} 
                readOnly
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Vehicle Number *</label>
              <input 
                className={`${inp} bg-gray-50`}
                placeholder="Auto-filled from Quick Fill" 
                value={form.number} 
                readOnly
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Driver Name *</label>
              <input 
                className={`${inp} bg-gray-50`}
                placeholder="Auto-filled from Quick Fill" 
                value={form.driver} 
                readOnly
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Driver Mobile (10 digits)</label>
              <input 
                className={`${inp} bg-gray-50`}
                placeholder="Auto-filled from Quick Fill" 
                value={form.driverMobile} 
                readOnly
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">Capacity (Priority)</label>
              <input 
                className={`${inp} bg-gray-50`}
                placeholder="Auto-filled Priority from Docket" 
                value={form.capacity} 
                readOnly
              />
            </div>
          </div>
          
          
        </div>
      </Modal>
    </div>
  );
}

// ── Tab 2: Delivery Tracking ──────────────────────────────────────────────────
function TrackingTab() {
  const [dispatches, setDispatches] = useState([]);
  const [returns, setReturns]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          logisticsApi.getDispatches(),
          materialReturnApi.getAll()
        ]);
        
        const dispatchList = dRes.data || [];
        // Filter returns that are in transit or picked up
        const returnList = (rRes.data || [])
          .filter(r => ['VEHICLE_ASSIGNED', 'OUT_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(r.currentStage))
          .map(r => ({
            ...r,
            dispatchId: r.docketId, // Use Docket ID as Dispatch ID for returns
            customer: r.supplierName || r.customerName,
            destination: r.warehouseName || 'Warehouse',
            status: r.trackingStatus || r.currentStage,
            isReturn: true
          }));

        const combined = [...dispatchList, ...returnList];
        setDispatches(combined);
        setReturns(returnList);
        if (combined.length > 0) setSelected(combined[0]);
      } catch (err) {
        toast('Failed to load tracking data', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;
  if (dispatches.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 shadow-sm">No dispatches found</div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Dispatch list */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm md:col-span-1 overflow-y-auto max-h-[600px]">
        <div className="text-sm font-bold text-gray-800 mb-3">All Dispatches</div>
        {dispatches.map(d => (
          <div key={d._id} onClick={() => setSelected(d)}
            className={`p-3 rounded-xl mb-2 cursor-pointer border-2 transition-all ${selected?._id === d._id ? 'border-red-600 bg-red-50/60' : 'border-gray-200 hover:border-red-300'}`}>
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-red-700 text-sm">{d.dispatchId}</span>
              <StatusBadge status={d.status} />
            </div>
            <div className="text-sm font-semibold text-gray-800">{d.customer}</div>
            <div className="text-xs text-gray-500 mt-0.5">{d.origin || '—'} → {d.destination}</div>
          </div>
        ))}
      </div>

      {/* Timeline + Summary */}
      {selected && (
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800">Tracking — {selected.dispatchId}</div>
            <div className="text-xs text-gray-400 mt-0.5 mb-5">{selected.customer} · {selected.destination}</div>
            {selected.timeline && selected.timeline.length > 0 ? (
              <div className="relative pl-6">
                <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-gray-200 rounded" />
                {selected.timeline.map((item, i) => (
                  <div key={i} className="relative mb-5 last:mb-0">
                    <div className={`absolute -left-[17px] top-1 w-3 h-3 rounded-full ring-2 ring-offset-1 ${
                      item.status === 'success' ? 'bg-green-500 ring-green-500' :
                      item.status === 'warning' ? 'bg-amber-400 ring-amber-400' :
                      'bg-gray-300 ring-gray-300'
                    }`} />
                    <div className="text-sm font-semibold text-gray-800">{item.event}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{fmt(item.time)}</div>
                    {item.location && <div className="text-xs text-gray-400">{item.location}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No timeline events yet</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-3.5">Delivery Summary</div>
            {[
              ['Dispatch ID',       selected.dispatchId],
              ['Order Ref',         selected.orderRef],
              ['Customer',          selected.customer],
              ['Vehicle',           selected.vehicleNo || '—'],
              ['Driver',            selected.driver || '—'],
              ['Origin',            selected.origin || '—'],
              ['Destination',       selected.destination],
              ['Dispatch Date',     fmt(selected.dispatchDate)],
              ['Expected Delivery', fmt(selected.expectedDelivery)],
              ['Status',            selected.status],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50 text-sm last:border-0">
                <span className="text-gray-500">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: DC Regularization (dispatches with invoice tracking) ───────────────
function DCTab() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [regularizing, setRegularizing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await logisticsApi.getDispatches();
      setDispatches(r.data || []);
    } catch { toast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegularize = async (id) => {
    if (!window.confirm('Regularize this dispatch and create invoice?')) return;
    setRegularizing(id);
    try {
      const r = await logisticsApi.regularize(id);
      toast('DC regularized successfully');
      // Update local state immediately
      setDispatches(prev => prev.map(d => d._id === id ? { ...d, regularized: true, regularizedAt: r.data?.regularizedAt || new Date().toISOString() } : d));
    } catch (e) { toast(e.message || 'Failed to regularize', 'error'); }
    finally { setRegularizing(null); }
  };

  const pending = dispatches.filter(d => !d.regularized);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-gray-800">DC to Invoice Regularization</div>
          <div className="text-xs text-gray-400 mt-0.5">Track dispatch challans and convert to invoices</div>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{pending.length} Pending</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">{dispatches.filter(d => d.regularized).length} Regularized</span>
        </div>
      </div>
      {loading ? <Spinner /> : (
        <DataTable
          columns={[
            { key: 'dispatchId', label: 'Dispatch ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
            { key: 'orderRef',   label: 'Order Ref' },
            { key: 'customer',   label: 'Customer', render: v => <span className="font-semibold">{v}</span> },
            { key: 'dispatchDate', label: 'Dispatch Date', render: v => fmt(v) },
            { key: 'destination', label: 'Destination' },
            { key: 'value',      label: 'Value', render: v => <span className="font-bold">{fmtCur(v)}</span> },
            { key: 'status',     label: 'Status', render: v => <StatusBadge status={v} type={v === 'Delivered' ? 'success' : v === 'Cancelled' ? 'danger' : 'warning'} /> },
            { key: 'regularized', label: 'Regularization', render: (v, row) => v ? (
              <div>
                <span className="px-2 py-1 text-[11px] rounded bg-green-100 text-green-800 font-semibold block">✓ Regularized</span>
                {row.regularizedAt && <span className="text-[10px] text-gray-400 mt-0.5 block">{fmt(row.regularizedAt)}</span>}
              </div>
            ) : (
              <span className="px-2 py-1 text-[11px] rounded bg-amber-100 text-amber-700 font-semibold">Pending</span>
            )},
            { key: '_id', label: 'Action', render: (id, row) => (
              <div className="flex gap-1.5 flex-wrap items-center">
                {row.regularized ? (
                  <span className="text-green-600 text-xs font-semibold">✓ Done</span>
                ) : row.status === 'Delivered' ? (
                  <button
                    onClick={() => handleRegularize(id)}
                    disabled={regularizing === id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-60"
                  >
                    {regularizing === id ? 'Processing...' : 'Regularize → Invoice'}
                  </button>
                ) : (
                  <span className="text-gray-400 text-xs">Awaiting Delivery</span>
                )}
                <button
                  onClick={async () => { if(window.confirm('Delete this dispatch?')){ try { await logisticsApi.deleteDispatch(id); toast('Deleted'); load(); } catch(e){ toast(e.message,'error'); } } }}
                  className="px-2 py-1 text-[11px] rounded-lg bg-red-50 text-red-600 border border-red-200 cursor-pointer font-[inherit]"
                  title="Delete"
                >🗑</button>
              </div>
            )},
          ]}
          data={dispatches}
        />
      )}
    </div>
  );
}

// ── Tab 4: Pendency ───────────────────────────────────────────────────────────
function PendencyTab() {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [summary, setSummary]       = useState(null);
  const [loaded, setLoaded]         = useState(false);

  const loadPendency = async () => {
    setLoading(true);
    try {
      const r = await logisticsApi.getPendency();
      setDispatches(r.data || []);
      setSummary(r.summary || null);
      setLoaded(true);
    } catch { toast('Failed to load pendency report', 'error'); }
    finally { setLoading(false); }
  };

  const urgencyColor = (ageDays) => {
    if (ageDays > 14) return { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700' };
    if (ageDays > 7)  return { bg: 'bg-amber-50', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
    if (ageDays > 3)  return { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' };
    return { bg: '', text: 'text-green-600', badge: 'bg-green-100 text-green-700' };
  };

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <KpiCard label="Total Pending"      value={summary?.total ?? dispatches.length}                                                    color="#ef4444" />
        <KpiCard label="Overdue (>7 days)"  value={summary?.overdue ?? dispatches.filter(d => (d.ageDays || 0) > 7).length}               color="#f59e0b" />
        <KpiCard label="Critical (>14 days)" value={summary?.critical ?? dispatches.filter(d => (d.ageDays || 0) > 14).length}            color="#dc2626" />
        <KpiCard label="Value at Risk"      value={fmtCur(summary?.totalValue ?? dispatches.reduce((s, d) => s + (d.value || 0), 0))}     color="#8b5cf6" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-gray-800">Pendency Report</div>
            <div className="text-xs text-gray-400 mt-0.5">Dispatches pending delivery — color coded by age</div>
          </div>
          <button style={primaryBtn} onClick={loadPendency} disabled={loading}>
            {loading ? 'Loading...' : 'Load Pendency Report'}
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {[
            { label: 'Fresh (<3 days)',   color: 'bg-green-100 text-green-700' },
            { label: 'Aging (3-7 days)',  color: 'bg-yellow-100 text-yellow-700' },
            { label: 'Overdue (>7 days)', color: 'bg-amber-100 text-amber-700' },
            { label: 'Critical (>14d)',   color: 'bg-red-100 text-red-700' },
          ].map(({ label, color }) => (
            <span key={label} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${color}`}>{label}</span>
          ))}
        </div>

        {!loaded ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <div className="text-3xl mb-3">📋</div>
            Click "Load Pendency Report" to fetch live data
          </div>
        ) : loading ? <Spinner /> : dispatches.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No pending dispatches 🎉</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {['Dispatch ID', 'Customer', 'Destination', 'Value', 'Age (days)', 'Status', 'Urgency', 'Notes', 'Action'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dispatches.map((d, i) => {
                  const age = d.ageDays ?? Math.floor((Date.now() - new Date(d.createdAt)) / 86400000);
                  const colors = urgencyColor(age);
                  return (
                    <tr key={d._id || i} className={`border-b border-gray-50 last:border-0 ${colors.bg} transition-colors`}>
                      <td className="px-4 py-3"><span className="font-semibold text-red-700">{d.dispatchId}</span></td>
                      <td className="px-4 py-3 font-semibold">{d.customer}</td>
                      <td className="px-4 py-3 text-gray-600">{d.destination || '—'}</td>
                      <td className="px-4 py-3 font-bold">{fmtCur(d.value)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-black text-lg ${colors.text}`}>{age}d</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${colors.badge}`}>
                          {age > 14 ? '🔴 Critical' : age > 7 ? '🟠 High' : age > 3 ? '🟡 Medium' : '🟢 Normal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-500">{d.instructions || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={async () => { if(window.confirm('Delete this dispatch?')){ try { await logisticsApi.deleteDispatch(d._id); toast('Deleted'); loadPendency(); } catch(e){ toast(e.message,'error'); } } }}
                          className="px-2 py-1 text-[11px] rounded-lg bg-red-50 text-red-600 border border-red-200 cursor-pointer font-[inherit]"
                          title="Delete"
                        >🗑</button>
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

// ── Tab 5: Courier & POD ──────────────────────────────────────────────────────
function CourierTab() {
  const [shipments, setShipments]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_SHIPMENT);
  const [saving, setSaving]         = useState(false);
  const [podModal, setPodModal]     = useState(null); // shipment object
  const [podForm, setPodForm]       = useState({ receivedBy:'', deliveredAt:'' });
  const [podSaving, setPodSaving]   = useState(false);
  const [trackModal, setTrackModal] = useState(null); // { awbNo, courier }
  const [trackData, setTrackData]   = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await logisticsApi.getShipments();
      setShipments(r.data || []);
    } catch { toast('Failed to load shipments', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.courier || !form.awbNo || !form.orderRef || !form.customer || !form.destination) {
      toast('All required fields must be filled', 'error'); return;
    }
    setSaving(true);
    try {
      await logisticsApi.createShipment(form);
      toast('Shipment created successfully');
      setShowModal(false);
      setForm(EMPTY_SHIPMENT);
      dataEvents.emit('logistics:changed');
      load();
    } catch (e) { toast(e.message || 'Failed to create shipment', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shipment?')) return;
    try {
      await logisticsApi.deleteShipment(id);
      toast('Shipment deleted');
      dataEvents.emit('logistics:changed');
      load();
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await logisticsApi.updateShipment(id, { status });
      toast(`Status → ${status}`);
      dataEvents.emit('logistics:changed');
      load();
    } catch { toast('Failed to update', 'error'); }
  };

  const handlePODSubmit = async () => {
    if (!podForm.receivedBy) { toast('Receiver name is required', 'error'); return; }
    setPodSaving(true);
    try {
      await logisticsApi.markPOD(podModal._id, podForm);
      toast('POD submitted successfully');
      setPodModal(null);
      setPodForm({ receivedBy:'', deliveredAt:'' });
      dataEvents.emit('logistics:changed');
      load();
    } catch { toast('Failed to submit POD', 'error'); }
    finally { setPodSaving(false); }
  };

  const handleTrack = async (awbNo, courier) => {
    setTrackModal({ awbNo, courier });
    setTrackData(null);
    setTrackLoading(true);
    try {
      const r = await logisticsApi.trackCourier(awbNo, courier);
      setTrackData(r.data);
    } catch { toast('Failed to fetch tracking info', 'error'); }
    finally { setTrackLoading(false); }
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button style={primaryBtn} onClick={() => setShowModal(true)}>+ New Shipment</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <KpiCard label="Active Shipments" value={shipments.filter(s => s.status !== 'Delivered').length} color="#3b82f6" />
        <KpiCard label="Delivered"        value={shipments.filter(s => s.status === 'Delivered').length} color="#10b981" />
        <KpiCard label="POD Pending"      value={shipments.filter(s => !s.pod).length} color="#f59e0b" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="text-sm font-bold text-gray-800 mb-3.5">Courier Shipments</div>
        {loading ? <Spinner /> : (
          <DataTable
            columns={[
              { key: 'shipmentId', label: 'Shipment ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'courier',    label: 'Courier', render: v => <span className="font-bold">{v}</span> },
              { key: 'awbNo',      label: 'AWB No.', render: v => <span className="font-mono text-[11px]">{v}</span> },
              { key: 'orderRef',   label: 'Order Ref' },
              { key: 'customer',   label: 'Customer' },
              { key: 'destination',label: 'Destination' },
              { key: 'eta',        label: 'ETA', render: v => fmt(v) },
              { key: 'status',     label: 'Status', render: v => <StatusBadge status={v} type={v === 'Delivered' ? 'success' : v === 'Out for Delivery' ? 'warning' : 'info'} /> },
              { key: 'pod',        label: 'POD', render: (v, row) => v ? (
                <span className="px-2 py-1 text-[11px] rounded bg-green-100 text-green-800 font-semibold">✓ Done</span>
              ) : (
                <button onClick={() => setPodModal(row)} className="px-2 py-1 text-[11px] rounded bg-amber-100 text-amber-800 border-0 cursor-pointer font-[inherit] font-semibold">⬆ Upload POD</button>
              )},
              { key: '_id', label: 'Actions', render: (id, row) => (
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleTrack(row.awbNo, row.courier)}
                    className="px-2 py-1 text-[11px] rounded-lg bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer font-[inherit] font-semibold"
                  >
                    📍 Track
                  </button>
                  {row.status !== 'Delivered' && (
                    <select value={row.status} onChange={e => handleStatusUpdate(id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none bg-white font-[inherit] cursor-pointer">
                      <option value="Booked">Booked</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Returned">Returned</option>
                    </select>
                  )}
                  <button onClick={() => handleDelete(id)} className="px-2 py-1 text-[11px] rounded-lg bg-red-50 text-red-600 border border-red-200 cursor-pointer font-[inherit]">✕</button>
                </div>
              )},
            ]}
            data={shipments}
          />
        )}
      </div>
      {/* Create Shipment Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setForm(EMPTY_SHIPMENT); }}
        title="New Courier Shipment"
        size="lg"
        footer={
          <>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]" onClick={() => { setShowModal(false); setForm(EMPTY_SHIPMENT); }}>Cancel</button>
            <button style={primaryBtn} onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Shipment'}</button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">Courier *</label>
            <select className={inp} value={form.courier} onChange={e => setForm(f => ({ ...f, courier: e.target.value }))}>
              <option value="">— Select Courier —</option>
              {['Delhivery', 'BlueDart', 'India Post', 'DTDC', 'Ekart', 'FedEx'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {[
            { label:'AWB No. *',      key:'awbNo',       placeholder:'Tracking number' },
            { label:'Order Ref *',    key:'orderRef',    placeholder:'e.g. ORD-2024-089' },
            { label:'Customer *',     key:'customer',    placeholder:'Customer name' },
            { label:'Destination *',  key:'destination', placeholder:'City / Address' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-600">{label}</label>
              <input className={inp} placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600">ETA</label>
            <input type="date" className={inp} value={form.eta} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* POD Upload Modal */}
      <Modal
        open={!!podModal}
        onClose={() => { setPodModal(null); setPodForm({ receivedBy:'', deliveredAt:'' }); }}
        title={`Submit POD — ${podModal?.shipmentId || ''}`}
        footer={
          <>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]" onClick={() => setPodModal(null)}>Cancel</button>
            <button style={primaryBtn} onClick={handlePODSubmit} disabled={podSaving}>{podSaving ? 'Submitting...' : 'Submit POD'}</button>
          </>
        }
      >
        {podModal && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4 cursor-pointer bg-gray-50">
                <div className="text-4xl mb-2">📷</div>
                <div className="font-semibold text-sm mb-1">Upload POD Image / Signature</div>
                <div className="text-[11px] text-gray-500">Drag & drop or click to browse</div>
                <div className="text-[10px] text-gray-400 mt-1">JPG, PNG, PDF — Max 5MB</div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm mb-3">Delivery Details</div>
              {[
                ['Shipment',    podModal.shipmentId],
                ['AWB No.',     podModal.awbNo],
                ['Courier',     podModal.courier],
                ['Customer',    podModal.customer],
                ['Destination', podModal.destination],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 text-sm last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-semibold">{v}</span>
                </div>
              ))}
              <div className="flex flex-col gap-1.5 mt-3 mb-3">
                <label className="text-xs font-semibold text-gray-600">Receiver Name *</label>
                <input className={inp} placeholder="Name of person who received" value={podForm.receivedBy} onChange={e => setPodForm(f => ({ ...f, receivedBy: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Delivery Date & Time</label>
                <input type="datetime-local" className={inp} value={podForm.deliveredAt} onChange={e => setPodForm(f => ({ ...f, deliveredAt: e.target.value }))} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Tracking Modal */}
      <Modal
        open={!!trackModal}
        onClose={() => { setTrackModal(null); setTrackData(null); }}
        title={`Track Shipment — ${trackModal?.awbNo || ''}`}
        size="lg"
        footer={
          <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold cursor-pointer font-[inherit]" onClick={() => { setTrackModal(null); setTrackData(null); }}>Close</button>
        }
      >
        {trackLoading ? (
          <Spinner />
        ) : trackData ? (
          <div>
            {/* Status Header */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl mb-5">
              <div className="text-3xl">📦</div>
              <div className="flex-1">
                <div className="font-bold text-gray-800">{trackData.courier} — {trackData.awbNo}</div>
                <div className="text-sm text-blue-700 font-semibold mt-0.5">{trackData.status}</div>
                {trackData.currentLocation && <div className="text-xs text-gray-500 mt-0.5">📍 {trackData.currentLocation}</div>}
              </div>
              {trackData.estimatedDelivery && (
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Est. Delivery</div>
                  <div className="text-sm font-bold text-gray-800">{fmt(trackData.estimatedDelivery)}</div>
                </div>
              )}
            </div>

            {/* Timeline */}
            {trackData.events && trackData.events.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Tracking Timeline</div>
                <div className="relative pl-6">
                  <div className="absolute left-2.5 top-1.5 bottom-1.5 w-0.5 bg-gray-200 rounded" />
                  {trackData.events.map((ev, i) => (
                    <div key={i} className="relative mb-5 last:mb-0">
                      <div className={`absolute -left-[17px] top-1 w-3 h-3 rounded-full ring-2 ring-offset-1 ${
                        i === 0 ? 'bg-blue-500 ring-blue-500' : 'bg-gray-300 ring-gray-300'
                      }`} />
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{ev.description || ev.status}</div>
                          {ev.location && <div className="text-xs text-gray-400 mt-0.5">📍 {ev.location}</div>}
                        </div>
                        <div className="text-[11px] text-gray-400 whitespace-nowrap ml-4">
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">No tracking data available</div>
        )}
      </Modal>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LogisticsPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab]   = useState(initialTab);
  const [vehicles, setVehicles]     = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const loadVehicles = useCallback(async () => {
    setVehiclesLoading(true);
    try {
      const r = await logisticsApi.getVehicles();
      setVehicles(r.data || []);
    } catch { toast('Failed to load vehicles', 'error'); }
    finally { setVehiclesLoading(false); }
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b-2 border-gray-200 mb-5 overflow-x-auto scrollbar-none">
        {['Dispatch Dashboard', 'Vehicle Allocation', 'Delivery Tracking', 'DC Regularization', 'Pendency', 'Courier & POD', 'Docket Tracking'].map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-0.5 transition-all font-[inherit] bg-transparent cursor-pointer flex-shrink-0
              ${activeTab === i ? 'text-red-700 border-red-600' : 'text-gray-400 border-transparent hover:text-red-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 0 && <DispatchTab vehicles={vehicles} />}
      {activeTab === 1 && <VehiclesTab vehicles={vehicles} loading={vehiclesLoading} onRefresh={loadVehicles} />}
      {activeTab === 2 && <TrackingTab />}
      {activeTab === 3 && <DCTab />}
      {activeTab === 4 && <PendencyTab />}
      {activeTab === 5 && <CourierTab />}
      {activeTab === 6 && <DocketTrackingPage />}
    </div>
  );
}
