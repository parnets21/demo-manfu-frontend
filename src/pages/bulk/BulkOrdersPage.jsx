import { useState, useEffect, useCallback, useRef } from 'react';
import { MdCropSquare, MdLocalShipping, MdInventory, MdCardGiftcard, MdCheck, MdClose, MdWork } from 'react-icons/md';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { bulkOrderApi } from '../../api/bulkOrderApi';
import { logisticsApi } from '../../api/logisticsApi';
import { inventoryApi } from '../../api/inventoryApi';
import { packagingApi } from '../../api/packagingApi';
import { corporateClientApi } from '../../api/corporateClientApi';

const tierColor = { Platinum: '#8b5cf6', Gold: '#f59e0b', Silver: '#6b7280' };

// Default packaging options (fallback if API fails)
const defaultPackagingOptions = [
  { id: 'PKG-01', name: 'Standard Box', description: 'Plain corrugated box with product label', moq: 100, extraCost: '₹0', leadTime: '0 days', icon: MdCropSquare },
  { id: 'PKG-02', name: 'Custom Branded', description: 'Client logo & branding on box', moq: 500, extraCost: '₹12/unit', leadTime: '5 days', icon: MdInventory },
  { id: 'PKG-03', name: 'Bulk Loose', description: 'No individual packaging, bulk pallet', moq: 1000, extraCost: '-₹5/unit', leadTime: '0 days', icon: MdLocalShipping },
  { id: 'PKG-04', name: 'Premium Gift Box', description: 'Premium finish with foam insert', moq: 200, extraCost: '₹45/unit', leadTime: '7 days', icon: MdCardGiftcard },
];

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]";
const labelCls = "text-xs font-semibold text-gray-600";
const fieldCls = "flex flex-col gap-1.5 mb-4";
const thCls = "bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap";
const tdCls = "px-4 py-3 text-gray-800 align-middle";
const trCls = "border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors";
const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]";
const btnOutline = "inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]";
const btnSm = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg";

