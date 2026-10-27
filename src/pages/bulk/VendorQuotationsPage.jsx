import { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdCheck, MdVisibility, MdDelete, MdAccessTime, MdInventory, MdLocalShipping, MdPeople } from 'react-icons/md';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { rfqApi } from '../../api/rfqApi';
import { vendorApi } from '../../api/vendorApi';

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]";
const labelCls = "text-xs font-semibold text-gray-600";
const fieldCls = "flex flex-col gap-1.5 mb-4";
const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]";
const btnOutline = "inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]";
const btnSm = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg";

export default function VendorQuotationsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rfqs, setRfqs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreateRFQModal, setShowCreateRFQModal] = useState(false);
  const [showViewRFQModal, setShowViewRFQModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [viewRFQ, setViewRFQ] = useState(null);

  // Form states
  const [rfqForm, setRfqForm] = useState({
    title: '',
    vendors: [],
    items: [{ name: '', qty: 1, unit: 'Pieces', spec: '', requiredDate: '' }],
    dueDate: '',
    priority: 'Normal',
    remarks: ''
  });

  const [quotationForm, setQuotationForm] = useState({
    vendor: '',
    items: [],
    totalAmount: 0,
    validUntil: '',
    remarks: ''
  });

  // Utility functions
  const fmtMoney = (v) => typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : (v || '₹0');

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rfqsRes, vendorsRes] = await Promise.allSettled([
        rfqApi.getAll(),
        vendorApi.getAll({ status: 'Active' })
      ]);
      
      if (rfqsRes.status === 'fulfilled') setRfqs(rfqsRes.value.data || []);
      if (vendorsRes.status === 'fulfilled') setVendors(vendorsRes.value.data || []);
      
      // Calculate stats
      const rfqData = rfqsRes.status === 'fulfilled' ? rfqsRes.value.data || [] : [];
      const statsData = {
        totalRFQs: rfqData.length,
        pendingQuotes: rfqData.filter(r => r.status === 'Sent').length,
        quotedRFQs: rfqData.filter(r => r.status === 'Quoted').length,
        totalValue: rfqData.reduce((sum, rfq) => {
          const maxQuote = rfq.quotations?.reduce((max, q) => 
            q.totalAmount > (max?.totalAmount || 0) ? q : max, null);
          return sum + (maxQuote?.totalAmount || 0);
        }, 0)
      };
      setStats(statsData);
    } catch (e) {
      console.error('Error fetching data:', e);
      toast('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // KPI data
  const kpis = [
    { label: 'Total RFQs', value: stats.totalRFQs || 0, color: '#8b5cf6', icon: MdInventory },
    { label: 'Pending Quotes', value: stats.pendingQuotes || 0, color: '#f59e0b', icon: MdAccessTime },
    { label: 'Quoted RFQs', value: stats.quotedRFQs || 0, color: '#10b981', icon: MdCheck },
    { label: 'Total Value', value: stats.totalValue ? `₹${(stats.totalValue/100000).toFixed(1)}L` : '₹0', color: '#1e40af', icon: MdLocalShipping }
  ];

  // Tab configuration
  const tabs = [
    { id: 0, label: 'All RFQs', count: rfqs.length },
    { id: 1, label: 'Pending Quotes', count: rfqs.filter(r => r.status === 'Sent').length },
    { id: 2, label: 'Quoted', count: rfqs.filter(r => r.status === 'Quoted').length },
    { id: 3, label: 'Vendor Analysis', count: vendors.length }
  ];

  // Handle create RFQ
  const handleCreateRFQ = async () => {
    if (!rfqForm.title || !rfqForm.dueDate || rfqForm.vendors.length === 0) {
      toast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await rfqApi.create({
        ...rfqForm,
        createdBy: 'System', // You can get this from auth context
        items: rfqForm.items.filter(item => item.name.trim())
      });
      
      setRfqs(prev => [res.data, ...prev]);
      setShowCreateRFQModal(false);
      resetRFQForm();
      toast('RFQ created and sent to vendors successfully');
      fetchAll();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle add quotation
  const handleAddQuotation = async () => {
    if (!quotationForm.vendor || quotationForm.items.length === 0) {
      toast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      await rfqApi.addQuotation(selectedRFQ._id, quotationForm);
      setShowQuotationModal(false);
      setSelectedRFQ(null);
      resetQuotationForm();
      fetchAll();
      toast('Vendor quotation added successfully');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset forms
  const resetRFQForm = () => {
    setRfqForm({
      title: '',
      vendors: [],
      items: [{ name: '', qty: 1, unit: 'Pieces', spec: '', requiredDate: '' }],
      dueDate: '',
      priority: 'Normal',
      remarks: ''
    });
  };

  const resetQuotationForm = () => {
    setQuotationForm({
      vendor: '',
      items: [],
      totalAmount: 0,
      validUntil: '',
      remarks: ''
    });
  };

  // Filter RFQs based on active tab
  const getFilteredRFQs = () => {
    switch (activeTab) {
      case 1: return rfqs.filter(r => r.status === 'Sent');
      case 2: return rfqs.filter(r => r.status === 'Quoted');
      default: return rfqs;
    }
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendor Quotations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage RFQs and vendor quotations for bulk orders</p>
        </div>
        <button 
          onClick={() => setShowCreateRFQModal(true)}
          className={btnPrimary}
        >
          <MdAdd size={16} /> New RFQ
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, i) => {
          const IconComponent = kpi.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-black tracking-tight" style={{ color: kpi.color }}>
                  {kpi.value}
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: kpi.color + '20', color: kpi.color }}>
                  <IconComponent size={20} />
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-red-700 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label} {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
          </button>
        ))}
      </div>
      {/* RFQs Table */}
      {activeTab < 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : getFilteredRFQs().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No RFQs found. Click "New RFQ" to create one.
            </div>
          ) : (
            <DataTable
              columns={[
                { 
                  key: 'rfqId', 
                  label: 'RFQ ID', 
                  render: v => <span className="font-semibold text-red-700">{v}</span> 
                },
                { 
                  key: 'title', 
                  label: 'Title', 
                  render: v => <span className="font-semibold">{v}</span> 
                },
                { 
                  key: 'vendors', 
                  label: 'Vendors', 
                  render: v => Array.isArray(v) ? `${v.length} vendors` : '0 vendors'
                },
                { 
                  key: 'items', 
                  label: 'Items', 
                  render: v => Array.isArray(v) ? `${v.length} items` : '0 items'
                },
                { 
                  key: 'dueDate', 
                  label: 'Due Date', 
                  render: v => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
                },
                { 
                  key: 'priority', 
                  label: 'Priority', 
                  render: v => (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      v === 'Critical' ? 'bg-red-100 text-red-800' :
                      v === 'Urgent' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {v}
                    </span>
                  )
                },
                { 
                  key: 'status', 
                  label: 'Status', 
                  render: v => (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      v === 'Quoted' ? 'bg-green-100 text-green-800' :
                      v === 'Sent' ? 'bg-blue-100 text-blue-800' :
                      v === 'Closed' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {v}
                    </span>
                  )
                },
                { 
                  key: 'quotations', 
                  label: 'Quotes Received', 
                  render: (_, row) => {
                    const quoteCount = row.quotations?.length || 0;
                    const bestQuote = row.quotations?.reduce((min, q) => 
                      q.totalAmount < (min?.totalAmount || Infinity) ? q : min, null);
                    return (
                      <div>
                        <span className="font-bold text-green-600">{quoteCount} quotes</span>
                        {bestQuote && (
                          <div className="text-xs text-gray-500">
                            Best: {fmtMoney(bestQuote.totalAmount)}
                          </div>
                        )}
                      </div>
                    );
                  }
                },
                { 
                  key: '_id', 
                  label: 'Actions', 
                  render: (_, row) => (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => { setViewRFQ(row); setShowViewRFQModal(true); }}
                        className={`${btnSm} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`}
                      >
                        <MdVisibility size={12} /> View
                      </button>
                      {row.status === 'Sent' && (
                        <button 
                          onClick={() => { 
                            setSelectedRFQ(row); 
                            setQuotationForm(prev => ({
                              ...prev,
                              items: row.items?.map(item => ({
                                name: item.name,
                                qty: item.qty,
                                unit: item.unit,
                                unitPrice: 0,
                                totalPrice: 0
                              })) || []
                            }));
                            setShowQuotationModal(true); 
                          }}
                          className={`${btnSm} bg-green-100 text-green-700 hover:bg-green-200`}
                        >
                          <MdAdd size={12} /> Add Quote
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              data={getFilteredRFQs()}
            />
          )}
        </div>
      )}

      {/* Vendor Analysis Tab */}
      {activeTab === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">Vendor Performance Analysis</h3>
            <p className="text-sm text-gray-500">Compare vendor quotations and performance</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map(vendor => {
              const vendorRFQs = rfqs.filter(rfq => 
                rfq.vendors?.some(v => v._id === vendor._id)
              );
              const vendorQuotes = rfqs.flatMap(rfq => 
                rfq.quotations?.filter(q => q.vendor?._id === vendor._id) || []
              );
              const avgQuoteValue = vendorQuotes.length > 0 
                ? vendorQuotes.reduce((sum, q) => sum + q.totalAmount, 0) / vendorQuotes.length 
                : 0;
              const responseRate = vendorRFQs.length > 0 
                ? (vendorQuotes.length / vendorRFQs.length * 100).toFixed(1) 
                : 0;

              return (
                <div key={vendor._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                      <MdPeople size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{vendor.companyName}</h4>
                      <p className="text-xs text-gray-500">{vendor.vendorId}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">RFQs Sent:</span>
                      <span className="font-semibold">{vendorRFQs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quotes Received:</span>
                      <span className="font-semibold">{vendorQuotes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Rate:</span>
                      <span className={`font-semibold ${responseRate >= 80 ? 'text-green-600' : responseRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {responseRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Quote Value:</span>
                      <span className="font-semibold">{fmtMoney(avgQuoteValue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Create RFQ Modal */}
      <Modal 
        open={showCreateRFQModal} 
        onClose={() => setShowCreateRFQModal(false)} 
        title="Create Request for Quotation (RFQ)"
        size="lg"
        footer={
          <>
            <button className={btnOutline} onClick={() => setShowCreateRFQModal(false)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={handleCreateRFQ} disabled={loading}>
              {loading ? 'Creating...' : 'Send RFQ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={fieldCls}>
            <label className={labelCls}>RFQ Title *</label>
            <input 
              className={inputCls} 
              placeholder="e.g. Bulk Bottle Manufacturing RFQ"
              value={rfqForm.title} 
              onChange={e => setRfqForm(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Due Date *</label>
            <input 
              type="date" 
              className={inputCls} 
              value={rfqForm.dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setRfqForm(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={fieldCls}>
            <label className={labelCls}>Priority</label>
            <select 
              className={selectCls} 
              value={rfqForm.priority} 
              onChange={e => setRfqForm(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Select Vendors *</label>
            <select 
              className={selectCls} 
              multiple
              value={rfqForm.vendors} 
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setRfqForm(prev => ({ ...prev, vendors: selected }));
              }}
            >
              {vendors.map(vendor => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.companyName} ({vendor.vendorId})
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Hold Ctrl/Cmd to select multiple vendors. Selected: {rfqForm.vendors.length}
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className={labelCls}>Items Required *</label>
            <button 
              onClick={() => setRfqForm(prev => ({
                ...prev,
                items: [...prev.items, { name: '', qty: 1, unit: 'Pieces', spec: '', requiredDate: '' }]
              }))}
              className={`${btnSm} border border-red-600 text-red-700 bg-transparent`}
            >
              <MdAdd size={12} /> Add Item
            </button>
          </div>
          
          {rfqForm.items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Item Name</label>
                  <input 
                    className={inputCls}
                    placeholder="e.g. Plastic Bottle"
                    value={item.name}
                    onChange={e => {
                      const newItems = [...rfqForm.items];
                      newItems[index].name = e.target.value;
                      setRfqForm(prev => ({ ...prev, items: newItems }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                  <input 
                    type="number"
                    className={inputCls}
                    placeholder="1000"
                    value={item.qty}
                    onChange={e => {
                      const newItems = [...rfqForm.items];
                      newItems[index].qty = parseInt(e.target.value) || 0;
                      setRfqForm(prev => ({ ...prev, items: newItems }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                  <select 
                    className={selectCls}
                    value={item.unit}
                    onChange={e => {
                      const newItems = [...rfqForm.items];
                      newItems[index].unit = e.target.value;
                      setRfqForm(prev => ({ ...prev, items: newItems }));
                    }}
                  >
                    <option value="Pieces">Pieces</option>
                    <option value="Kg">Kg</option>
                    <option value="Liter">Liter</option>
                    <option value="Meter">Meter</option>
                    <option value="Box">Box</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {rfqForm.items.length > 1 && (
                    <button 
                      onClick={() => {
                        const newItems = rfqForm.items.filter((_, i) => i !== index);
                        setRfqForm(prev => ({ ...prev, items: newItems }));
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <MdDelete size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Specifications</label>
                  <input 
                    className={inputCls}
                    placeholder="Material, size, color, etc."
                    value={item.spec}
                    onChange={e => {
                      const newItems = [...rfqForm.items];
                      newItems[index].spec = e.target.value;
                      setRfqForm(prev => ({ ...prev, items: newItems }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Required Date</label>
                  <input 
                    type="date"
                    className={inputCls}
                    value={item.requiredDate}
                    onChange={e => {
                      const newItems = [...rfqForm.items];
                      newItems[index].requiredDate = e.target.value;
                      setRfqForm(prev => ({ ...prev, items: newItems }));
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Additional Remarks</label>
          <textarea 
            className={inputCls}
            rows={3}
            placeholder="Any special requirements or notes for vendors..."
            value={rfqForm.remarks}
            onChange={e => setRfqForm(prev => ({ ...prev, remarks: e.target.value }))}
          />
        </div>
      </Modal>
      {/* Add Quotation Modal */}
      <Modal 
        open={showQuotationModal} 
        onClose={() => setShowQuotationModal(false)} 
        title={`Add Vendor Quotation - ${selectedRFQ?.rfqId || ''}`}
        size="lg"
        footer={
          <>
            <button className={btnOutline} onClick={() => setShowQuotationModal(false)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={handleAddQuotation} disabled={loading}>
              {loading ? 'Adding...' : 'Add Quotation'}
            </button>
          </>
        }
      >
        {selectedRFQ && (
          <div>
            {/* RFQ Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">RFQ ID</span>
                  <span className="font-bold text-red-700">{selectedRFQ.rfqId}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">Title</span>
                  <span className="font-semibold">{selectedRFQ.title}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs mb-0.5">Due Date</span>
                  <span className="font-semibold">
                    {selectedRFQ.dueDate
                      ? new Date(selectedRFQ.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vendor selection */}
            <div className={fieldCls}>
              <label className={labelCls}>Vendor *</label>
              <select
                className={selectCls}
                value={quotationForm.vendor}
                onChange={e => setQuotationForm(prev => ({ ...prev, vendor: e.target.value }))}
              >
                <option value="">— Select Vendor —</option>
                {(selectedRFQ.vendors || []).map(v => {
                  const vendorObj = vendors.find(vd => vd._id === (v._id || v));
                  return (
                    <option key={v._id || v} value={v._id || v}>
                      {vendorObj?.companyName || v.companyName || v}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Item pricing */}
            <div className="mb-4">
              <label className={labelCls + ' block mb-2'}>Item Pricing *</label>
              {quotationForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-3 mb-2 items-end border border-gray-100 rounded-lg p-3">
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 block mb-1">Item</span>
                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.qty} {item.unit}</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className={inputCls}
                      placeholder="0"
                      value={item.unitPrice || ''}
                      onChange={e => {
                        const updated = [...quotationForm.items];
                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                        updated[idx].totalPrice = updated[idx].unitPrice * (updated[idx].qty || 0);
                        const total = updated.reduce((s, i) => s + (i.totalPrice || 0), 0);
                        setQuotationForm(prev => ({ ...prev, items: updated, totalAmount: total }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Total (₹)</label>
                    <span className="text-sm font-bold text-gray-800 block py-2">
                      {fmtMoney(item.totalPrice || 0)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-end mt-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-bold text-gray-700 mr-3">Grand Total:</span>
                <span className="text-base font-black text-red-700">{fmtMoney(quotationForm.totalAmount)}</span>
              </div>
            </div>

            {/* Valid until + remarks */}
            <div className="grid grid-cols-2 gap-4">
              <div className={fieldCls}>
                <label className={labelCls}>Valid Until</label>
                <input
                  type="date"
                  className={inputCls}
                  value={quotationForm.validUntil}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setQuotationForm(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Remarks</label>
                <input
                  className={inputCls}
                  placeholder="Delivery terms, lead time, etc."
                  value={quotationForm.remarks}
                  onChange={e => setQuotationForm(prev => ({ ...prev, remarks: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* View RFQ Modal */}
      <Modal
        open={showViewRFQModal}
        onClose={() => { setShowViewRFQModal(false); setViewRFQ(null); }}
        title={`RFQ Details — ${viewRFQ?.rfqId || ''}`}
        size="lg"
      >
        {viewRFQ && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
              {[
                ['RFQ ID',    viewRFQ.rfqId],
                ['Title',     viewRFQ.title],
                ['Status',    viewRFQ.status],
                ['Priority',  viewRFQ.priority],
                ['Due Date',  viewRFQ.dueDate ? new Date(viewRFQ.dueDate).toLocaleDateString('en-IN') : '—'],
                ['Vendors',   `${viewRFQ.vendors?.length || 0} selected`],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-xs text-gray-500 block mb-0.5">{k}</span>
                  <span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>

            {/* Items */}
            <div>
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Items Requested</div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Item', 'Qty', 'Unit', 'Spec', 'Required By'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(viewRFQ.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-semibold">{item.name}</td>
                        <td className="px-3 py-2">{item.qty?.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{item.unit}</td>
                        <td className="px-3 py-2 text-gray-500">{item.spec || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {item.requiredDate ? new Date(item.requiredDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quotations received */}
            {(viewRFQ.quotations || []).length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Quotations Received ({viewRFQ.quotations.length})
                </div>
                <div className="space-y-2">
                  {viewRFQ.quotations.map((q, i) => {
                    const vendorObj = vendors.find(v => v._id === (q.vendor?._id || q.vendor));
                    return (
                      <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <span className="font-semibold text-sm">{vendorObj?.companyName || q.vendor?.companyName || 'Vendor'}</span>
                          {q.remarks && <span className="text-xs text-gray-500 ml-2">— {q.remarks}</span>}
                        </div>
                        <div className="text-right">
                          <div className="font-black text-red-700">{fmtMoney(q.totalAmount)}</div>
                          {q.validUntil && (
                            <div className="text-xs text-gray-400">
                              Valid till {new Date(q.validUntil).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewRFQ.remarks && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <strong>Remarks:</strong> {viewRFQ.remarks}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}