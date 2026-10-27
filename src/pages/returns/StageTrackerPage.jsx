import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdVisibility, MdClose, MdCheckCircle, MdAccessTime,
  MdLocalShipping, MdInventory, MdVerifiedUser, MdDescription, MdRefresh,
  MdLayers, MdLoop, MdTag, MdApproval, MdWarehouse, MdSearch,
  MdDownload, MdPerson, MdAttachFile, MdArrowForward,
  MdBolt, MdCurrencyRupee, MdBarChart,
  MdError, MdCheckCircleOutline, MdInfoOutline, MdFactCheck
} from 'react-icons/md';
import { materialReturnApi } from '../../api/materialReturnApi';
import { invoiceApi } from '../../api/invoiceApi';
import { logisticsApi } from '../../api/logisticsApi';
import { toast } from '../../components/common/Toast';

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, footer, size = 'lg' }) {
  if (!open) return null;
  const widths = { sm: 480, md: 640, lg: 780, xl: 980 };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: widths[size], maxHeight: '94vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <MdClose size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RETURN_STAGES = [
  { key: 'REQUEST_RAISED',          Icon: MdAdd,             label: 'Request Raised' },
  { key: 'APPROVED',                Icon: MdCheckCircle,     label: 'Approved' },
  { key: 'DOCKET_CREATED',          Icon: MdDescription,     label: 'Docket Created' },
  { key: 'VEHICLE_ASSIGNED',        Icon: MdLocalShipping,   label: 'Vehicle Assigned' },
  { key: 'PICKED_UP',               Icon: MdLocalShipping,   label: 'Picked Up' },
  { key: 'IN_TRANSIT',              Icon: MdLocalShipping,   label: 'In Transit' },
  { key: 'ARRIVED_AT_WAREHOUSE',    Icon: MdWarehouse,       label: 'Arrived at Warehouse' },
  { key: 'RECEIVED',                Icon: MdCheckCircle,     label: 'Received' },
  { key: 'QC_PENDING',              Icon: MdFactCheck || MdVerifiedUser, label: 'QC Pending' },
  { key: 'QC_PASSED',               Icon: MdCheckCircle,     label: 'QC Passed' },
  { key: 'QC_FAILED',               Icon: MdError,           label: 'QC Failed' },
  { key: 'FINANCE_PENDING',         Icon: MdCurrencyRupee,   label: 'Finance Pending' },
  { key: 'CLOSED',                  Icon: MdCheckCircle,     label: 'Closed' },
];

const STAGE_BADGE = {
  REQUEST_RAISED: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-green-100 text-green-700',
  DOCKET_CREATED: 'bg-blue-100 text-blue-700',
  VEHICLE_ASSIGNED: 'bg-purple-100 text-purple-700',
  PICKED_UP: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  ARRIVED_AT_WAREHOUSE: 'bg-emerald-100 text-emerald-700',
  RECEIVED: 'bg-green-100 text-green-700',
  QC_PENDING: 'bg-orange-100 text-orange-700',
  QC_PASSED: 'bg-green-100 text-green-700',
  QC_FAILED: 'bg-red-100 text-red-700',
  FINANCE_PENDING: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const PRIORITY_BADGE = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-green-100 text-green-700',
  Critical: 'bg-red-700 text-white',
};

const LEGACY_STAGE_MAP = {
  Initiated: 'Return_Request_Create',
  Approved: 'Manager_Approval',
  Transport_Pickup: 'Docket_Create',
  In_Transit: 'Transport_Tracking',
  Out_For_Delivery: 'Transport_Tracking',
  Delivered: 'Warehouse_Receive',
  Warehouse_Queue: 'Warehouse_Receive',
  Received_At_Warehouse: 'Warehouse_Receive',
  QC_In_Progress: 'QC_Verification',
  QC_Completed: 'Finance_Reconciliation',
};

const FIELD_SOURCE = {
  mrId:            {          },
  returnType:      {                },
  supplierName:    {  },
  invoiceNo:       {          },
  skuCount:        {    },
  returnQty:       {                },
  value:           {   },
  stage:           {      },
  transportStatus: {    },
  warehouseStatus: {    },
  qcStatus:        {           },
  financeStatus:   {       },
  aging:           {     },
  priority:        {       },
  assignedTo:      {       },
  lastUpdated:     {      },
};

// ─── Sample Data ──────────────────────────────────────────────────────────────
// ─── SAMPLE_RETURNS removed — page shows empty state when API returns no data ──



// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function workflowAssignee(stage) {
  const map = {
    REQUEST_RAISED: 'Returns Desk',
    APPROVED: 'Logistics',
    DOCKET_CREATED: 'Logistics',
    VEHICLE_ASSIGNED: 'Logistics',
    PICKED_UP: 'Logistics',
    IN_TRANSIT: 'Transport',
    ARRIVED_AT_WAREHOUSE: 'Warehouse',
    RECEIVED: 'Warehouse',
    QC_PENDING: 'QC Team',
    QC_PASSED: 'Inventory',
    QC_FAILED: 'Returns Desk',
    FINANCE_PENDING: 'Accounts',
    CLOSED: 'System',
  };
  return map[stage] || 'Workflow Engine';
}

