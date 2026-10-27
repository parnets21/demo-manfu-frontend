import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MdSearch, MdAdd, MdVisibility, MdEdit, MdDelete, MdRefresh,
  MdLocalShipping, MdInventory, MdCheckCircle, MdWarning,
  MdExpandMore, MdExpandLess, MdTrackChanges, MdClose,
  MdDirectionsCar, MdAttachFile,
  MdAssignment, MdWarningAmber, MdStore, MdInfo
} from 'react-icons/md';
import { materialReturnApi } from '../../api/materialReturnApi.js';
import { invoiceApi } from '../../api/invoiceApi.js';
import { logisticsApi } from '../../api/logisticsApi.js';
import { inventoryApi } from '../../api/inventoryApi.js';
import { toast } from '../../components/common/Toast.jsx';

// ============================================
// STATUS CONFIGURATIONS
// ============================================
const STATUS_CONFIG = {
  pickup_pending:   { label: 'Pickup Pending',    color: '#92400e', bg: '#fef3c7', icon: '⏳' },
  picked_up:        { label: 'Picked Up',         color: '#1d4ed8', bg: '#dbeafe', icon: '📦' },
  in_transit:       { label: 'In Transit',        color: '#6d28d9', bg: '#ede9fe', icon: '🚚' },
  out_for_delivery: { label: 'Out for Delivery',  color: '#0369a1', bg: '#e0f2fe', icon: '🚛' },
  delivered:        { label: 'Delivered',         color: '#15803d', bg: '#dcfce7', icon: '✓' },
  delayed:          { label: 'Delayed',           color: '#b91c1c', bg: '#fee2e2', icon: '⚠' },
  received:         { label: 'Received',          color: '#059669', bg: '#d1fae5', icon: '🏭' },
  qc_completed:     { label: 'QC Completed',      color: '#16a34a', bg: '#bbf7d0', icon: '✓' },
};

const PRIORITY_CONFIG = {
  critical: { color: '#b91c1c', bg: '#fee2e2' },
  high:     { color: '#c2410c', bg: '#ffedd5' },
  medium:   { color: '#1d4ed8', bg: '#dbeafe' },
  low:      { color: '#374151', bg: '#f3f4f6' },
};

const WH_STATUS_CONFIG = {
  Received:     { color: '#15803d', bg: '#dcfce7' },
  Awaited:      { color: '#6d28d9', bg: '#ede9fe' },
  'Not Started':{ color: '#374151', bg: '#f3f4f6' },
  'In Progress':{ color: '#0369a1', bg: '#e0f2fe' },
  Completed:    { color: '#059669', bg: '#d1fae5' },
};

const QC_STATUS_CONFIG = {
  Completed:    { color: '#15803d', bg: '#dcfce7' },
  'In Progress':{ color: '#1d4ed8', bg: '#dbeafe' },
  Pending:      { color: '#92400e', bg: '#fef3c7' },
};

const FINANCE_STATUS_CONFIG = {
  'Credit Note Issued': { color: '#15803d', bg: '#dcfce7' },
  'Debit Note Raised':  { color: '#b91c1c', bg: '#fee2e2' },
  'Pending DN':         { color: '#92400e', bg: '#fef3c7' },
  'Not Initiated':      { color: '#374151', bg: '#f3f4f6' },
  'Reconciled':         { color: '#059669', bg: '#d1fae5' },
};

// ============================================
// BADGE COMPONENTS
// ============================================
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || { label: status || '—', color: '#374151', bg: '#f3f4f6', icon: '' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const cfg = PRIORITY_CONFIG[priority?.toLowerCase()] || PRIORITY_CONFIG.medium;
  return (
    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg }}>
      {priority?.toUpperCase() || 'MEDIUM'}
    </span>
  );
};

const ReturnTypeBadge = ({ type }) => {
  const colors = {
    'Material Return': { color: '#0369a1', bg: '#e0f2fe' },
    'Sales Return':    { color: '#15803d', bg: '#dcfce7' },
    'Damage Return':   { color: '#b91c1c', bg: '#fee2e2' },
    'Quality Return':  { color: '#6d28d9', bg: '#ede9fe' },
  };
  const cfg = colors[type] || { color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg }}>
      {type || 'Material Return'}
    </span>
  );
};

const WhBadge = ({ status }) => {
  const cfg = WH_STATUS_CONFIG[status] || { color: '#374151', bg: '#f3f4f6' };
  return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>{status || '—'}</span>;
};

const QcBadge = ({ status }) => {
  const cfg = QC_STATUS_CONFIG[status] || { color: '#374151', bg: '#f3f4f6' };
  return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>{status || 'Pending'}</span>;
};

const FinBadge = ({ status }) => {
  const cfg = FINANCE_STATUS_CONFIG[status] || { color: '#374151', bg: '#f3f4f6' };
  return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, color: cfg.color, background: cfg.bg }}>{status || '—'}</span>;
};

// ============================================
// TOAST NOTIFICATION
// ============================================
const ToastMessage = ({ message, type, onClose }) => {
  useEffect(() => { 
    const t = setTimeout(onClose, 3000); 
    return () => clearTimeout(t); 
  }, [onClose]);
  
  const colors = { success: '#15803d', error: '#b91c1c', info: '#1d4ed8' };
  const bgColors = { success: '#dcfce7', error: '#fee2e2', info: '#dbeafe' };
  
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 99999, background: bgColors[type], borderLeft: `4px solid ${colors[type]}`, borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors[type] }}>{message}</span>
      <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><MdClose style={{ fontSize: 16, color: colors[type] }} /></button>
    </div>
  );
};

// ============================================
// CONFIRM DIALOG
// ============================================
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99998 }}>
    <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', maxWidth: 380, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <MdWarning style={{ fontSize: 26, color: '#b91c1c' }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Confirm Delete</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>{message}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onCancel} style={{ padding: '9px 22px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: '9px 22px', border: 'none', borderRadius: 8, background: '#dc2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
      </div>
    </div>
  </div>
);