export default function BulkOrdersPage({ initialTab = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState('PKG-02');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [corporateClients, setCorporateClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [packagingOptions, setPackagingOptions] = useState(defaultPackagingOptions);
  const [stats, setStats] = useState({ activeClients: 0, activeQuotes: 0, approvedQuotes: 0, pipeline: 0 });
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [viewQuote, setViewQuote] = useState(null);
  const [quoteItems, setQuoteItems] = useState([{ item: '', sku: '', qty: 1, unitPrice: 0, discount: 0 }]);
  const [quoteForm, setQuoteForm] = useState({ clientId: '', packaging: 'Standard Box', paymentTerms: 'Net 30', validity: '' });
  const [newClientForm, setNewClientForm] = useState({ name: '', contact: '', phone: '', email: '', city: '', tier: 'Silver', creditLimit: '', gstNumber: '', address: '' });
  const [newDeliveryForm, setNewDeliveryForm] = useState({ quotationId: '', client: '', items: '', qty: '', deliveryDate: '', slot: '', warehouse: 'WH-01', vehicle: '', status: 'Draft' });
  const fileRef = useRef(null);

  const handleExcelUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const res = await bulkOrderApi.importClientsFile(file);
      toast(res.message || `Imported ${res.data?.length || 0} clients`);
      await fetchAll();
    } catch (err) {
      console.error('Excel upload failed', err);
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fmtMoney = (v) => typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : (v || '₹0');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, corporateClientsRes, quotesRes, schedulesRes, statsRes, vehiclesRes, warehousesRes, packagingRes] = await Promise.allSettled([
        bulkOrderApi.getClients(),
        corporateClientApi.getAll({ status: 'Active' }),
        bulkOrderApi.getQuotations(),
        bulkOrderApi.getSchedules(),
        bulkOrderApi.getStats(),
        logisticsApi.getVehicles({ status: 'Available' }),
        inventoryApi.getWarehouses(),
        packagingApi.getAll(),
      ]);
      if (clientsRes.status === 'fulfilled') setClients(clientsRes.value.data || []);
      if (corporateClientsRes.status === 'fulfilled') setCorporateClients(corporateClientsRes.value.data || []);
      if (quotesRes.status === 'fulfilled') setQuotations(quotesRes.value.data || []);
      if (schedulesRes.status === 'fulfilled') setSchedules(schedulesRes.value.data || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
      if (vehiclesRes.status === 'fulfilled') setVehicles(vehiclesRes.value.data || []);
      if (warehousesRes.status === 'fulfilled') setWarehouses(warehousesRes.value.data || []);
      if (packagingRes.status === 'fulfilled' && packagingRes.value.data && packagingRes.value.data.length > 0) {
        // Map backend packaging data to include icons and set id as _id
        const packagingWithIcons = packagingRes.value.data.map(pkg => ({
          ...pkg,
          id: pkg._id || pkg.packagingId,
          icon: pkg.type === 'Premium' ? MdCardGiftcard : pkg.type === 'Bulk' ? MdLocalShipping : pkg.type === 'Custom' ? MdInventory : MdCropSquare,
        }));
        setPackagingOptions(packagingWithIcons);
      } else {
        // Fall back to default packaging options if no data from backend
        setPackagingOptions(defaultPackagingOptions);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const subtotal = quoteItems.reduce((s, i) => s + ((parseFloat(i.qty)||0)*(parseFloat(i.unitPrice)||0)*(1-(parseFloat(i.discount)||0)/100)), 0);
  const gst = Math.round(subtotal * 0.18);
  const grand = subtotal + gst;

  const kpis = [
    { label: 'Corporate Clients', value: stats.activeClients ?? clients.filter(c => c.status === 'Active').length, color: '#8b5cf6' },
    { label: 'Active Quotations', value: stats.activeQuotes ?? quotations.filter(q => q.status === 'Sent').length, color: '#f59e0b' },
    { label: 'Approved Quotes',   value: stats.approvedQuotes ?? quotations.filter(q => q.status === 'Approved').length, color: '#10b981' },
    { label: 'Pipeline Value',    value: stats.pipeline ? `₹${(stats.pipeline/100000).toFixed(1)}L` : '₹0', color: '#1e40af' },
  ];

  const handleAddCorporateClient = async () => {
    if (!newClientForm.name || !newClientForm.contact) { toast('Please fill required fields', 'error'); return; }
    setLoading(true);
    try {
      const res = await bulkOrderApi.createClient({
        ...newClientForm,
        creditLimit: parseFloat(newClientForm.creditLimit) || 0,
        status: 'Active',
      });
      setClients(prev => [res.data, ...prev]);
      setShowClientModal(false);
      setNewClientForm({ name: '', contact: '', phone: '', email: '', city: '', tier: 'Silver', creditLimit: '', gstNumber: '', address: '' });
      toast(`Client "${res.data.name}" added`);
      fetchAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleAddBulkQuotation = async () => {
    if (!quoteForm.clientId) { toast('Select a client', 'error'); return; }
    if (!quoteItems[0]?.item) { toast('Add at least one item', 'error'); return; }
    setLoading(true);
    try {
      const client = clients.find(c => c._id === quoteForm.clientId);
      const lineItems = quoteItems.map(it => ({
        item: it.item, sku: it.sku,
        qty: parseFloat(it.qty) || 0,
        unitPrice: parseFloat(it.unitPrice) || 0,
        discount: parseFloat(it.discount) || 0,
        total: Math.round((parseFloat(it.qty)||0)*(parseFloat(it.unitPrice)||0)*(1-(parseFloat(it.discount)||0)/100)),
      }));
      const totalQty = lineItems.reduce((sum, it) => sum + (it.qty || 0), 0);
      const res = await bulkOrderApi.createQuotation({
        client: client?.name || '',
        items: lineItems.length,
        qty: totalQty,
        value: grand,
        lineItems,
        packaging: quoteForm.packaging,
        validity: quoteForm.validity || null,
        status: 'Sent',
      });
      setQuotations(prev => [res.data, ...prev]);
      setShowQuoteModal(false);
      setQuoteForm({ clientId: '', packaging: 'Standard Box', paymentTerms: 'Net 30', validity: '' });
      setQuoteItems([{ item: '', sku: '', qty: 1, unitPrice: 0, discount: 0 }]);
      toast('Quotation sent to client');
      fetchAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleAddDeliverySchedule = async () => {
    if (!newDeliveryForm.client || !newDeliveryForm.deliveryDate || !newDeliveryForm.slot) {
      toast('Fill all required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      // Get the selected quotation to get items array
      const selectedQuotation = quotations.find(q => q._id === newDeliveryForm.quotationId);
      // Map lineItems: BulkQuotation stores `item` field, DeliverySchedule model expects `itemName`
      const mappedItems = (selectedQuotation?.lineItems || []).map(li => ({
        sku: li.sku || '',
        itemName: li.item || li.itemName || '',
        qty: li.qty || 0,
        unitPrice: li.unitPrice || 0,
        total: li.total || 0,
      }));
      const res = await bulkOrderApi.createSchedule({
        quotationId: newDeliveryForm.quotationId || null,
        client: newDeliveryForm.client,
        items: mappedItems,
        totalItems: mappedItems.length || parseInt(newDeliveryForm.items) || 0,
        totalQty: parseInt(newDeliveryForm.qty) || 0,
        deliveryDate: newDeliveryForm.deliveryDate,
        slot: newDeliveryForm.slot,
        warehouse: newDeliveryForm.warehouse,
        vehicle: newDeliveryForm.vehicle || 'Pending',
        status: newDeliveryForm.status,
      });
      setSchedules(prev => [res.data, ...prev]);
      setShowDeliveryModal(false);
      setNewDeliveryForm({ quotationId: '', client: '', items: '', qty: '', deliveryDate: '', slot: '', warehouse: 'WH-01', vehicle: '', status: 'Draft' });
      toast('Delivery scheduled');
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: 'none' }} />
      {/* Action Bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        {activeTab === 0 && <>
          <button onClick={() => fileRef.current?.click()} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'8px 16px', borderRadius:10,
            background:'linear-gradient(135deg,#06b6d4,#0891b2)',
            color:'#fff', border:'none', cursor:'pointer',
            fontSize:13, fontWeight:600, fontFamily:'inherit',
            boxShadow:'0 3px 10px rgba(6,182,212,0.18)'
          }}>📥 Import Excel</button>
          <button onClick={() => { setSelectedClient(null); setShowClientModal(true); }} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            padding:'8px 16px', borderRadius:10,
            background:'linear-gradient(135deg,#3b82f6,#1e40af)',
            color:'#fff', border:'none', cursor:'pointer',
            fontSize:13, fontWeight:600, fontFamily:'inherit',
            boxShadow:'0 3px 10px rgba(185,28,28,0.3)',
          }}>+ Add Client</button>
        </>}
        {activeTab === 1 && <button onClick={() => setShowQuoteModal(true)} style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'8px 16px', borderRadius:10,
          background:'linear-gradient(135deg,#3b82f6,#1e40af)',
          color:'#fff', border:'none', cursor:'pointer',
          fontSize:13, fontWeight:600, fontFamily:'inherit',
          boxShadow:'0 3px 10px rgba(185,28,28,0.3)',
        }}>+ New Quotation</button>}
        {activeTab === 3 && <button onClick={() => setShowDeliveryModal(true)} style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'8px 16px', borderRadius:10,
          background:'linear-gradient(135deg,#3b82f6,#1e40af)',
          color:'#fff', border:'none', cursor:'pointer',
          fontSize:13, fontWeight:600, fontFamily:'inherit',
          boxShadow:'0 3px 10px rgba(185,28,28,0.3)',
        }}>+ Schedule Delivery</button>}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          {loading ? <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading...</div> : clients.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No clients yet. Click "+ Add Client" to add one.</div>
          ) : (
          <DataTable
            columns={[
              { key: 'clientId', label: 'Client ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'name', label: 'Company', render: v => <span className="font-bold">{v}</span> },
              { key: 'contact', label: 'Contact' },
              { key: 'city', label: 'City' },
              { key: 'tier', label: 'Tier', render: v => (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: (tierColor[v] || '#6b7280') + '20', color: tierColor[v] || '#6b7280' }}>{v}</span>
              )},
              { key: 'creditLimit', label: 'Credit Limit', render: v => <span className="font-semibold">{fmtMoney(v)}</span> },
              { key: 'outstanding', label: 'Outstanding', render: v => <span className={`font-bold ${!v || v === 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtMoney(v)}</span> },
              { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
              { key: '_id', label: 'Actions', render: (_, row) => (
                <div className="flex gap-1.5">
                  <button onClick={() => setViewClient(row)} className={`${btnSm} border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]`}>View</button>
                  <button onClick={() => { setQuoteForm(p => ({ ...p, clientId: row._id })); setShowQuoteModal(true); }} className={`${btnSm} bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit]`}>Quote</button>
                  <button onClick={async () => { if(window.confirm(`Delete client "${row.name}"?`)){ try { await bulkOrderApi.deleteClient(row._id); fetchAll(); toast('Client deleted'); } catch(e){ toast(e.message,'error'); } } }} className={`${btnSm} bg-red-50 text-red-600 border border-red-200 font-semibold cursor-pointer font-[inherit]`}>🗑</button>
                </div>
              )},
            ]}
            data={clients}
          />
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          {loading ? <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Loading...</div> : quotations.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No quotations yet. Click "+ New Quotation" to create one.</div>
          ) : (
          <DataTable
            columns={[
              { key: 'quotationId', label: 'Quote ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'client', label: 'Client', render: v => <span className="font-semibold">{v}</span> },
              { key: 'items', label: 'SKU Count', render: v => Array.isArray(v) ? v.length : (typeof v === 'number' ? v : '—') },
              { key: 'value', label: 'Value', render: v => <span className="font-bold text-red-700">{fmtMoney(v)}</span> },
              { key: 'packaging', label: 'Packaging' },
              { key: 'validity', label: 'Valid Till', render: v => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—' },
              { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
              { key: '_id', label: 'Actions', render: (_, row) => (
                <div className="flex gap-1.5">
                  <button onClick={() => setViewQuote(row)} className={`${btnSm} border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]`}>View</button>
                  {row.status === 'Approved' && (
                    <button onClick={async () => {
                      try {
                        const r = await bulkOrderApi.convertToDispatch(row._id);
                        fetchAll();
                        toast(`✅ Dispatch ${r.data?.dispatchId || ''} created`);
                      } catch(e){ toast(e.message,'error'); }
                    }} className={`${btnSm} bg-gradient-to-br from-green-500 to-green-700 text-white font-semibold border-0 cursor-pointer font-[inherit]`}>Convert to Dispatch</button>
                  )}
                  <button onClick={async () => { try { const r = await bulkOrderApi.convertToPO(row._id); fetchAll(); toast(`✅ PO ${r.data?.poId || ''} created`); } catch(e){ toast(e.message,'error'); } }} className={`${btnSm} bg-gray-100 text-gray-800 font-semibold border-0 cursor-pointer font-[inherit]`}>Convert to PO</button>
                  <button onClick={async () => { if(window.confirm('Delete this quotation?')){ try { await bulkOrderApi.deleteQuotation(row._id); fetchAll(); toast('Deleted'); } catch(e){ toast(e.message,'error'); } } }} className={`${btnSm} bg-red-50 text-red-600 border border-red-200 font-semibold cursor-pointer font-[inherit]`}>Delete</button>
                </div>
              )},
            ]}
            data={quotations}
          />
          )}
        </div>
      )}

      {activeTab === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3.5">
            {packagingOptions.map(pkg => {
              const IconComponent = pkg.icon;
              return (
                <div key={pkg.id} onClick={() => setSelectedPkg(pkg.id)}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${selectedPkg === pkg.id ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <div className={`p-2.5 rounded-lg ${selectedPkg === pkg.id ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      <IconComponent size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="font-bold text-sm text-gray-800">{pkg.name}</div>
                        <span className={`font-bold text-[13px] ${pkg.extraCost.startsWith('-') ? 'text-green-600' : pkg.extraCost === '₹0' ? 'text-gray-400' : 'text-red-700'}`}>{pkg.extraCost}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{pkg.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px] ml-9">
                    <span className="text-gray-400">MOQ: <strong className="text-gray-800">{pkg.moq.toLocaleString()} units</strong></span>
                    <span className="text-gray-400">Lead Time: <strong className="text-gray-800">{pkg.leadTime}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="text-sm font-bold text-gray-800 mb-4">Packaging Preview</div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center mb-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-md mb-3">
                {packagingOptions.find(p => p.id === selectedPkg) && (
                  (() => {
                    const IconComponent = packagingOptions.find(p => p.id === selectedPkg).icon;
                    return <IconComponent size={40} className="text-red-600" />;
                  })()
                )}
              </div>
              <div className="font-bold text-[15px] text-gray-800">{packagingOptions.find(p => p.id === selectedPkg)?.name}</div>
              <div className="text-xs text-gray-400 mt-1">{packagingOptions.find(p => p.id === selectedPkg)?.description}</div>
            </div>
            <div className="flex flex-col gap-2">
              {[
                ['Selected Option', packagingOptions.find(p => p.id === selectedPkg)?.name],
                ['Extra Cost per Unit', packagingOptions.find(p => p.id === selectedPkg)?.extraCost],
                ['Minimum Order Qty', (packagingOptions.find(p => p.id === selectedPkg)?.moq.toLocaleString()) + ' units'],
                ['Lead Time', packagingOptions.find(p => p.id === selectedPkg)?.leadTime],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-50 text-[13px]">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-bold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => toast('✅ Packaging applied to quotation')} className={`${btnPrimary} mt-4 w-full justify-center`}>
              <MdCheck size={16} /> Apply to Quotation
            </button>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="mb-4">
            <div className="text-sm font-bold text-gray-800">Delivery Scheduling</div>
            <div className="text-xs text-gray-400 mt-0.5">Plan and schedule bulk order deliveries</div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead><tr>{['Schedule ID','Client','Items','Qty','Delivery Date','Slot','Warehouse','Vehicle','Status','Action'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {schedules.length > 0 ? schedules.map((r, i) => (
                  <tr key={i} className={trCls}>
                    <td className={`${tdCls} font-semibold text-red-700`}>{r.scheduleId}</td>
                    <td className={`${tdCls} font-semibold`}>{r.client}</td>
                    <td className={tdCls}>{
                      Array.isArray(r.items)
                        ? r.items.length
                        : (typeof r.items === 'number' ? r.items : (r.items ? String(r.items) : '—'))
                    }</td>
                    <td className={`${tdCls} font-bold`}>{(r.totalQty || r.qty || 0).toLocaleString()}</td>
                    <td className={tdCls}>{r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}</td>
                    <td className={tdCls}>{r.slot}</td>
                    <td className={tdCls}>{r.warehouse}</td>
                    <td className={`${tdCls} ${r.vehicle === 'Pending' ? 'text-amber-500 font-semibold' : 'font-mono text-xs'}`}>
                      <div className="flex items-center gap-1.5">
                        {r.vehicle === 'Pending' ? <MdClose size={14} /> : <MdCheck size={14} className="text-green-600" />}
                        {r.vehicle}
                      </div>
                    </td>
                    <td className={tdCls}><StatusBadge status={r.status} type={r.status === 'Confirmed' ? 'success' : r.status === 'Pending' ? 'warning' : 'info'} /></td>
                    <td className={tdCls}>
                      <button onClick={async () => { if(window.confirm('Delete schedule?')){ try { await bulkOrderApi.deleteSchedule(r._id); fetchAll(); toast('Deleted'); } catch(e){ toast(e.message,'error'); } } }} className={`${btnSm} bg-red-50 text-red-600 border border-red-200 font-semibold cursor-pointer font-[inherit]`}>Delete</button>
                    </td>
                  </tr>
                )) : (
                  <tr className={trCls}><td colSpan="10" className={`${tdCls} text-center text-gray-400`}>No delivery schedules yet. Click "+ Schedule Delivery" to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal open={showClientModal} onClose={() => setShowClientModal(false)} title="Add Corporate Client"
        footer={<>
          <button className={btnOutline} onClick={() => setShowClientModal(false)}>Cancel</button>
          <button className={btnPrimary} onClick={handleAddCorporateClient}>Save Client</button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className={fieldCls}><label className={labelCls}>Company Name *</label><input className={inputCls} placeholder="e.g. Maruti Suzuki" value={newClientForm.name} onChange={(e) => setNewClientForm({...newClientForm, name: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>Contact Person *</label><input className={inputCls} placeholder="Name" value={newClientForm.contact} onChange={(e) => setNewClientForm({...newClientForm, contact: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>Phone</label><input className={inputCls} type="tel" placeholder="10-digit number" maxLength={10} value={newClientForm.phone} onChange={(e) => setNewClientForm({...newClientForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} /></div>
          <div className={fieldCls}><label className={labelCls}>Email</label><input type="email" className={inputCls} placeholder="email@company.com" value={newClientForm.email} onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>City</label><input className={inputCls} placeholder="City" value={newClientForm.city} onChange={(e) => setNewClientForm({...newClientForm, city: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>Client Tier</label><select className={selectCls} value={newClientForm.tier} onChange={(e) => setNewClientForm({...newClientForm, tier: e.target.value})}><option>Silver</option><option>Gold</option><option>Platinum</option></select></div>
          <div className={fieldCls}><label className={labelCls}>Credit Limit (₹)</label><input type="number" className={inputCls} placeholder="0" value={newClientForm.creditLimit} onChange={(e) => setNewClientForm({...newClientForm, creditLimit: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>GST Number</label><input className={inputCls} placeholder="GSTIN" value={newClientForm.gstNumber} onChange={(e) => setNewClientForm({...newClientForm, gstNumber: e.target.value})} /></div>
          <div className={`${fieldCls} col-span-2`}><label className={labelCls}>Address</label><textarea className={inputCls} placeholder="Full address..." value={newClientForm.address} onChange={(e) => setNewClientForm({...newClientForm, address: e.target.value})} /></div>
        </div>
      </Modal>

      {/* Bulk Quotation Modal */}
      <Modal open={showQuoteModal} onClose={() => setShowQuoteModal(false)} title="Generate Bulk Quotation" size="lg"
        footer={<>
          <button className={btnOutline} onClick={() => { setShowQuoteModal(false); toast('Quotation saved as draft'); }}>Save Draft</button>
          <button className={btnPrimary} onClick={handleAddBulkQuotation} disabled={loading}>{loading ? 'Sending...' : 'Send Quotation'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className={fieldCls}><label className={labelCls}>Corporate Client *</label>
            <select className={selectCls} value={quoteForm.clientId} onChange={e => setQuoteForm(p => ({ ...p, clientId: e.target.value }))}>
              <option value="">Select a client</option>
              {clients.filter(c => c.status === 'Active').map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className={fieldCls}><label className={labelCls}>Validity Date</label>
            <input type="date" className={inputCls} value={quoteForm.validity} onChange={e => setQuoteForm(p => ({ ...p, validity: e.target.value }))} />
          </div>
          <div className={fieldCls}><label className={labelCls}>Packaging Option</label>
            <select className={selectCls} value={quoteForm.packaging} onChange={e => setQuoteForm(p => ({ ...p, packaging: e.target.value }))}>
              {packagingOptions.map(p => <option key={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className={fieldCls}><label className={labelCls}>Payment Terms</label>
            <select className={selectCls} value={quoteForm.paymentTerms} onChange={e => setQuoteForm(p => ({ ...p, paymentTerms: e.target.value }))}>
              <option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option>
            </select>
          </div>
        </div>
        <div className="flex justify-between items-center mb-2.5">
          <div className="font-bold text-[13px] text-gray-800">Line Items</div>
          <button onClick={() => setQuoteItems(p => [...p, { item: '', sku: '', qty: 1, unitPrice: 0, discount: 0 }])} className={`${btnSm} border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]`}>+ Add Row</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
          <table className="w-full">
            <thead><tr>{['Item','SKU','Qty','Unit Price (₹)','Discount %','Total (₹)',''].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {quoteItems.map((item, i) => {
                const rowTotal = Math.round((parseFloat(item.qty)||0)*(parseFloat(item.unitPrice)||0)*(1-(parseFloat(item.discount)||0)/100));
                return (
                  <tr key={i} className={trCls}>
                    <td className={tdCls}><input className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 font-[inherit]" placeholder="Item name" value={item.item} onChange={e => setQuoteItems(p => p.map((it,idx) => idx===i ? {...it, item: e.target.value} : it))} /></td>
                    <td className={tdCls}><input className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 font-[inherit]" placeholder="SKU" value={item.sku} onChange={e => setQuoteItems(p => p.map((it,idx) => idx===i ? {...it, sku: e.target.value} : it))} /></td>
                    <td className={tdCls}><input type="number" className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 font-[inherit]" value={item.qty} onChange={e => setQuoteItems(p => p.map((it,idx) => idx===i ? {...it, qty: e.target.value} : it))} /></td>
                    <td className={tdCls}><input type="number" className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 font-[inherit]" value={item.unitPrice} onChange={e => setQuoteItems(p => p.map((it,idx) => idx===i ? {...it, unitPrice: e.target.value} : it))} /></td>
                    <td className={tdCls}><input type="number" className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:border-red-500 font-[inherit]" value={item.discount} onChange={e => setQuoteItems(p => p.map((it,idx) => idx===i ? {...it, discount: e.target.value} : it))} /></td>
                    <td className={`${tdCls} font-bold`}>₹{rowTotal.toLocaleString()}</td>
                    <td className={tdCls}><button onClick={() => setQuoteItems(p => p.filter((_,idx) => idx!==i))} disabled={quoteItems.length===1} style={{ background:'none', border:'none', cursor: quoteItems.length===1 ? 'not-allowed':'pointer', color:'#ef4444', fontSize:16, padding:4 }}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 max-w-[300px] ml-auto">
          <div className="flex justify-between mb-2 text-[13px]"><span className="text-gray-600">Subtotal</span><span className="font-semibold text-gray-800">₹{Math.round(subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between mb-2 text-[13px]"><span className="text-gray-600">GST (18%)</span><span className="font-semibold text-gray-800">₹{gst.toLocaleString()}</span></div>
          <div className="flex justify-between pt-2 border-t border-gray-200 text-[15px] font-extrabold text-red-700"><span>Grand Total</span><span>₹{grand.toLocaleString()}</span></div>
        </div>
      </Modal>

      {/* Schedule Delivery Modal */}
      <Modal open={showDeliveryModal} onClose={() => setShowDeliveryModal(false)} title="Schedule Delivery"
        footer={<>
          <button className={btnOutline} onClick={() => setShowDeliveryModal(false)}>Cancel</button>
          <button className={btnPrimary} onClick={handleAddDeliverySchedule} disabled={loading}>{loading ? 'Scheduling...' : 'Schedule Delivery'}</button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className={fieldCls}><label className={labelCls}>Quotation ID *</label>
            <select className={selectCls} value={newDeliveryForm.quotationId} onChange={(e) => {
              const quotation = quotations.find(q => q._id === e.target.value);
              if (quotation) {
                const lineItems = quotation.lineItems || [];
                const totalQty = lineItems.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
                setNewDeliveryForm({
                  ...newDeliveryForm,
                  quotationId: e.target.value,
                  client: quotation.client || quotation.clientName || '',
                  items: lineItems.length.toString(),
                  qty: totalQty.toString(),
                });
              } else {
                setNewDeliveryForm({ ...newDeliveryForm, quotationId: e.target.value });
              }
            }}>
              <option value="">Select a quotation</option>
              {quotations.map(q => (
                <option key={q._id} value={q._id}>
                  {q.quotationId} - {q.client || q.clientName}
                </option>
              ))}
            </select>
          </div>
          <div className={fieldCls}><label className={labelCls}>Client *</label>
            <input className={inputCls} placeholder="Auto-filled" value={newDeliveryForm.client} readOnly />
          </div>
          <div className={fieldCls}><label className={labelCls}>Items</label>
            <input type="number" className={inputCls} placeholder="Auto-filled" value={newDeliveryForm.items} readOnly />
          </div>
          <div className={fieldCls}><label className={labelCls}>Quantity</label>
            <input type="number" className={inputCls} placeholder="Auto-filled" value={newDeliveryForm.qty} readOnly />
          </div>
          <div className={fieldCls}><label className={labelCls}>Delivery Date *</label>
            <input type="date" className={inputCls} value={newDeliveryForm.deliveryDate} onChange={(e) => setNewDeliveryForm({...newDeliveryForm, deliveryDate: e.target.value})} />
          </div>
          <div className={fieldCls}><label className={labelCls}>Time Slot *</label>
            <select className={selectCls} value={newDeliveryForm.slot} onChange={(e) => setNewDeliveryForm({...newDeliveryForm, slot: e.target.value})}>
              <option value="">Select slot</option>
              <option value="09:00–11:00">09:00–11:00</option>
              <option value="10:00–12:00">10:00–12:00</option>
              <option value="02:00–04:00">02:00–04:00</option>
              <option value="04:00–06:00">04:00–06:00</option>
            </select>
          </div>
          <div className={fieldCls}><label className={labelCls}>Warehouse</label>
            <select className={selectCls} value={newDeliveryForm.warehouse} onChange={(e) => setNewDeliveryForm({...newDeliveryForm, warehouse: e.target.value})}>
              <option value="">Select a warehouse</option>
              {warehouses.length > 0 ? warehouses.map(w => (
                <option key={w._id} value={w.warehouseId || w.id}>
                  {w.warehouseId || w.id} ({w.name} - {w.location})
                </option>
              )) : (
                <>
                  <option value="WH-01">WH-01 (Mumbai)</option>
                  <option value="WH-02">WH-02 (Pune)</option>
                  <option value="WH-03">WH-03 (Delhi)</option>
                </>
              )}
            </select>
          </div>
          <div className={fieldCls}><label className={labelCls}>Vehicle Number</label>
            <input className={inputCls} placeholder="e.g. MH-12-AB-1234" value={newDeliveryForm.vehicle} onChange={(e) => setNewDeliveryForm({...newDeliveryForm, vehicle: e.target.value})} />
          </div>
          <div className={fieldCls}><label className={labelCls}>Status</label>
            <select className={selectCls} value={newDeliveryForm.status} onChange={(e) => setNewDeliveryForm({...newDeliveryForm, status: e.target.value})}>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* View Client Modal */}
      <Modal open={!!viewClient} onClose={() => setViewClient(null)} title={viewClient?.name || 'Client Details'} size="lg"
        footer={<button className={btnPrimary} onClick={() => setViewClient(null)}>Close</button>}>
        {viewClient && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px 20px', marginBottom: 20 }}>
              {[['Client ID', viewClient.clientId], ['Company', viewClient.name], ['Contact', viewClient.contact],
                ['Phone', viewClient.phone], ['Email', viewClient.email], ['City', viewClient.city],
                ['Tier', viewClient.tier], ['Credit Limit', fmtMoney(viewClient.creditLimit)],
                ['Outstanding', fmtMoney(viewClient.outstanding)], ['Status', viewClient.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {label === 'Tier' ? <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: (tierColor[value]||'#6b7280')+'20', color: tierColor[value]||'#6b7280' }}>{value}</span>
                    : label === 'Status' ? <StatusBadge status={value} />
                    : value || '—'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>RECENT QUOTATIONS</div>
              {quotations.filter(q => q.clientId?._id === viewClient._id || q.clientId === viewClient._id).length === 0
                ? <div style={{ fontSize: 13, color: '#94a3b8' }}>No quotations for this client yet.</div>
                : quotations.filter(q => q.clientId?._id === viewClient._id || q.clientId === viewClient._id).map((q, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{q.quoteId}</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 10 }}>{fmtMoney(q.grandTotal)}</span>
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </Modal>

      {/* View Quote Modal */}
      <Modal open={!!viewQuote} onClose={() => setViewQuote(null)} title={`Quotation: ${viewQuote?.quoteId || ''}`} size="lg"
        footer={<button className={btnPrimary} onClick={() => setViewQuote(null)}>Close</button>}>
        {viewQuote && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px 20px', marginBottom: 20 }}>
              {[['Quote ID', viewQuote.quotationId], ['Client', viewQuote.client], ['Packaging', viewQuote.packaging],
                ['Payment Terms', viewQuote.paymentTerms || 'Net 30'], ['Grand Total', fmtMoney(viewQuote.value || viewQuote.grandTotal)],
                ['Valid Till', viewQuote.validity ? new Date(viewQuote.validity).toLocaleDateString('en-IN') : '—'],
                ['Status', viewQuote.status],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {label === 'Status' ? <StatusBadge status={value} /> : value || '—'}
                  </div>
                </div>
              ))}
            </div>
            {Array.isArray(viewQuote.lineItems) && viewQuote.lineItems.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>LINE ITEMS</div>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      {['Item','SKU','Qty','Unit Price','Discount','Total'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {viewQuote.lineItems.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{it.item}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#ef4444' }}>{it.sku || '—'}</td>
                          <td style={{ padding: '10px 12px' }}>{it.qty}</td>
                          <td style={{ padding: '10px 12px' }}>₹{(it.unitPrice||0).toLocaleString()}</td>
                          <td style={{ padding: '10px 12px' }}>{it.discount || 0}%</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e40af' }}>₹{(it.total||0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}