function normalizeReturn(r) {
  const stage = r.currentStage || r.stage || 'REQUEST_RAISED';
  const itemList = Array.isArray(r.items) ? r.items : [];
  const skuCount = Number(r.skuCount || itemList.length || 0);
  const value = Number(r.value || r.refundAmount || itemList.reduce((s, i) => s + Number(i.total || 0), 0));
  
  return {
    ...r,
    _id: r._id || r.id || r.mrId,
    mrId: r.mrId || r.returnRequestId || `MR-NEW-${Date.now()}`,
    returnType: r.returnType || r.reason || 'Material Return',
    supplierName: r.supplierName || r.customerName || '',
    supplierType: r.supplierType || r.SupplierType || '',
    contactNumber: r.contactNumber || r.mobileNumber || '',
    email: r.email || r.supplierEmail || '',
    address: r.address || r.supplierAddress || '',
    invoiceNo: r.invoiceNo || '',
    invoiceAmount: Number(r.invoiceAmount || r.value || 0),
    value, 
    skuCount,
    returnQty: Number(r.returnQty || r.expectedQty || 0),
    stage,
    transportStatus: r.transportStatus || 'Pending',
    warehouseStatus: r.warehouseStatus || 'Pending',
    qcStatus: r.qcStatus || 'Pending',
    financeStatus: r.financeStatus || 'Pending',
    aging: Number.isFinite(Number(r.aging)) ? Number(r.aging) : daysSince(r.createdAt || r.createdDate),
    priority: r.priority || 'Medium',
    assignedTo: r.assignedTo || workflowAssignee(stage),
    lastUpdated: timeAgo(r.updatedAt || r.lastUpdated),
    createdAt: r.createdAt || r.returnDate,
    createdBy: r.createdBy || r.requestedBy || 'System',
    items: itemList,
    creditNoteId: r.creditNoteId || null,
    debitNoteId: r.debitNoteId || null,
    gstAdjustment: r.gstAdjustment || 'Pending',
    tallySync: r.tallySync || 'Pending',
    reconciliation: r.reconciliation || 'Open',
  };
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Pill({ label, className = '' }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}

function SectionBox({ title, icon, color = 'blue', children, headerRight }) {
  const colorMap = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold">{icon}{title}</div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="text-gray-800">{children}</div>
    </div>
  );
}

// Input styles
const inp     = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 transition-all';
const inpAuto = 'w-full px-3 py-2 border border-blue-100 rounded-lg text-sm outline-none bg-blue-50 text-blue-800 cursor-default select-none';
const lbl     = 'text-xs font-semibold text-gray-600 mb-1 block';
const lblAuto = 'text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1';

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return <MdRefresh className="animate-spin text-red-500" style={{ width: size, height: size }} />;
}