// ============================================
// CREATE/EDIT DOCKET MODAL
// ============================================
const DocketModal = ({ isOpen, onClose, onSuccess, editData, returnsList = [], invoicesList = [] }) => {
  const isEdit = !!editData;
  const [form, setForm] = useState({
    mrId: '', returnType: 'Material Return', supplier: '', sourceLocation: '',
    destWarehouse: '', productName: '', productSku: '', qty: '', shipmentValue: '',
    courierPartner: '', vehicleNumber: '', awbLrNumber: '', priority: 'Medium',
    driverName: '', driverMobile: '', shipmentWeight: '', packagesCount: '',
    transportCost: '', estimatedDelivery: '', assignedTeam: '', invoiceNo: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [allReturns, setAllReturns] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    if (isOpen && editData) {
      setForm({
        mrId: editData.mrId || '',
        returnType: editData.returnType || 'Material Return',
        supplier: editData.supplier || '',
        sourceLocation: editData.sourceLocation || '',
        destWarehouse: editData.destWarehouse || '',
        productName: editData.productName || '',
        productSku: editData.productSku || '',
        qty: editData.qty || '',
        shipmentValue: editData.shipmentValue || '',
        courierPartner: editData.courierPartner || '',
        vehicleNumber: editData.vehicleNumber || '',
        awbLrNumber: editData.awbLrNumber || '',
        priority: editData.priority || 'Medium',
        driverName: editData.driverName || '',
        driverMobile: editData.driverMobile || '',
        shipmentWeight: editData.shipmentWeight || '',
        packagesCount: editData.packagesCount || '',
        transportCost: editData.transportCost || '',
        estimatedDelivery: editData.estimatedDelivery ? new Date(editData.estimatedDelivery).toISOString().split('T')[0] : '',
        assignedTeam: editData.assignedTeam || '',
        invoiceNo: editData.invoiceNo || ''
      });
    } else if (isOpen && !editData) {
      setForm({
        mrId: '', returnType: 'Material Return', supplier: '', sourceLocation: '',
        destWarehouse: '', productName: '', productSku: '', qty: '', shipmentValue: '',
        courierPartner: '', vehicleNumber: '', awbLrNumber: '', priority: 'Medium',
        driverName: '', driverMobile: '', shipmentWeight: '', packagesCount: '',
        transportCost: '', estimatedDelivery: '', assignedTeam: '', invoiceNo: ''
      });
    }
    setErrors({});
  }, [isOpen, editData]);

  useEffect(() => {
    const loadInitialData = async () => {
      setFetchingData(true);
      try {
        const [rRes, wRes, sRes, vRes] = await Promise.all([
          materialReturnApi.getAll(),
          inventoryApi.getWarehouses(),
          logisticsApi.getShipments(),
          logisticsApi.getVehicles()
        ]);
        setAllReturns(rRes.data || []);
        setWarehouses(wRes.data || []);
        setShipments(sRes.data || []);
        setVehicles(vRes.data || []);
      } catch (err) {
        console.error('Failed to load modal data:', err);
      } finally {
        setFetchingData(false);
      }
    };
    if (isOpen) loadInitialData();
  }, [isOpen]);

  const handleVehicleSelect = (vehicleNo) => {
    if (!vehicleNo) {
      setForm(prev => ({ ...prev, vehicleNumber: '', driverName: '', driverMobile: '' }));
      return;
    }
    // Match by 'number' key from Vehicle model as seen in http://localhost:5173/logistics/vehicles
    const vehicle = vehicles.find(v => v.number === vehicleNo);
    if (vehicle) {
      setForm(prev => ({
        ...prev,
        vehicleNumber: vehicle.number,
        driverName: vehicle.driver || prev.driverName,
        // Using 'driverMobile' or fallback to 'phone' if present in data
        driverMobile: vehicle.driverMobile || vehicle.phone || prev.driverMobile,
      }));
      toast(`Vehicle ${vehicleNo} & Driver details auto-fetched`, 'success');
    } else {
      setField('vehicleNumber', vehicleNo);
    }
  };

  const handleReturnSelect = (mrId) => {
    if (!mrId) return;
    const returnData = allReturns.find(r => r.mrId === mrId || r._id === mrId);
    if (returnData) {
      // Find matching shipment from logistics/courier data
      const matchingShipment = shipments.find(s => s.orderRef === returnData.invoiceNo || s.awbNo === returnData.awbNo);

      setForm(prev => ({
        ...prev,
        mrId: returnData.mrId,
        supplier: returnData.supplierName || prev.supplier,
        productName: returnData.productName || prev.productName,
        productSku: returnData.productSku || prev.productSku,
        qty: returnData.returnQty || prev.qty,
        shipmentValue: returnData.value || prev.shipmentValue,
        invoiceNo: returnData.invoiceNo || prev.invoiceNo,
        sourceLocation: returnData.address || returnData.pickupAddress || prev.sourceLocation,
        destWarehouse: returnData.destWarehouse || returnData.warehouseName || prev.destWarehouse,
        returnType: returnData.returnType || prev.returnType,
        courierPartner: matchingShipment?.courier || returnData.transport || prev.courierPartner,
        awbLrNumber: matchingShipment?.awbNo || returnData.awbNo || prev.awbLrNumber,
        // Auto-fill driver details if shipment exists
        driverName: matchingShipment?.driverName || prev.driverName,
        driverMobile: matchingShipment?.driverMobile || prev.driverMobile,
        vehicleNumber: matchingShipment?.vehicleNo || prev.vehicleNumber,
      }));

      if (matchingShipment) {
        toast(`Linked with Logistics AWB: ${matchingShipment.awbNo}`, 'success');
      } else {
        toast(`Details auto-fetched for ${mrId}`, 'success');
      }
    }
  };

  const handleProductSelect = (productName) => {
    if (!productName) return;
    const returnData = allReturns.find(r => r.productName === productName);
    if (returnData) {
      setForm(prev => ({
        ...prev,
        productName: returnData.productName,
        productSku: returnData.productSku || prev.productSku,
        qty: returnData.returnQty || prev.qty,
        shipmentValue: returnData.value || prev.shipmentValue,
        mrId: returnData.mrId || prev.mrId,
        supplier: returnData.supplierName || prev.supplier,
        invoiceNo: returnData.invoiceNo || prev.invoiceNo,
        destWarehouse: returnData.destWarehouse || returnData.warehouseName || prev.destWarehouse,
      }));
      toast(`Details auto-fetched for product: ${productName}`, 'success');
    }
  };

  const fetchReturnDetails = async (mrId) => {
    if (!mrId) return;
    setFetchingData(true);
    try {
      // Use materialReturnApi.getAll() and find the matching MR ID if getByMrId doesn't exist
      let returnData = null;
      try {
        const response = await materialReturnApi.getAll({ search: mrId });
        returnData = response.data?.find(r => r.mrId === mrId || r._id === mrId);
      } catch {
        // Fallback or handle error
      }

      if (returnData) {
        setForm(prev => ({
          ...prev,
          supplier: returnData.supplierName || prev.supplier,
          productName: returnData.productName || prev.productName,
          productSku: returnData.productSku || prev.productSku,
          qty: returnData.returnQty || prev.qty,
          shipmentValue: returnData.value || prev.shipmentValue,
          invoiceNo: returnData.invoiceNo || prev.invoiceNo,
          sourceLocation: returnData.address || returnData.pickupAddress || prev.sourceLocation,
          destWarehouse: returnData.destWarehouse || prev.destWarehouse,
          returnType: returnData.returnType || prev.returnType,
          courierPartner: returnData.transport || prev.courierPartner,
          awbLrNumber: returnData.awbNo || prev.awbLrNumber,
        }));
        toast(`Return details fetched for ${mrId}`, 'success');
      } else {
        toast(`No return request found for ${mrId}`, 'info');
      }
    } catch (err) {
      toast(err.message || 'Failed to fetch return details', 'error');
    } finally {
      setFetchingData(false);
    }
  };

  const fetchInvoiceDetails = async (invoiceNo) => {
    if (!invoiceNo) return;
    setFetchingData(true);
    try {
      const response = await invoiceApi.getByInvoiceNo(invoiceNo);
      const invoiceData = response.data;
      if (invoiceData) {
        setForm(prev => ({
          ...prev,
          supplier: invoiceData.partyName || invoiceData.supplierName || prev.supplier,
          productName: invoiceData.productName || (invoiceData.items?.[0]?.productName) || prev.productName,
          productSku: invoiceData.biPartNumber || invoiceData.productSku || (invoiceData.items?.[0]?.sku) || prev.productSku,
          qty: invoiceData.skuCount || (invoiceData.items?.[0]?.qty) || prev.qty,
          shipmentValue: invoiceData.invoiceAmount || invoiceData.value || prev.shipmentValue,
        }));
        toast(`Invoice details fetched for ${invoiceNo}`, 'success');
      }
    } catch (err) {
      toast(err.message || 'Failed to fetch invoice details', 'error');
    } finally {
      setFetchingData(false);
    }
  };

  const setField = (k, v) => { 
    setForm(f => ({ ...f, [k]: v })); 
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' })); 
  };

  const validate = () => {
    const e = {};
    if (!form.mrId.trim()) e.mrId = 'Required';
    if (!form.supplier.trim()) e.supplier = 'Required';
    if (!form.productName.trim()) e.productName = 'Required';
    if (!form.courierPartner) e.courierPartner = 'Required';
    if (!form.awbLrNumber.trim()) e.awbLrNumber = 'Required';
    if (!form.sourceLocation.trim()) e.sourceLocation = 'Required';
    if (!form.destWarehouse.trim()) e.destWarehouse = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSuccess(form);
      // onClose is handled by onSuccess calling setShowCreate(false) in parent
    } catch (err) {
      toast(err.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputStyle = (err) => ({
    padding: '10px 12px', 
    border: err ? '1.5px solid #ef4444' : '1px solid #d1d5db',
    borderRadius: 8, 
    fontSize: 13, 
    width: '100%', 
    boxSizing: 'border-box'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 850, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{isEdit ? 'Edit Docket' : 'Create New Docket'}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{isEdit ? `Editing ${editData.docketId}` : 'Fill details to create a docket'}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, width: 36, height: 36, cursor: 'pointer' }}><MdClose size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px', flex: 1 }}>
          {fetchingData && (
            <div style={{ marginBottom: 16, padding: 12, background: '#dbeafe', borderRadius: 8, textAlign: 'center' }}>
              Fetching data from API...
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 3, height: 16, background: '#4f46e5' }} />
              <span style={{ fontSize: 10, fontWeight: 800 }}>BASIC INFORMATION</span>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Supplier *</label>
              <select 
                style={inputStyle(errors.supplier)} 
                value={form.supplier} 
                onChange={e => {
                  const selectedSupplier = e.target.value;
                  const matchingReturn = allReturns.find(r => r.supplierName === selectedSupplier);
                  if (matchingReturn) {
                    handleReturnSelect(matchingReturn.mrId);
                  } else {
                    setField('supplier', selectedSupplier);
                  }
                }}
              >
                <option value="">— Select Supplier —</option>
                {[...new Set(allReturns.map(r => r.supplierName))].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>MR ID *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  style={inputStyle(errors.mrId)} 
                  value={form.mrId} 
                  onChange={e => handleReturnSelect(e.target.value)}
                >
                  <option value="">— Select MR ID —</option>
                  {allReturns.map(r => (
                    <option key={r._id} value={r.mrId}>{r.mrId} ({r.supplierName})</option>
                  ))}
                </select>
                <button onClick={() => fetchReturnDetails(form.mrId)} style={{ padding: '0 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  <MdRefresh size={16} />
                </button>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Source Location *</label>
              <input style={inputStyle(errors.sourceLocation)} value={form.sourceLocation} onChange={e => setField('sourceLocation', e.target.value)} placeholder="Mumbai Plant" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Destination Warehouse *</label>
              <select 
                style={inputStyle(errors.destWarehouse)} 
                value={form.destWarehouse} 
                onChange={e => setField('destWarehouse', e.target.value)}
              >
                <option value="">— Select Warehouse —</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh.name || wh.warehouseName}>{wh.name || wh.warehouseName}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Invoice No</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={inputStyle()} value={form.invoiceNo} onChange={e => setField('invoiceNo', e.target.value)} placeholder="INV-2024-001" />
                <button onClick={() => fetchInvoiceDetails(form.invoiceNo)} style={{ padding: '0 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  <MdRefresh size={16} />
                </button>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Return Type</label>
              <select style={inputStyle()} value={form.returnType} onChange={e => setField('returnType', e.target.value)}>
                <option>Material Return</option><option>Sales Return</option>
                <option>Damage Return</option><option>Quality Return</option>
              </select>
            </div>
            
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 3, height: 16, background: '#059669' }} />
              <span style={{ fontSize: 10, fontWeight: 800 }}>PRODUCT DETAILS (Auto-fetched from API)</span>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Product Name *</label>
              <select 
                style={inputStyle(errors.productName)} 
                value={form.productName} 
                onChange={e => handleProductSelect(e.target.value)}
              >
                <option value="">— Select Product —</option>
                {[...new Set(allReturns.map(r => r.productName))].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Product SKU</label>
              <input style={inputStyle()} value={form.productSku} onChange={e => setField('productSku', e.target.value)} placeholder="HRC-5MM" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Quantity</label>
              <input type="number" style={inputStyle()} value={form.qty} onChange={e => setField('qty', e.target.value)} placeholder="10" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Shipment Value (₹)</label>
              <input type="number" style={inputStyle()} value={form.shipmentValue} onChange={e => setField('shipmentValue', e.target.value)} placeholder="850000" />
            </div>
            
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 3, height: 16, background: '#d97706' }} />
              <span style={{ fontSize: 10, fontWeight: 800 }}>TRANSPORT DETAILS (Logistics Integration)</span>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Courier Partner *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  style={inputStyle(errors.courierPartner)} 
                  value={form.courierPartner} 
                  onChange={async (e) => {
                    const cp = e.target.value;
                    setField('courierPartner', cp);
                    
                    // Auto-fetch logistics details if AWB is present
                    if (cp && form.awbLrNumber) {
                      setFetchingData(true);
                      try {
                        const res = await logisticsApi.trackCourier(form.awbLrNumber, cp);
                        if (res.data) {
                          setForm(f => ({
                            ...f,
                            vehicleNumber: res.data.vehicleNo || f.vehicleNumber,
                            driverName: res.data.driverName || f.driverName,
                            driverMobile: res.data.driverMobile || f.driverMobile,
                            estimatedDelivery: res.data.estimatedDelivery ? new Date(res.data.estimatedDelivery).toISOString().split('T')[0] : f.estimatedDelivery,
                            sourceLocation: res.data.origin || f.sourceLocation,
                            destWarehouse: res.data.destination || f.destWarehouse
                          }));
                          toast(`Dynamic logistics details fetched for ${cp}`, 'success');
                        }
                      } catch { console.error('Logistics auto-fetch failed'); }
                      finally { setFetchingData(false); }
                    }
                  }}
                >
                  <option value="">Select</option>
                  {/* Courier Partners from API if available, else static list */}
                  {[...new Set(shipments.map(s => s.courier))].filter(Boolean).map(c => <option key={c}>{c}</option>)}
                  <option>VRL Logistics</option><option>Delhivery</option>
                  <option>Blue Dart</option><option>DTDC</option><option>FedEx</option>
                  <option>Gati</option><option>XpressBees</option><option>Ecom Express</option>
                </select>
                <button 
                  onClick={async () => {
                    setFetchingData(true);
                    try {
                      const res = await logisticsApi.trackCourier(form.awbLrNumber, form.courierPartner);
                      if (res.data) {
                        setForm(f => ({
                          ...f,
                          vehicleNumber: res.data.vehicleNo || f.vehicleNumber,
                          driverName: res.data.driverName || f.driverName,
                          driverMobile: res.data.driverMobile || f.driverMobile,
                          estimatedDelivery: res.data.estimatedDelivery ? new Date(res.data.estimatedDelivery).toISOString().split('T')[0] : f.estimatedDelivery,
                          sourceLocation: res.data.origin || f.sourceLocation,
                          destWarehouse: res.data.destination || f.destWarehouse
                        }));
                        toast('Live logistics data synchronized', 'success');
                      }
                    } catch { toast('Logistics sync failed', 'error'); }
                    finally { setFetchingData(false); }
                  }}
                  disabled={!form.awbLrNumber || !form.courierPartner}
                  style={{ padding: '0 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: (!form.awbLrNumber || !form.courierPartner) ? 0.5 : 1 }}
                >
                  <MdRefresh size={16} />
                </button>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>AWB/LR Number *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  style={inputStyle(errors.awbLrNumber)} 
                  value={form.awbLrNumber} 
                  onChange={e => {
                    const awb = e.target.value;
                    const shipment = shipments.find(s => s.awbNo === awb);
                    if (shipment) {
                      setForm(f => ({
                        ...f,
                        awbLrNumber: awb,
                        courierPartner: shipment.courier || f.courierPartner,
                        driverName: shipment.driverName || f.driverName,
                        driverMobile: shipment.driverMobile || f.driverMobile,
                        vehicleNumber: shipment.vehicleNo || f.vehicleNumber,
                        estimatedDelivery: shipment.eta ? new Date(shipment.eta).toISOString().split('T')[0] : f.estimatedDelivery,
                        sourceLocation: shipment.origin || f.sourceLocation,
                        destWarehouse: shipment.destination || f.destWarehouse
                      }));
                      toast(`Linked with Logistics AWB: ${awb}`, 'success');
                    } else {
                      setField('awbLrNumber', awb);
                    }
                  }}
                >
                  <option value="">— Select AWB —</option>
                  {shipments.map(s => (
                    <option key={s._id} value={s.awbNo}>{s.awbNo} ({s.courier})</option>
                  ))}
                  {form.awbLrNumber && !shipments.some(s => s.awbNo === form.awbLrNumber) && (
                    <option value={form.awbLrNumber}>{form.awbLrNumber}</option>
                  )}
                </select>
              </div>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Vehicle Number</label>
              <select 
                style={inputStyle()} 
                value={form.vehicleNumber} 
                onChange={e => handleVehicleSelect(e.target.value)}
              >
                <option value="">— Select Vehicle —</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v.number}>{v.number} ({v.type})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Priority</label>
              <select style={inputStyle()} value={form.priority} onChange={e => setField('priority', e.target.value)}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Driver Name</label>
              <input style={inputStyle()} value={form.driverName} onChange={e => setField('driverName', e.target.value)} placeholder="Driver name" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Driver Mobile</label>
              <input style={inputStyle()} value={form.driverMobile} onChange={e => setField('driverMobile', e.target.value)} placeholder="9876543210" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Shipment Weight (kg)</label>
              <input type="number" style={inputStyle()} value={form.shipmentWeight} onChange={e => setField('shipmentWeight', e.target.value)} placeholder="1200" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Packages Count</label>
              <input type="number" style={inputStyle()} value={form.packagesCount} onChange={e => setField('packagesCount', e.target.value)} placeholder="4" />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Transport Cost (₹)</label>
              <input type="number" style={inputStyle()} value={form.transportCost} onChange={e => setField('transportCost', e.target.value)} placeholder="8500" />
            </div>
            
            <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{ width: 3, height: 16, background: '#7c3aed' }} />
              <span style={{ fontSize: 10, fontWeight: 800 }}>SCHEDULE & ASSIGNMENT</span>
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Estimated Delivery</label>
              <input type="date" style={inputStyle()} value={form.estimatedDelivery} onChange={e => setField('estimatedDelivery', e.target.value)} />
            </div>
            
            <div>
              <label style={{ fontSize: 11, fontWeight: 700 }}>Assigned Team</label>
              <select style={inputStyle()} value={form.assignedTeam} onChange={e => setField('assignedTeam', e.target.value)}>
                <option value="">Select</option>
                <option>Logistics-A</option><option>Logistics-B</option>
                <option>QC-Team-1</option><option>Finance-Team</option>
                <option>Warehouse-A</option><option>Warehouse-B</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 22px', border: '1px solid #d1d5db', borderRadius: 9, background: '#fff', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || fetchingData} style={{ padding: '9px 24px', border: 'none', borderRadius: 9, background: isEdit ? '#15803d' : '#4f46e5', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (loading || fetchingData) ? 0.7 : 1 }}>
            {loading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// VIEW DOCKET MODAL
// ============================================
const ViewModal = ({ isOpen, onClose, docket }) => {
  if (!isOpen || !docket) return null;

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #f3f4f6' }}>
      <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 750, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5' }}>{docket.docketId}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>MR: {docket.mrId} | Invoice: {docket.invoiceNo || '—'}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, width: 36, height: 36, cursor: 'pointer' }}><MdClose size={18} /></button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
            <InfoRow label="Return Type" value={<ReturnTypeBadge type={docket.returnType} />} />
            <InfoRow label="Supplier" value={docket.supplier} />
            <InfoRow label="Source Location" value={docket.sourceLocation} />
            <InfoRow label="Destination Warehouse" value={docket.destWarehouse} />
            <InfoRow label="Product" value={docket.productName} />
            <InfoRow label="SKU" value={docket.productSku} />
            <InfoRow label="Quantity" value={docket.qty} />
            <InfoRow label="Shipment Value" value={`₹${Number(docket.shipmentValue).toLocaleString('en-IN')}`} />
            <InfoRow label="Courier Partner" value={docket.courierPartner} />
            <InfoRow label="AWB/LR Number" value={docket.awbLrNumber} />
            <InfoRow label="Vehicle Number" value={docket.vehicleNumber || '—'} />
            <InfoRow label="Driver" value={docket.driverName || '—'} />
            <InfoRow label="Driver Mobile" value={docket.driverMobile || '—'} />
            <InfoRow label="Transport Status" value={<StatusBadge status={docket.transportStatus} />} />
            <InfoRow label="Priority" value={<PriorityBadge priority={docket.priority} />} />
            <InfoRow label="Warehouse Status" value={<WhBadge status={docket.warehouseStatus} />} />
            <InfoRow label="QC Status" value={<QcBadge status={docket.qcStatus} />} />
            <InfoRow label="Finance Status" value={<FinBadge status={docket.financeStatus} />} />
            <InfoRow label="Assigned Team" value={docket.assignedTeam} />
            <InfoRow label="ETA" value={docket.estimatedDelivery ? new Date(docket.estimatedDelivery).toLocaleDateString('en-IN') : '—'} />
            <InfoRow label="Aging" value={`${docket.aging} days`} />
            <InfoRow label="Shipment Weight" value={`${docket.shipmentWeight || 0} kg`} />
            <InfoRow label="Packages" value={docket.packagesCount || 0} />
            <InfoRow label="Transport Cost" value={`₹${Number(docket.transportCost || 0).toLocaleString('en-IN')}`} />
          </div>
          {docket.delayReason && (
            <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, color: '#b91c1c' }}>⚠ Delay Reason</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>{docket.delayReason}</div>
            </div>
          )}
          {docket.trackingHistory && docket.trackingHistory.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>📍 Live Tracking History</div>
              {docket.trackingHistory.map((ev, i) => (
                <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: '0.5px solid #e2e8f0' }}>
                  {ev.timestamp && new Date(ev.timestamp).toLocaleString()} - {ev.location} - {ev.status}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', border: 'none', borderRadius: 8, background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// EXPANDED ROW
// ============================================
const ExpandedRow = ({ row, colSpan }) => {
  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #f3f4f6' }}>
      <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );

  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0, background: '#f8f9fc' }}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>🚚 Transport Details</div>
              <InfoRow label="Driver" value={row.driverName} />
              <InfoRow label="Mobile" value={row.driverMobile} />
              <InfoRow label="Vehicle" value={row.vehicleNumber} />
              <InfoRow label="Weight" value={`${row.shipmentWeight || 0} kg`} />
              <InfoRow label="Packages" value={row.packagesCount || 0} />
              <InfoRow label="Transport Cost" value={`₹${Number(row.transportCost || 0).toLocaleString('en-IN')}`} />
              <InfoRow label="Courier" value={row.courierPartner} />
              <InfoRow label="AWB/LR" value={row.awbLrNumber} />
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>📊 Warehouse & QC Status</div>
              <InfoRow label="Warehouse" value={<WhBadge status={row.warehouseStatus} />} />
              <InfoRow label="QC Status" value={<QcBadge status={row.qcStatus} />} />
              <InfoRow label="Finance Status" value={<FinBadge status={row.financeStatus} />} />
              <InfoRow label="POD Status" value={row.podStatus === 'verified' ? '✓ Verified' : '⏳ Pending'} />
              <InfoRow label="Assigned Team" value={row.assignedTeam} />
              <InfoRow label="Last Scan Location" value={row.lastScanLocation || '—'} />
              <InfoRow label="Last Scan Time" value={row.lastScanTime ? new Date(row.lastScanTime).toLocaleString() : '—'} />
            </div>
            <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>📎 Additional Details</div>
              <InfoRow label="Invoice No" value={row.invoiceNo || '—'} />
              <InfoRow label="Created Date" value={new Date(row.lastActivity).toLocaleDateString()} />
              <InfoRow label="Aging" value={`${row.aging} days`} />
              <InfoRow label="Destination Warehouse" value={row.destWarehouse} />
              <InfoRow label="Source Location" value={row.sourceLocation} />
              {row.delayReason && (
                <div style={{ marginTop: 8, padding: 8, background: '#fee2e2', borderRadius: 8, fontSize: 11 }}>
                  ⚠ Delay: {row.delayReason}
                </div>
              )}
            </div>
          </div>
          {row.trackingHistory && row.trackingHistory.length > 0 && (
            <div style={{ marginTop: 16, background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 12 }}>📍 Live Tracking Timeline</div>
              {row.trackingHistory.map((ev, i) => {
                const cfg = STATUS_CONFIG[ev.status] || { label: ev.status, color: '#9ca3af' };
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{cfg.label}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{ev.location} • {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}</div>
                      {ev.remarks && <div style={{ fontSize: 10, color: '#6b7280' }}>{ev.remarks}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

// ============================================
// MAIN DOCKET TRACKING PAGE
// ============================================
const DocketTrackingPage = () => {
  const [dockets, setDockets] = useState([]);
  const [returns, setReturns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all', courier: 'all', priority: 'all', delayed: false });
  const [showCreate, setShowCreate] = useState(false);
  const [editDocket, setEditDocket] = useState(null);
  const [viewDocket, setViewDocket] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [toastMsg, setToastMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToastMsg({ message, type, key: Date.now() });
  }, []);

  const normalizeStage = (rawStage) => {
    if (!rawStage) return '';
    return String(rawStage).trim().replace(/\s+/g, '_').toUpperCase();
  };

  const TRACKED_DOCKET_STAGES = new Set([
    'APPROVED',
    'DOCKET_CREATED',
    'DOCKET_CREATE',
    'VEHICLE_ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'ARRIVED_AT_WAREHOUSE',
    'RECEIVED',
    'TRANSPORT_TRACKING'
  ]);

  // Load returns from API
  const loadReturns = async () => {
    try {
      const response = await materialReturnApi.getAll();
      const data = response.data || [];
      setReturns(data);
      return data;
    } catch (err) {
      console.error('Failed to load returns:', err);
      return [];
    }
  };

  // Load invoices from API
  const loadInvoices = async () => {
    try {
      const response = await invoiceApi.getAll({ limit: 200 });
      const data = response.data || [];
      setInvoices(data);
      return data;
    } catch (err) {
      console.error('Failed to load invoices:', err);
      return [];
    }
  };

  // Load dockets from API
  const loadDockets = async () => {
    setLoading(true);
    try {
      const returnsData = await loadReturns();
      console.log('Returns Data for Dockets:', returnsData);
      const mappedDockets = returnsData
        .map(ret => {
          const currentStage = normalizeStage(ret.currentStage || ret.stage || ret.currentWorkflowStage);
          return { ret, currentStage };
        })
        .filter(item => TRACKED_DOCKET_STAGES.has(item.currentStage))
        .map(({ ret, currentStage }, idx) => {
          const stage = currentStage;
          let transportStatus = 'pickup_pending';
          if (stage === 'PICKED_UP' || stage === 'IN_TRANSIT') transportStatus = 'in_transit';
          if (stage === 'ARRIVED_AT_WAREHOUSE' || stage === 'RECEIVED') transportStatus = 'received';

          return {
            id: ret._id,
            docketId: ret.docketId || `DKT-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
            mrId: ret.mrId,
            invoiceNo: ret.invoiceNo || '',
            returnType: ret.returnType || 'Material Return',
            supplier: ret.customerName || ret.supplierName || 'Unknown Supplier',
            sourceLocation: ret.pickupAddress || ret.address || 'Supplier Location',
            destWarehouse: ret.warehouseName || 'Main Warehouse',
            productName: ret.productName || 'Product',
            productSku: ret.productSku || ret.skuCode || '',
            qty: ret.returnQty || 1,
            shipmentValue: ret.value || 0,
            courierPartner: ret.transport || 'VRL Logistics',
            vehicleNumber: ret.vehicleNo || '',
            awbLrNumber: ret.awbNo || `AWB-${String(Date.now()).slice(-6)}`,
            transportStatus,
            lastScanLocation: ret.currentLocation || 'Not scanned',
            lastScanTime: ret.updatedAt,
            estimatedDelivery: ret.estimatedDelivery || new Date(Date.now() + 86400000 * 3).toISOString(),
            aging: Math.floor((Date.now() - new Date(ret.createdAt).getTime()) / 86400000),
            warehouseStatus: (stage === 'ARRIVED_AT_WAREHOUSE' || stage === 'RECEIVED') ? 'Received' : 'Awaited',
            qcStatus: ['QC_PASSED', 'QC_FAILED', 'CLOSED'].includes(stage) ? 'Completed' : 'Pending',
            financeStatus: ret.creditNoteNo ? 'Credit Note Issued' : 'Not Initiated',
            assignedTeam: ret.assignedTeam || 'Logistics Team',
            lastActivity: ret.updatedAt,
            isDelayed: false,
            priority: ret.priority || 'Medium',
            driverName: ret.driverName || '',
            driverMobile: ret.driverMobile || '',
            shipmentWeight: ret.shipmentWeight || 0,
            packagesCount: ret.packagesCount || 1,
            transportCost: ret.transportCost || 0,
            podStatus: 'pending',
            actualDeliveryDate: null,
            delayReason: null,
            attachments: [],
            trackingHistory: ret.stageTimeline || [],
            currentStage: stage,
          };
        });
      console.log('Mapped Dockets:', mappedDockets);
      setDockets(mappedDockets);
    } catch (err) {
      console.error('Failed to load dockets:', err);
      showToast('Error loading docket data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDockets();
    loadInvoices();
  }, []);

  const stats = useMemo(() => ({
    total: dockets.length,
    inTransit: dockets.filter(d => d.transportStatus === 'in_transit').length,
    delayed: dockets.filter(d => d.isDelayed).length,
    delivered: dockets.filter(d => d.transportStatus === 'delivered').length,
    pending: dockets.filter(d => d.transportStatus === 'pickup_pending').length,
  }), [dockets]);

  const filtered = useMemo(() => dockets.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      (d.docketId || '').toLowerCase().includes(searchLower) ||
      (d.mrId || '').toLowerCase().includes(searchLower) ||
      (d.awbLrNumber || '').toLowerCase().includes(searchLower) ||
      (d.supplier || '').toLowerCase().includes(searchLower) ||
      (d.productName || '').toLowerCase().includes(searchLower) ||
      (d.invoiceNo || '').toLowerCase().includes(searchLower);
    const matchesStatus = filters.status === 'all' || d.transportStatus === filters.status;
    const matchesCourier = filters.courier === 'all' || d.courierPartner === filters.courier;
    const matchesPriority = filters.priority === 'all' || (d.priority || '').toLowerCase() === filters.priority.toLowerCase();
    const matchesDelayed = !filters.delayed || d.isDelayed;
    return matchesSearch && matchesStatus && matchesCourier && matchesPriority && matchesDelayed;
  }), [dockets, searchTerm, filters]);

  const toggleExpand = (id) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedRows(newSet);
  };

  const handleCreate = async (formData) => {
    setLoading(true);
    try {
      // Find return request from 'returns' state
      let returnRequest = returns.find(r => r.mrId === formData.mrId);
      if (!returnRequest) {
        // Fallback: fetch returns again if state is empty
        const freshReturns = await loadReturns();
        const found = freshReturns.find(r => r.mrId === formData.mrId);
        if (!found) throw new Error(`Return request ${formData.mrId} not found`);
        returnRequest = found;
      }

      const payload = {
        vehicleNo: formData.vehicleNumber,
        driverName: formData.driverName,
        driverMobile: formData.driverMobile,
        trackingStatus: 'pickup_pending',
        currentLocation: formData.sourceLocation,
        awbNo: formData.awbLrNumber,
        transport: formData.courierPartner,
        destWarehouse: formData.destWarehouse,
        priority: formData.priority,
        shipmentWeight: formData.shipmentWeight,
        packagesCount: formData.packagesCount,
        transportCost: formData.transportCost,
        estimatedDelivery: formData.estimatedDelivery,
        assignedTeam: formData.assignedTeam,
        stage: 'VEHICLE_ASSIGNED'
      };

      await materialReturnApi.updateTransport(returnRequest._id, payload);

      showToast('New docket created and synchronized', 'success');
      setShowCreate(false);
      
      // Reload dockets to reflect changes
      loadDockets();
      
    } catch (err) {
      showToast(err.message || 'Failed to create docket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (formData) => {
    if (!editDocket) return;
    setLoading(true);
    try {
      const payload = {
        vehicleNo: formData.vehicleNumber,
        driverName: formData.driverName,
        driverMobile: formData.driverMobile,
        awbNo: formData.awbLrNumber,
        transport: formData.courierPartner,
        destWarehouse: formData.destWarehouse,
        currentLocation: formData.sourceLocation,
        priority: formData.priority,
        shipmentWeight: formData.shipmentWeight,
        packagesCount: formData.packagesCount,
        transportCost: formData.transportCost,
        estimatedDelivery: formData.estimatedDelivery,
        assignedTeam: formData.assignedTeam,
      };

      await materialReturnApi.updateTransport(editDocket.id, payload);
      showToast('Docket updated successfully', 'success');
      setEditDocket(null);
      loadDockets();
    } catch (err) {
      showToast(err.message || 'Failed to update docket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this docket? This will remove transport info.')) return;
    setLoading(true);
    try {
      await materialReturnApi.updateTransport(id, {
        vehicleNo: '', driverName: '', driverMobile: '', awbNo: '', transport: '', currentLocation: '',
        stage: 'APPROVED'
      });
      
      showToast('Docket removed and return reset to Approved stage', 'success');
      setConfirmDelete(null);
      setTimeout(() => { loadDockets(); }, 300);
    } catch (err) {
      showToast(err.message || 'Failed to delete docket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    loadDockets();
    toast('Data refreshed from server', 'info');
  };

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const TABLE_COLUMNS = ['', 'Docket ID', 'MR ID', 'Invoice', 'Return Type', 'Supplier', 'Source', 'Dest WH', 'Product/SKU', 'Qty', 'Value', 'Courier', 'AWB', 'Stage', 'Live Status', 'ETA', 'Aging', 'WH', 'QC', 'Finance', 'Team', 'Actions'];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: 24, background: '#f2f4f8', minHeight: '100vh' }}>
      {toastMsg && <ToastMessage key={toastMsg.key} message={toastMsg.message} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      {confirmDelete && <ConfirmDialog message={`Delete ${confirmDelete.docketId}?`} onConfirm={() => handleDelete(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>📦 Docket Tracking</h1>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>Complete shipment tracking with dynamic API integration for MR, Invoice, Product & Transport details</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Total Dockets</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.total}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>In Transit</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.inTransit}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Delayed</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.delayed}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Delivered</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.delivered}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Pending Pickup</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{stats.pending}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <MdSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            style={{ width: '100%', padding: '8px 10px 8px 34px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} 
            placeholder="Search by Docket, MR, Invoice, Supplier, Product..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <select style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="all">All Status</option>
          <option value="pickup_pending">Pickup Pending</option>
          <option value="picked_up">Picked Up</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="delayed">Delayed</option>
        </select>
        <select style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }} value={filters.courier} onChange={e => setFilter('courier', e.target.value)}>
          <option value="all">All Couriers</option>
          <option>VRL Logistics</option><option>Delhivery</option>
          <option>Blue Dart</option><option>DTDC</option><option>FedEx</option>
          <option>Gati</option><option>XpressBees</option>
        </select>
        <select style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }} value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="all">All Priority</option>
          <option value="critical">Critical</option><option value="high">High</option>
          <option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={filters.delayed} onChange={e => setFilter('delayed', e.target.checked)} /> Delayed Only
        </label>
        <button onClick={resetData} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <MdRefresh /> Reset
        </button>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer' }}>
          <MdAdd /> Create Docket
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1800 }}>
            <thead>
              <tr style={{ background: '#f8f9fc', borderBottom: '1.5px solid #eef0f5' }}>
                {TABLE_COLUMNS.map(col => (
                  <th key={col} style={{ padding: '12px 10px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#6b7280' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={22} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Loading dockets...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={22} style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>No dockets found</td>
                </tr>
              ) : (
                filtered.map(row => (
                  <React.Fragment key={row.id}>
                    <tr style={{ borderBottom: '1px solid #f5f6fa' }} onMouseEnter={e => e.currentTarget.style.background = '#f9faff'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 10px' }}>
                        <button onClick={() => toggleExpand(row.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                          {expandedRows.has(row.id) ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                        </button>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 800, color: '#4f46e5' }}>{row.docketId}</div>
                        {row.isDelayed && <div style={{ fontSize: 9, color: '#b91c1c' }}>⚠ DELAYED</div>}
                      </td>
                      <td style={{ padding: '12px 10px' }}><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.mrId}</span></td>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontSize: 11 }}>{row.invoiceNo || '—'}</td>
                      <td style={{ padding: '12px 10px' }}><ReturnTypeBadge type={row.returnType} /></td>
                      <td style={{ padding: '12px 10px' }}>{row.supplier?.substring(0, 20)}</td>
                      <td style={{ padding: '12px 10px' }}>{row.sourceLocation?.substring(0, 15)}</td>
                      <td style={{ padding: '12px 10px' }}>{row.destWarehouse}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <div>{row.productName?.substring(0, 15)}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{row.productSku}</div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>{row.qty}</td>
                      <td style={{ padding: '12px 10px' }}>₹{Number(row.shipmentValue || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 10px' }}>{row.courierPartner}</td>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: '#1d4ed8', fontSize: 11 }}>{row.awbLrNumber}</td>
                      <td style={{ padding: '12px 10px' }}><StatusBadge status={row.transportStatus} /></td>
                      <td style={{ padding: '12px 10px' }}>
                        <div>{row.lastScanLocation || 'Not scanned'}</div>
                        {row.lastScanTime && <div style={{ fontSize: 10, color: '#9ca3af' }}>{new Date(row.lastScanTime).toLocaleDateString()}</div>}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ color: row.isDelayed ? '#b91c1c' : '#374151' }}>
                          {row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: row.aging > 7 ? '#b91c1c' : row.aging > 4 ? '#d97706' : '#374151' }}>
                          {row.aging}d
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px' }}><WhBadge status={row.warehouseStatus} /></td>
                      <td style={{ padding: '12px 10px' }}><QcBadge status={row.qcStatus} /></td>
                      <td style={{ padding: '12px 10px' }}><FinBadge status={row.financeStatus} /></td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>{row.assignedTeam || '—'}</span>
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setViewDocket(row)} style={{ padding: 6, border: 'none', background: '#dbeafe', borderRadius: 6, cursor: 'pointer' }}>
                            <MdVisibility size={14} />
                          </button>
                          <button onClick={() => setEditDocket(row)} style={{ padding: 6, border: 'none', background: '#dcfce7', borderRadius: 6, cursor: 'pointer' }}>
                            <MdEdit size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(row)} style={{ padding: 6, border: 'none', background: '#fee2e2', borderRadius: 6, cursor: 'pointer' }}>
                            <MdDelete size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(row.id) && <ExpandedRow row={row} colSpan={22} />}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DocketModal 
        isOpen={showCreate} 
        onClose={() => setShowCreate(false)} 
        onSuccess={handleCreate} 
        editData={null}
        returnsList={returns}
        invoicesList={invoices}
      />
      <DocketModal 
        isOpen={!!editDocket} 
        onClose={() => setEditDocket(null)} 
        onSuccess={handleEdit} 
        editData={editDocket}
        returnsList={returns}
        invoicesList={invoices}
      />
      <ViewModal isOpen={!!viewDocket} onClose={() => setViewDocket(null)} docket={viewDocket} />
    </div>
  );
};

export default DocketTrackingPage;