// ─── Financial Status Modal ───────────────────────────────────────────────────
function FinancialStatusModal({ open, onClose, record }) {
  if (!open || !record) return null;
  return (
    <Modal
      open={open} onClose={onClose}
      title="Financial Status Details" size="lg"
      footer={
        <div className="flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 text-white rounded-lg text-sm font-bold">
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
            <MdCurrencyRupee className="w-4 h-4" /> Financial Overview
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['MR ID', record.mrId],
              ['Invoice No.', record.invoiceNo],
              ['Supplier', record.supplierName],
              ['Return Amount', `₹${(record.value || 0).toLocaleString('en-IN')}`],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-500">{k}:</span>
                <span className="font-semibold ml-1">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[{ title: 'Credit Note', id: record.creditNoteId }, { title: 'Debit Note', id: record.debitNoteId }].map(({ title, id }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-xl p-4">
              <h5 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
                <MdDescription className="w-4 h-4" />{title}
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${id ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {id ? 'Generated' : 'Not Generated'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID:</span>
                  <span className="font-semibold">{id || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h5 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
              <MdVerifiedUser className="w-4 h-4" />GST Adjustment
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.gstAdjustment === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {record.gstAdjustment || 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">GST Amt:</span>
                <span className="font-semibold">₹{Math.round((record.value || 0) * 0.18).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h5 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2">
              <MdRefresh className="w-4 h-4" />Tally Sync
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${record.tallySync === 'Synced' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                  {record.tallySync || 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Sync:</span>
                <span className="font-semibold">{record.tallySync === 'Synced' ? 'Today' : 'Not synced'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h5 className="font-bold text-gray-800 mb-3 text-sm">Reconciliation Summary</h5>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-black text-blue-600">₹{(record.invoiceAmount || 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-gray-500 mt-1">Invoice Amount</div>
            </div>
            <div>
              <div className="text-xl font-black text-red-600">₹{(record.value || 0).toLocaleString('en-IN')}</div>
              <div className="text-xs text-gray-500 mt-1">Return Amount</div>
            </div>
            <div>
              <div className="text-xl font-black text-green-600">₹{((record.invoiceAmount || 0) - (record.value || 0)).toLocaleString('en-IN')}</div>
              <div className="text-xs text-gray-500 mt-1">Net Payable</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Stage Progress Bar ───────────────────────────────────────────────────────
function StageProgressBar({ currentStage }) {
  const idx = Math.max(0, RETURN_STAGES.findIndex(s => s.key === currentStage));
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-start" style={{ minWidth: 'max-content' }}>
        {RETURN_STAGES.map((stage, i) => {
          const done   = i < idx;
          const active = i === idx;
          const StageIcon = stage.Icon;
          return (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center" style={{ width: 72 }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all relative
                  ${done   ? 'bg-green-500 border-green-500 text-white'
                  : active ? 'bg-red-600 border-red-600 text-white'
                  :          'border-gray-200 text-gray-300 bg-white'}`}>
                  {done ? <MdCheckCircle className="w-5 h-5" /> : <StageIcon className="w-4 h-4" />}
                  {stage.auto && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <MdBolt className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <div className={`mt-1.5 text-[10px] font-semibold text-center leading-tight
                  ${active ? 'text-red-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  {stage.label}
                </div>
                {stage.auto && <div className="text-[9px] text-blue-500 font-medium text-center mt-0.5">auto</div>}
              </div>
              {i < RETURN_STAGES.length - 1 && (
                <div className={`h-0.5 w-8 flex-shrink-0 rounded-full mb-6 ${i < idx ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FETCH STATUS STATES ──────────────────────────────────────────────────────
// idle | loading | success | error
const FETCH_STATUS = { IDLE: 'idle', LOADING: 'loading', SUCCESS: 'success', ERROR: 'error' };

// ─── Create Return Modal ──────────────────────────────────────────────────────
function CreateReturnModal({ open, onClose, onSave, saving, invoices = [] }) {

  const BLANK_FORM = {
    // User fields
    invoiceNo:    '',
    returnType:   'Material Return',
    priority:     'Medium',
    returnQty:    '',
    reason:       '',
    attachments:  [],

    // Auto-fetched from Invoice API (Stage 2–3) — read-only
    supplierName:    '',
    supplierType:    '',
    contactNumber:   '',
    email:           '',
    address:         '',        // supplier / pickup address
    productName:     '',
    skuCount:        '',
    value:           '',
    invoiceAmount:   '',
    invoiceItems:    [],        // line items from invoice for display

    // Transport — partially auto-filled from Invoice API, partially user input
    transport:       '',        // user may enter courier name
    awbNo:           '',        // auto from invoice if present, else user
    pickupAddress:   '',        // auto from vendor master, else user

    // Transport API tracking info (auto, read-only)
    docketNo:        '',
    estimatedPickup: '',
    logisticsPartner: '',
  };

  const [form,        setForm]        = useState(BLANK_FORM);
  const [fetchStatus, setFetchStatus] = useState(FETCH_STATUS.IDLE);   // for Invoice API fetch
  const [fetchError,  setFetchError]  = useState('');
  const [transportFetchStatus, setTransportFetchStatus] = useState(FETCH_STATUS.IDLE);
  const [couriers, setCouriers] = useState([]);
  const [shipments, setShipments] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Transport API fetch ──────────────────────────────────────────────────
  const runTransportFetch = useCallback(async (trackingRef, courierName) => {
    if (!trackingRef?.trim() || trackingRef === 'Manual') return;
    setTransportFetchStatus(FETCH_STATUS.LOADING);
    try {
      const res = await logisticsApi.trackCourier(trackingRef, courierName);
      const transportData = res?.data || {};
      
      setForm(f => ({
        ...f,
        docketNo:         transportData.awbNo            || transportData.docketNo || transportData.shipmentId || f.docketNo,
        estimatedPickup:  transportData.estimatedDelivery || transportData.estimatedPickup || f.estimatedPickup,
        logisticsPartner: transportData.courier          || transportData.logisticsPartner || f.logisticsPartner,
        transport:        transportData.courier          || transportData.carrier || f.transport,
      }));
      setTransportFetchStatus(FETCH_STATUS.SUCCESS);
    } catch {
      setTransportFetchStatus(FETCH_STATUS.ERROR);
    }
  }, []);

  // ── AWB Selection ────────────────────────────────────────────────────────
  const handleAwbSelect = useCallback((awbNo) => {
    if (!awbNo) {
      setForm(f => ({ ...f, awbNo: '', docketNo: '', estimatedPickup: '', logisticsPartner: '' }));
      return;
    }
    const shipment = shipments.find(s => s.awbNo === awbNo);
    if (shipment) {
      setForm(f => ({
        ...f,
        awbNo,
        transport:        shipment.courier || f.transport,
        logisticsPartner: shipment.courier || f.logisticsPartner,
        pickupAddress:    shipment.destination || f.pickupAddress,
        docketNo:         shipment.shipmentId || f.docketNo,
        estimatedPickup:  shipment.eta ? new Date(shipment.eta).toLocaleDateString() : f.estimatedPickup,
      }));
      runTransportFetch(awbNo, shipment.courier);
    } else {
      set('awbNo', awbNo);
    }
  }, [shipments, runTransportFetch]);

  // ── Invoice fetch (Stage 2 + 3) ──────────────────────────────────────────
  const runInvoiceFetch = useCallback(async (invoiceNo, source = 'manual') => {
    if (!invoiceNo?.trim()) return;

    setFetchStatus(FETCH_STATUS.LOADING);
    setFetchError('');

    // Clear previous auto-filled data before refetch
    setForm(f => ({
      ...f,
      invoiceNo, // keep the number
      supplierName: '', supplierType: '', contactNumber: '', email: '',
      address: '', productName: '', skuCount: '', value: '', invoiceAmount: '',
      invoiceItems: [], awbNo: '', pickupAddress: '', transport: '',
      docketNo: '', estimatedPickup: '', logisticsPartner: '',
    }));

    try {
      let data = {};
      try {
        const res = source === 'manual'
          ? await materialReturnApi.getInvoiceContext(invoiceNo)
          : await invoiceApi.getByInvoiceNo(invoiceNo);
        data = res?.data || {};
      } catch {
        const res2 = await invoiceApi.getByInvoiceNo(invoiceNo);
        data = res2?.data || {};
      }

      // Resolve fields
      const supplierName    = data.supplierName    || data.customerName    || data.partyName       || data.vendorName     || '';
      const supplierType    = data.supplierType    || data.partyType       || data.vendorType     || 'Dealer';
      const contactNumber   = data.mobileNumber    || data.partyPhone      || data.contactNumber   || data.phone || '';
      const email           = data.email           || data.partyEmail      || data.supplierEmail   || data.vendorEmail || '';
      const address         = data.pickupAddress   || data.address         || data.partyAddress    || data.supplierAddress || data.vendorAddress || '';
      const productSku      = data.productSku      || data.skuCode         || data.biPartNumber    || (data.items?.[0]?.sku) || (data.items?.[0]?.skuCode) || '';
      const productName     = data.productName     || (data.items?.[0]?.productName) || (data.items?.[0]?.description) || data.brandName || '';
      const skuCount        = data.skuCount        ?? data.items?.length   ?? 0;
      const value           = data.value           || data.grandTotal      || data.totalAmount    || 0;
      const invoiceAmount   = data.invoiceAmount   || data.grandTotal      || data.subtotal       || 0;
      const awbNo           = data.awbNo           || data.lrNo            || data.trackingNo     || '';
      const transport       = data.transport       || data.courierName     || data.courierPartner || '';
      
      // MR ID logic
      const currentYear = new Date().getFullYear();
      const nextMrId = data.mrId || data.returnRequestId || `MR-${currentYear}-00${Math.floor(Math.random() * 100)}`;

      setForm(f => ({
        ...f,
        supplierName, supplierType, contactNumber, email,
        pickupAddress: f.pickupAddress || address,
        address, productName, productSku, 
        skuCount: String(skuCount),
        value: String(value),
        invoiceAmount: String(invoiceAmount),
        invoiceItems: data.items || [],
        awbNo:           f.awbNo     || awbNo,
        transport:       f.transport || transport,
        mrId:            nextMrId,
      }));

      setFetchStatus(FETCH_STATUS.SUCCESS);
      toast('Invoice details auto-fetched', 'success');

    } catch (err) {
      setFetchStatus(FETCH_STATUS.ERROR);
      setFetchError(err?.message || 'Invoice fetch failed');
    }
  }, []);

  // ── Manual Logistics Sync ────────────────────────────────────────────────
  const syncLogistics = useCallback(async () => {
    setTransportFetchStatus(FETCH_STATUS.LOADING);
    try {
      const sRes = await logisticsApi.getShipments();
      const latestShipments = sRes.data || [];
      setShipments(latestShipments);
      
      if (form.invoiceNo) {
        const match = latestShipments.find(s => s.orderRef === form.invoiceNo);
        if (match) {
          handleAwbSelect(match.awbNo);
          toast('Logistics data synchronized with Courier page', 'success');
        } else {
          toast('No matching shipment found in Logistics', 'info');
        }
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast('Failed to sync with Logistics API', 'error');
    } finally {
      setTransportFetchStatus(FETCH_STATUS.IDLE);
    }
  }, [form.invoiceNo, latestShipments => latestShipments, handleAwbSelect]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setForm(BLANK_FORM);
      setFetchStatus(FETCH_STATUS.IDLE);
      setFetchError('');
      setTransportFetchStatus(FETCH_STATUS.IDLE);
    } else {
      // Fetch couriers and shipments when modal opens
      const fetchData = async () => {
        try {
          const [cRes, sRes] = await Promise.all([
            vendorApi.getAll({ category: 'Logistics' }),
            logisticsApi.getShipments()
          ]);
          setCouriers(cRes.data || []);
          setShipments(sRes.data || []);
        } catch (err) {
          console.error('Failed to fetch logistics data:', err);
        }
      };
      fetchData();
    }
  }, [open]);

  // ── Auto-link Logistics when invoice or shipments change ──────────────────
  useEffect(() => {
    if (!form.invoiceNo || shipments.length === 0 || fetchStatus !== FETCH_STATUS.SUCCESS) return;

    // Search for a matching shipment by orderRef (Invoice No) or existing AWB
    const match = shipments.find(s => 
      s.orderRef === form.invoiceNo || 
      (form.awbNo && s.awbNo === form.awbNo)
    );

    if (match && match.awbNo !== form.awbNo) {
      setForm(f => ({
        ...f,
        awbNo:           match.awbNo,
        transport:       match.courier,
        logisticsPartner: match.courier,
        pickupAddress:    match.destination || f.pickupAddress,
        docketNo:         match.shipmentId,
        estimatedPickup:  match.eta ? new Date(match.eta).toLocaleDateString() : f.estimatedPickup,
      }));
      toast(`Logistics data auto-linked for AWB: ${match.awbNo}`, 'success');
      runTransportFetch(match.awbNo, match.courier);
    }
  }, [form.invoiceNo, shipments, fetchStatus, runTransportFetch]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!form.invoiceNo.trim())              { toast('Invoice number is required', 'error');  return; }
    if (!form.returnQty || Number(form.returnQty) < 1) { toast('Return qty is required', 'error'); return; }
    if (!form.reason.trim())                { toast('Return reason is required', 'error');   return; }
    
    const finalForm = { ...form };
    if (finalForm.transport === 'Other' && finalForm.manualTransport) finalForm.transport = finalForm.manualTransport;
    if (finalForm.awbNo === 'Manual' && finalForm.manualAwb) finalForm.awbNo = finalForm.manualAwb;
    
    onSave(finalForm);
  };

  // ── Modal UI ──────────────────────────────────────────────────────────────
  const previewMrId = form.mrId || (form.invoiceNo ? `MR-${new Date().getFullYear()}-XXX` : '');

  // ── Fetch status banner helper ────────────────────────────────────────────
  const FetchBanner = () => {
    if (fetchStatus === FETCH_STATUS.LOADING) return (
      <div className="mt-3 rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 bg-blue-100 text-blue-700 border border-blue-200">
        <Spinner size={12} />
        Stage 2: Invoice API fetching... Stage 3: Supplier + Products auto-populating...
      </div>
    );
    if (fetchStatus === FETCH_STATUS.SUCCESS) return null;
    if (fetchStatus === FETCH_STATUS.ERROR) return (
      <div className="mt-3 rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 bg-red-100 text-red-700 border border-red-200">
        <MdError className="w-3.5 h-3.5" />
        {fetchError || 'Invoice fetch failed — fill supplier details manually'}
      </div>
    );
    return (
      <div className="mt-3 rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2 bg-gray-100 text-gray-500 border border-gray-200">
        <MdInfoOutline className="w-3.5 h-3.5" />
        Select or enter invoice → Details will auto-fetch from Invoice API
      </div>
    );
  };

  return (
    <Modal
      open={open} onClose={onClose}
      title="New Stage Tracker — Create Return Request"
      size="xl"
      footer={
        <div className="flex items-center justify-between">
          <div className="text-xs text-blue-600 flex items-center gap-1.5 font-medium">
            <MdBolt className="w-4 h-4 text-blue-500" />
            Blue fields are auto-populated from ERP / Logistics APIs
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose} disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || fetchStatus === FETCH_STATUS.LOADING}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm disabled:opacity-50 transition-all shadow-lg shadow-red-100"
            >
              {saving
                ? <><Spinner size={14} />Creating...</>
                : <><MdCheckCircle className="w-4 h-4" />Create Return</>}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">

        {/* ── Section 1: Invoice Entry ──────────────────────────────────── */}
        <SectionBox
          title="Step 1 — Invoice Entry"
          icon={<MdDescription className="w-4 h-4" />}
          color="red"
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Dropdown */}
            <div>
              <label className={lbl}>Select Invoice</label>
              <select
                className={inp}
                value={form.invoiceNo}
                onChange={e => {
                  set('invoiceNo', e.target.value);
                  setFetchStatus(FETCH_STATUS.IDLE);
                  if (e.target.value) runInvoiceFetch(e.target.value, 'dropdown');
                }}
              >
                <option value="">— Select invoice —</option>
                {invoices.map((inv, i) => (
                  <option key={`${inv._id || inv.invoiceNo}-${i}`} value={inv.invoiceNo}>
                    {inv.invoiceNo} — {inv.partyName || inv.supplierName || 'Party'}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual entry */}
            <div>
              <label className={lbl}>Or enter Invoice No. manually *</label>
              <div className="flex gap-2">
                <input
                  className={inp}
                  placeholder="INV-2026-XXXX"
                  value={form.invoiceNo}
                  onChange={e => {
                    set('invoiceNo', e.target.value);
                    setFetchStatus(FETCH_STATUS.IDLE);
                  }}
                />
                <button
                  type="button"
                  onClick={() => runInvoiceFetch(form.invoiceNo, 'manual')}
                  disabled={fetchStatus === FETCH_STATUS.LOADING || !form.invoiceNo.trim()}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold whitespace-nowrap flex items-center gap-1 disabled:opacity-50 hover:bg-blue-700 transition-colors"
                >
                  {fetchStatus === FETCH_STATUS.LOADING
                    ? <><Spinner size={12} />Fetching...</>
                    : <><MdRefresh className="w-3 h-3" />Auto Fetch</>}
                </button>
              </div>
            </div>
          </div>

          <FetchBanner />
        </SectionBox>

        {/* ── Section 2: Auto-Fetched Supplier & Product ─────── */}
        <SectionBox
          title="Supplier & Product"
          icon={<MdBolt className="w-4 h-4" />}
          color="blue"
        >
          {/* Loading skeleton */}
          {fetchStatus === FETCH_STATUS.LOADING && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 w-24 bg-blue-200 rounded animate-pulse" />
                  <div className="h-9 bg-blue-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Actual data */}
          {fetchStatus !== FETCH_STATUS.LOADING && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Supplier Name',     val: form.supplierName,      placeholder: 'Auto-filled'  },
                  { label: 'Supplier Type',     val: form.supplierType,      type: 'select', placeholder: 'Dealer/Retailer' },
                  { label: 'Contact Number',   val: form.contactNumber,     placeholder: 'Auto-filled'  },
                  { label: 'Email',             val: form.email,             placeholder: 'Auto-filled'  },
                  { label: 'Product Name',      val: form.productName,       placeholder: 'Auto-filled'  },
                  { label: 'Product SKU',       val: form.productSku,        placeholder: 'Auto-filled'  },
                  { label: 'SKU Count',         val: form.skuCount ? `${form.skuCount} SKUs` : '', placeholder: 'Auto-filled' },
                  { label: 'Invoice Amount ₹',  val: form.invoiceAmount ? `₹ ${Number(form.invoiceAmount).toLocaleString('en-IN')}` : '', placeholder: 'Auto-filled' },
                  { label: 'Return Value ₹',    val: form.value ? `₹ ${Number(form.value).toLocaleString('en-IN')}` : '', placeholder: 'Auto-filled' },
                  { label: 'MR ID',             val: previewMrId,            placeholder: 'Auto-generated' },
                ].map(({ label, val, type, placeholder }, i) => (
                  <div key={`${label}-${i}`}>
                    <label className={lblAuto}>{label}</label>
                    {type === 'select' ? (
                      <select
                        className={inpAuto}
                        value={val || ''}
                        onChange={e => set('supplierType', e.target.value)}
                      >
                        <option value="">— Select Type —</option>
                        {['Dealer', 'Distributor', 'Retailer', 'OEM', 'Vendor'].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={inpAuto}
                        readOnly
                        value={val || ''}
                        placeholder={placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Invoice line items table */}
              
              {/* Supplier address — full-width */}
              {form.address && (
                <div className="mt-4">
                  <label className={lblAuto}>
                    Supplier Address
                    <span className="text-blue-400 font-normal text-[10px] ml-1"></span>
                  </label>
                  <input className={inpAuto} readOnly value={form.address} />
                </div>
              )}
            </>
          )}
        </SectionBox>

        {/* ── Section 3: User Input Fields ──────────────────────────────── */}
        <SectionBox
          title="User Input Fields"
          icon={<MdPerson className="w-4 h-4" />}
          color="orange"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Return Type *</label>
              <select className={inp} value={form.returnType} onChange={e => set('returnType', e.target.value)}>
                {['Material Return', 'Purchase Return', 'Sales Return', 'Vendor Return', 'Damaged Return'].map(v => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Priority</label>
              <select className={inp} value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['Low', 'Medium', 'High', 'Critical'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Return Qty (PCS) *</label>
              <input
                type="number" min="1" className={inp} placeholder="e.g. 50"
                value={form.returnQty} onChange={e => set('returnQty', e.target.value)}
              />
            </div>
            <div>
              <label className={lbl}>Return Reason *</label>
              <input
                className={inp} placeholder="e.g. Damaged, Wrong item, Quality issue"
                value={form.reason} onChange={e => set('reason', e.target.value)}
              />
            </div>
          </div>
        </SectionBox>

        {/* ── Section 4: Transport & Logistics ─────────────────────────── */}
        <SectionBox
          title="Transport & Logistics"
          color="blue"
          headerRight={
            <button
              onClick={syncLogistics}
              disabled={transportFetchStatus === FETCH_STATUS.LOADING}
              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100 transition-all border border-blue-200"
            >
              {transportFetchStatus === FETCH_STATUS.LOADING ? <Spinner size={10} /> : <MdRefresh className="w-3 h-3" />}
             
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-4">

            {/* AWB Dropdown */}
            <div>
              <label className={lblAuto}>
                AWB / LR No.
                <span className="text-blue-400 font-normal text-[10px] ml-1"></span>
              </label>
              <div className="flex gap-2">
                <select
                  className={form.awbNo && form.awbNo !== 'Manual' ? inpAuto : inp}
                  value={form.awbNo}
                  onChange={e => handleAwbSelect(e.target.value)}
                >
                  <option value="">— Select AWB —</option>
                  {shipments.map((s, i) => (
                    <option key={`${s._id || s.awbNo}-${i}`} value={s.awbNo}>
                      {s.awbNo} — {s.courier} (Ref: {s.orderRef})
                    </option>
                  ))}
                </select>
                {form.awbNo && form.awbNo !== 'Manual' && (
                  <button
                    type="button"
                    onClick={() => runTransportFetch(form.awbNo, form.transport)}
                    disabled={transportFetchStatus === FETCH_STATUS.LOADING}
                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                  >
                    <MdRefresh className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Courier Dropdown — now dependent on AWB or manual selection */}
            <div>
              <label className={form.transport ? lblAuto : lbl}>
                Courier / Transport {form.transport && <span className="text-blue-400 font-normal text-[10px] ml-1">(Auto: Logistics API)</span>}
              </label>
              <select
                className={form.transport && form.awbNo ? inpAuto : inp}
                value={form.transport}
                onChange={e => set('transport', e.target.value)}
              >
                <option value="">— Select Courier —</option>
                {couriers.map((c, i) => (
                  <option key={`${c._id || c.companyName}-${i}`} value={c.companyName}>{c.companyName}</option>
                ))}
                {/* Fallback for shipment courier not in master list */}
                {form.transport && !couriers.some(c => c.companyName === form.transport) && (
                  <option value={form.transport}>{form.transport}</option>
                )}
              </select>
            </div>

            {/* Pickup Address */}
            <div className="col-span-2">
              <label className={lblAuto}>
                Pickup Address
                <span className="text-blue-400 font-normal text-[10px] ml-1"></span>
              </label>
              <textarea
                rows={2}
                className={form.pickupAddress && fetchStatus === FETCH_STATUS.SUCCESS ? inpAuto : inp}
                value={form.pickupAddress}
                onChange={e => set('pickupAddress', e.target.value)}
                placeholder="Auto-filled address"
              />
            </div>

            {/* Auto Fields */}
            {(form.docketNo || form.estimatedPickup || transportFetchStatus === FETCH_STATUS.LOADING) && (
              <>
                <div>
                  <label className={lblAuto}>
                    Docket No.
                    <span className="text-blue-400 font-normal text-[10px] ml-1">(Auto: Logistics API)</span>
                  </label>
                  {transportFetchStatus === FETCH_STATUS.LOADING
                    ? <div className="h-9 bg-blue-100 rounded-lg animate-pulse" />
                    : <input className={inpAuto} readOnly value={form.docketNo || ''} />
                  }
                </div>
                <div>
                  <label className={lblAuto}>
                    Estimated Pickup
                    <span className="text-blue-400 font-normal text-[10px] ml-1">(Auto: Logistics API)</span>
                  </label>
                  {transportFetchStatus === FETCH_STATUS.LOADING
                    ? <div className="h-9 bg-blue-100 rounded-lg animate-pulse" />
                    : <input className={inpAuto} readOnly value={form.estimatedPickup || ''} />
                  }
                </div>
              </>
            )}
          </div>
        </SectionBox>

        {/* ── Section 5: Workflow Auto Read-only ───────────────────────── */}
       

        {/* ── Section 6: Attachments ────────────────────────────────────── */}
        <SectionBox
          title="Attachments (Optional)"
          icon={<MdAttachFile className="w-4 h-4" />}
          color="green"
        >
          <input
            type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className={inp}
            onChange={e => set('attachments', Array.from(e.target.files))}
          />
          <p className="text-xs text-gray-400 mt-1">PDF, Images, Word docs accepted</p>
          {form.attachments?.length > 0 && (
            <div className="mt-2 space-y-1">
              {form.attachments.map((file, i) => (
                <div key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded flex items-center gap-1.5">
                  <MdAttachFile className="w-3 h-3" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}
        </SectionBox>

      </div>
    </Modal>
  );
}

// ─── Main StageTrackerPage ────────────────────────────────────────────────────
export default function StageTrackerPage({ returns: propReturns, onStageUpdate }) {
  const [returns,        setReturns]        = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [showCreate,     setShowCreate]     = useState(false);
  const [showFinModal,   setShowFinModal]   = useState(false);
  const [finRecord,      setFinRecord]      = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [invoices,       setInvoices]       = useState([]);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterStage,    setFilterStage]    = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const loadData = useCallback(async () => {
    if (propReturns && propReturns.length > 0) {
      const data = propReturns.map(normalizeReturn);
      setReturns(data);
      if (!selectedReturn && data.length > 0) setSelectedReturn(data[0]);
      return;
    }
    setLoading(true);
    try {
      const res = await materialReturnApi.getAll();
      const data = (res.data || []).map(normalizeReturn);
      setReturns(data);
      if (!selectedReturn && data.length > 0) setSelectedReturn(data[0]);
    } catch {
      setReturns([]);
    } finally { setLoading(false); }
  }, [propReturns]);

  const loadInvoices = async () => {
    try {
      const res = await invoiceApi.getAll({ limit: 200 });
      setInvoices(res.data || []);
    } catch { setInvoices([]); }
  };

  useEffect(() => { loadData(); loadInvoices(); }, [loadData]);

  const handleStageUpdate = async (newStage) => {
    if (!selectedReturn) return;
    setLoading(true);
    try {
      if (selectedReturn._id && selectedReturn._id !== selectedReturn.mrId && materialReturnApi.updateStage)
        await materialReturnApi.updateStage(selectedReturn._id, newStage);
      if (onStageUpdate) await onStageUpdate(selectedReturn._id, newStage);
      const updated = normalizeReturn({ ...selectedReturn, stage: newStage, lastUpdated: new Date().toISOString() });
      setSelectedReturn(updated);
      setReturns(p => p.map(r => r._id === selectedReturn._id ? updated : r));
      toast(`Moved to: ${newStage.replace(/_/g, ' ')}`, 'success');
    } catch { toast('Stage update failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleCreateReturn = async (form) => {
    setSaving(true);
    try {
      const payload = {
        returnType:       form.returnType,
        supplierName:     form.supplierName     || undefined,
        supplierType:     form.supplierType     || undefined,
        contactNumber:    form.contactNumber    || undefined,
        email:            form.email            || undefined,
        address:          form.address          || undefined,
        invoiceNo:        form.invoiceNo,
        value:            form.value            ? Number(form.value)    : undefined,
        invoiceAmount:    form.invoiceAmount    ? Number(form.invoiceAmount) : undefined,
        returnQty:        Number(form.returnQty) || 1,
        expectedQty:      Number(form.returnQty) || 1,
        skuCount:         form.skuCount         ? Number(form.skuCount) : undefined,
        productName:      form.productName      || undefined,
        stage:            'Return_Request_Create',
        currentWorkflowStage: 'Return_Request_Create',
        transportStatus:  'Pending',
        warehouseStatus:  'Pending',
        qcStatus:         'Pending',
        financeStatus:    'CN Pending',
        priority:         form.priority,
        reason:           form.reason,
        transport:        form.transport        || undefined,
        awbNo:            form.awbNo            || undefined,
        docketNo:         form.docketNo         || undefined,
        pickupAddress:    form.pickupAddress    || undefined,
        assignedTo:       workflowAssignee('Return_Request_Create'),
      };
      let created;
      try {
        const res = await materialReturnApi.create(payload);
        created = normalizeReturn(res.data);
      } catch {
        // Offline / dev fallback
        created = normalizeReturn({
          ...payload,
          _id:         `local_${Date.now()}`,
          mrId:        `MR-${new Date().getFullYear()}-${String(returns.length + 100).padStart(3, '0')}`,
          createdAt:   new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          createdBy:   'Current User',
        });
      }
      setReturns(p => [created, ...p]);
      setSelectedReturn(created);
      setShowCreate(false);
      toast(`Return ${created.mrId} created successfully`, 'success');
    } catch (err) {
      toast(err.message || 'Create failed', 'error');
    } finally { setSaving(false); }
  };

  const getCurrentStageIndex = (r) => Math.max(0, RETURN_STAGES.findIndex(s => s.key === r?.stage));
  const nextStageFor = (stage) => {
    const idx = getCurrentStageIndex({ stage });
    return RETURN_STAGES[Math.min(idx + 1, RETURN_STAGES.length - 1)]?.key;
  };

  const filtered = returns.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || (r.mrId||'').toLowerCase().includes(q)
      || (r.supplierName||'').toLowerCase().includes(q)
      || (r.invoiceNo||'').toLowerCase().includes(q);
    return matchSearch
      && (filterStage    === 'all' || r.stage    === filterStage)
      && (filterPriority === 'all' || r.priority === filterPriority);
  });

  const stats = {
    total:     returns.length,
    inTransit: returns.filter(r => r.stage === 'Transport_Tracking').length,
    pendingQC: returns.filter(r => r.qcStatus === 'Pending').length,
    closed:    returns.filter(r => r.stage === 'Closed').length,
  };

  const COLUMNS = [
    { label: 'MR ID',         field: 'mrId'            },
    { label: 'Return Type',   field: 'returnType'      },
    { label: 'Supplier',      field: 'supplierName'    },
    { label: 'Invoice',       field: 'invoiceNo'       },
    { label: 'SKU Count',     field: 'skuCount'        },
    { label: 'Return Qty',    field: 'returnQty'       },
    { label: 'Return Value',  field: 'value'           },
    { label: 'Current Stage', field: 'stage'           },
    { label: 'Transport',     field: 'transportStatus' },
    { label: 'Warehouse',     field: 'warehouseStatus' },
    { label: 'QC Status',     field: 'qcStatus'        },
    { label: 'Finance',       field: 'financeStatus'   },
    { label: 'Aging',         field: 'aging'           },
    { label: 'Priority',      field: 'priority'        },
    { label: 'Assigned To',   field: 'assignedTo'      },
    { label: 'Last Updated',  field: 'lastUpdated'     },
    { label: 'Actions',       field: null              },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <MdLoop className="w-6 h-6 text-red-600" /> Stage Tracker
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time material return stage tracking with auto-populated data
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <MdRefresh className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => toast('Export coming soon', 'success')} className="flex items-center gap-1.5 px-3 py-2 border border-green-300 bg-white rounded-lg text-sm text-green-700 hover:bg-green-50">
            <MdDownload className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all"
          >
            <MdAdd className="w-4 h-4" /> New Stage Tracker
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Returns', val: stats.total,     borderColor: '#3b82f6', Icon: MdLoop,          iconColor: '#3b82f6' },
          { label: 'In Transit',    val: stats.inTransit, borderColor: '#8b5cf6', Icon: MdLocalShipping, iconColor: '#8b5cf6' },
          { label: 'Pending QC',    val: stats.pendingQC, borderColor: '#f59e0b', Icon: MdVerifiedUser,  iconColor: '#f59e0b' },
          { label: 'Closed',        val: stats.closed,    borderColor: '#10b981', Icon: MdCheckCircle,   iconColor: '#10b981' },
        ].map(({ label, val, borderColor, Icon, iconColor }) => (
          <div
            key={label}
            className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between"
            style={{ borderLeft: `4px solid ${borderColor}` }}
          >
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold mt-0.5">{val}</p>
            </div>
            <Icon className="w-7 h-7" style={{ color: iconColor }} />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text" placeholder="Search MR ID, Invoice, Supplier..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[150px]">
          <option value="all">All Stages</option>
          {RETURN_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="all">All Priority</option>
          {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">Showing {filtered.length} of {returns.length}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50">
          <span className="font-bold text-gray-700 text-sm">Return Records ({filtered.length})</span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <MdBolt className="w-3 h-3 text-blue-500" /> = Auto-populated field
          </span>
        </div>

        {loading && returns.length === 0 ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Spinner size={22} />
            <span className="text-sm">Loading returns from backend...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 1700 }}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {COLUMNS.map(({ label, field }) => (
                    <th key={label} className="px-3 py-3 text-left whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</span>
                        {field && FIELD_SOURCE[field] && (
                          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${FIELD_SOURCE[field].auto ? 'text-blue-500' : 'text-gray-400'}`}>
                            {FIELD_SOURCE[field].auto && <MdBolt className="w-3 h-3" />}
                            {FIELD_SOURCE[field].label}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={17} className="text-center py-12 text-gray-400 text-sm">No returns found</td></tr>
                )}
                {filtered.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => setSelectedReturn(s => s?._id === r._id ? null : r)}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedReturn?._id === r._id ? 'bg-red-50 border-l-4 border-l-red-500' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs font-bold text-red-600">{r.mrId}</span>
                 
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{r.returnType}</span>

                    </td>
                    <td className="px-3 py-3 max-w-[140px]">
                      <div className="font-semibold text-gray-800 text-xs truncate">{r.supplierName}</div>
                      <div className="text-[10px] text-gray-400">{r.supplierType}</div>
                   
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {r.invoiceNo}
                    
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 text-xs">{r.skuCount || r.items?.length || 0} SKUs</span>
                    
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 text-xs">{(r.returnQty || 0).toLocaleString('en-IN')} PCS</span>
                  
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-bold text-red-600 text-xs">₹{(r.value || 0).toLocaleString('en-IN')}</span>
                     
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Pill label={r.stage.replace(/_/g, ' ')} className={STAGE_BADGE[r.stage] || 'bg-gray-100 text-gray-600'} />
                     
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-600 flex items-center gap-1"><MdLocalShipping className="w-3 h-3 text-blue-400" />{r.transportStatus}</span>
                     
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-600 flex items-center gap-1"><MdWarehouse className="w-3 h-3 text-orange-400" />{r.warehouseStatus}</span>
                      
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold flex items-center gap-1 ${r.qcStatus === 'Approved' ? 'text-green-600' : r.qcStatus === 'In Progress' ? 'text-yellow-600' : 'text-gray-500'}`}>
                        <MdVerifiedUser className="w-3 h-3" />{r.qcStatus}
                      </span>
                    
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${r.financeStatus === 'CN Generated' ? 'text-green-600' : 'text-orange-600'}`}>{r.financeStatus}</span>
                 
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`flex items-center gap-1 font-semibold text-xs ${(r.aging||0) > 5 ? 'text-red-600' : (r.aging||0) > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                        <MdAccessTime className="w-3 h-3" />{r.aging || 0}d
                      </span>
             
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Pill label={r.priority} className={PRIORITY_BADGE[r.priority] || 'bg-gray-100 text-gray-600'} />
                     
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {(r.assignedTo || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-700">{r.assignedTo || 'Unassigned'}</span>
                      </div>

                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-xs text-gray-500">{timeAgo(r.lastUpdated)}</span>
                   
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelectedReturn(r)}
                          className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
                          <MdVisibility className="w-3 h-3" /> View
                        </button>
                        <button onClick={() => { setFinRecord(r); setShowFinModal(true); }}
                          className="flex items-center gap-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold">
                          <MdCurrencyRupee className="w-3 h-3" /> Finance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Return Stage Detail */}
      {selectedReturn && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <MdLoop className="w-5 h-5 text-red-500" />{selectedReturn.mrId}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedReturn.returnType} &nbsp;•&nbsp; {selectedReturn.supplierName} &nbsp;•&nbsp;
                Created {selectedReturn.createdAt ? new Date(selectedReturn.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                &nbsp;•&nbsp; By {selectedReturn.createdBy || 'N/A'}
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                <span className="bg-gray-100 px-2 py-1 rounded-lg">Invoice: <strong>{selectedReturn.invoiceNo}</strong></span>
                <span className="bg-blue-50 px-2 py-1 rounded-lg text-blue-700 flex items-center gap-0.5">
                  <MdBolt className="w-3 h-3" />SKUs: <strong>{selectedReturn.skuCount}</strong>
                </span>
                <span className="bg-blue-50 px-2 py-1 rounded-lg text-blue-700 flex items-center gap-0.5">
                  <MdBolt className="w-3 h-3" />Value: <strong>₹{(selectedReturn.value || 0).toLocaleString('en-IN')}</strong>
                </span>
                <span className="bg-gray-100 px-2 py-1 rounded-lg">Qty: <strong>{selectedReturn.returnQty} PCS</strong></span>
                <span className={`px-2 py-1 rounded-lg flex items-center gap-0.5 ${(selectedReturn.aging || 0) > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  <MdBolt className="w-3 h-3" />Aging: <strong>{selectedReturn.aging || 0} days</strong>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Pill label={selectedReturn.stage.replace(/_/g, ' ')} className={`text-sm px-3 py-1 ${STAGE_BADGE[selectedReturn.stage] || 'bg-gray-100 text-gray-600'}`} />
              <Pill label={selectedReturn.priority} className={`text-sm px-3 py-1 ${PRIORITY_BADGE[selectedReturn.priority] || 'bg-gray-100'}`} />
              {selectedReturn.stage !== 'Closed' && (
                <button
                  onClick={() => handleStageUpdate(nextStageFor(selectedReturn.stage))}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                >
                  {loading ? <Spinner size={14} /> : <MdArrowForward className="w-4 h-4" />}
                  Move to {nextStageFor(selectedReturn.stage)?.replace(/_/g, ' ')}
                </button>
              )}
              <button onClick={() => setSelectedReturn(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <MdClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stage Progress */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-2">
              <MdBarChart className="w-4 h-4 text-red-500" /> Stage Progress
              <span className="text-blue-500 font-normal flex items-center gap-1">
                — circles with <MdBolt className="w-3 h-3" /> = auto-managed by system
              </span>
            </div>
            <StageProgressBar currentStage={selectedReturn.stage} />
          </div>

          {/* Items Table */}
          {selectedReturn.items && selectedReturn.items.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-bold text-gray-600 mb-2">Return Items</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {['SKU', 'Product', 'Return Qty', 'Unit Price', 'Total Value', 'Reason', 'QC Result'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium border-b whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items.map((item, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono">{item.sku}</td>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-center">{item.returnQty}</td>
                        <td className="px-3 py-2">₹{(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2 font-semibold text-red-600">₹{(item.total || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{item.reason}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.qcResult === 'Approved' ? 'bg-green-100 text-green-700' : item.qcResult === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.qcResult || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateReturnModal
        open={showCreate} onClose={() => setShowCreate(false)}
        onSave={handleCreateReturn} saving={saving} invoices={invoices}
      />
      <FinancialStatusModal
        open={showFinModal} onClose={() => setShowFinModal(false)}
        record={finRecord}
      />
    </div>
  );
}