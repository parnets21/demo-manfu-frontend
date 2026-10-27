import { useState, useEffect, useCallback } from 'react';
import { MdAdd, MdCheck, MdClose, MdVisibility, MdEdit, MdDelete, MdAccessTime, MdInventory, MdLocalShipping, MdBuild } from 'react-icons/md';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { bulkQuotationRequestApi } from '../../api/bulkQuotationRequestApi';
import { corporateClientApi } from '../../api/corporateClientApi';

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]";
const labelCls = "text-xs font-semibold text-gray-600";
const fieldCls = "flex flex-col gap-1.5 mb-4";
const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]";
const btnOutline = "inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]";
const btnSm = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg";

export default function BulkQuotationRequestPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [corporateClients, setCorporateClients] = useState([]);
  const [stats, setStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);

  // Form states
  const [requestForm, setRequestForm] = useState({
    clientId: '',
    deliveryDate: '',
    products: [{ productName: 'Bottle', productType: 'Bottle', quantity: 100000, unit: 'Pieces', specifications: {} }],
    packaging: { type: 'Custom', customBranding: false, brandingDetails: {} },
    paymentTerms: 'Net 30',
    creditTerms: { creditRequired: false, creditAmount: 0, creditPeriod: 30 },
    notes: ''
  });

  const [approvalForm, setApprovalForm] = useState({
    estimatedCost: '',
    sellingPrice: '',
    approvalNotes: ''
  });
  // Utility functions
  const fmtMoney = (v) => typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : (v || '₹0');
  const fmtQuantity = (qty, unit) => `${qty?.toLocaleString('en-IN') || 0} ${unit || 'Pieces'}`;

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [requestsRes, clientsRes, statsRes] = await Promise.allSettled([
        bulkQuotationRequestApi.getAll(),
        corporateClientApi.getAll({ status: 'Active' }),
        bulkQuotationRequestApi.getDashboardStats()
      ]);
      
      if (requestsRes.status === 'fulfilled') setRequests(requestsRes.value.data || []);
      if (clientsRes.status === 'fulfilled') setCorporateClients(clientsRes.value.data || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
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
    { label: 'Total Requests', value: stats.totalRequests || 0, color: '#8b5cf6', icon: MdInventory },
    { label: 'Pending Approval', value: stats.pendingApproval || 0, color: '#f59e0b', icon: MdAccessTime },
    { label: 'Approved', value: stats.approved || 0, color: '#10b981', icon: MdCheck },
    { label: 'Pipeline Value', value: stats.pipelineValue ? `₹${(stats.pipelineValue/100000).toFixed(1)}L` : '₹0', color: '#1e40af', icon: MdLocalShipping }
  ];

  // Tab configuration
  const tabs = [
    { id: 0, label: 'All Requests', count: requests.length },
    { id: 1, label: 'Pending Approval', count: requests.filter(r => r.status === 'Submitted').length },
    { id: 2, label: 'Approved', count: requests.filter(r => r.status === 'Approved').length },
    { id: 3, label: 'In Production', count: requests.filter(r => r.productionPlan?.manufacturingRequired).length }
  ];
  // Handle create request
  const handleCreateRequest = async () => {
    const validation = bulkQuotationRequestApi.validateRequestData(requestForm);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      toast(firstError, 'error');
      return;
    }

    setLoading(true);
    try {
      const formattedData = bulkQuotationRequestApi.formatRequestData(requestForm);
      const res = await bulkQuotationRequestApi.create(formattedData);
      
      setRequests(prev => [res.data.request, ...prev]);
      setShowCreateModal(false);
      resetRequestForm();
      toast('Bulk quotation request created successfully');
      fetchAll();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle submit for approval
  const handleSubmitForApproval = async (requestId) => {
    try {
      await bulkQuotationRequestApi.submitForApproval(requestId);
      fetchAll();
      toast('Request submitted for approval');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  // Handle approval
  const handleApproveRequest = async () => {
    if (!approvalForm.estimatedCost || !approvalForm.sellingPrice) {
      toast('Please fill all pricing details', 'error');
      return;
    }

    setLoading(true);
    try {
      await bulkQuotationRequestApi.approve(selectedRequest._id, {
        estimatedCost: parseFloat(approvalForm.estimatedCost),
        sellingPrice: parseFloat(approvalForm.sellingPrice),
        approvalNotes: approvalForm.approvalNotes
      });
      
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalForm({ estimatedCost: '', sellingPrice: '', approvalNotes: '' });
      fetchAll();
      toast('Request approved successfully');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle inventory check
  const handleInventoryCheck = async (requestId) => {
    try {
      await bulkQuotationRequestApi.performInventoryCheck(requestId);
      fetchAll();
      toast('Inventory check completed');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  // Reset form
  const resetRequestForm = () => {
    setRequestForm({
      clientId: '',
      deliveryDate: '',
      products: [{ productName: 'Bottle', productType: 'Bottle', quantity: 100000, unit: 'Pieces', specifications: {} }],
      packaging: { type: 'Custom', customBranding: false, brandingDetails: {} },
      paymentTerms: 'Net 30',
      creditTerms: { creditRequired: false, creditAmount: 0, creditPeriod: 30 },
      notes: ''
    });
  };
  // Filter requests based on active tab
  const getFilteredRequests = () => {
    switch (activeTab) {
      case 1: return requests.filter(r => r.status === 'Submitted');
      case 2: return requests.filter(r => r.status === 'Approved');
      case 3: return requests.filter(r => r.productionPlan?.manufacturingRequired);
      default: return requests;
    }
  };

  return (
    <div>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bulk Quotation Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage client requirements and quotation workflow</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className={btnPrimary}
        >
          <MdAdd size={16} /> New Request
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
      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : getFilteredRequests().length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No requests found. Click "New Request" to create one.
          </div>
        ) : (
          <DataTable
            columns={[
              { 
                key: 'requestId', 
                label: 'Request ID', 
                render: v => <span className="font-semibold text-red-700">{v}</span> 
              },
              { 
                key: 'clientName', 
                label: 'Client', 
                render: v => <span className="font-semibold">{v}</span> 
              },
              { 
                key: 'products', 
                label: 'Products', 
                render: v => Array.isArray(v) ? `${v.length} items` : '0 items'
              },
              { 
                key: 'products', 
                label: 'Total Qty', 
                render: (_, row) => {
                  const totalQty = Array.isArray(row.products) 
                    ? row.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
                    : 0;
                  return fmtQuantity(totalQty, 'Pieces');
                }
              },
              { 
                key: 'deliveryDate', 
                label: 'Delivery Date', 
                render: v => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
              },
              { 
                key: 'status', 
                label: 'Status', 
                render: v => (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${bulkQuotationRequestApi.getStatusColor(v)}`}>
                    {bulkQuotationRequestApi.getStatusIcon(v)} {v}
                  </span>
                )
              },
              { 
                key: 'approvalDetails', 
                label: 'Est. Value', 
                render: (_, row) => {
                  const value = row.approvalDetails?.priceApproval?.sellingPrice;
                  return value ? <span className="font-bold text-green-600">{fmtMoney(value)}</span> : '—';
                }
              },
              { 
                key: '_id', 
                label: 'Actions', 
                render: (_, row) => (
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => { setViewRequest(row); setShowViewModal(true); }}
                      className={`${btnSm} border border-gray-300 text-gray-700 bg-white hover:bg-gray-50`}
                    >
                      <MdVisibility size={12} /> View
                    </button>
                    {row.status === 'Draft' && (
                      <button 
                        onClick={() => handleSubmitForApproval(row._id)}
                        className={`${btnSm} bg-blue-100 text-blue-700 hover:bg-blue-200`}
                      >
                        Submit
                      </button>
                    )}
                    {row.status === 'Submitted' && (
                      <button 
                        onClick={() => { setSelectedRequest(row); setShowApprovalModal(true); }}
                        className={`${btnSm} bg-green-100 text-green-700 hover:bg-green-200`}
                      >
                        <MdCheck size={12} /> Approve
                      </button>
                    )}
                    {row.status === 'Approved' && !row.inventoryCheck?.checkedAt && (
                      <button 
                        onClick={() => handleInventoryCheck(row._id)}
                        className={`${btnSm} bg-yellow-100 text-yellow-700 hover:bg-yellow-200`}
                      >
                        <MdInventory size={12} /> Check Stock
                      </button>
                    )}
                  </div>
                )
              }
            ]}
            data={getFilteredRequests()}
          />
        )}
      </div>
      {/* Create Request Modal */}
      <Modal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        title="Create Bulk Quotation Request"
        size="lg"
        footer={
          <>
            <button className={btnOutline} onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={handleCreateRequest} disabled={loading}>
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={fieldCls}>
            <label className={labelCls}>Corporate Client *</label>
            <select 
              className={selectCls} 
              value={requestForm.clientId} 
              onChange={e => setRequestForm(prev => ({ ...prev, clientId: e.target.value }))}
            >
              <option value="">Select a client</option>
              {corporateClients.map(client => (
                <option key={client._id} value={client._id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Delivery Date *</label>
            <input 
              type="date" 
              className={inputCls} 
              value={requestForm.deliveryDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setRequestForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <label className={labelCls}>Products *</label>
            <button 
              onClick={() => setRequestForm(prev => ({
                ...prev,
                products: [...prev.products, { productName: 'Bottle', productType: 'Bottle', quantity: 100000, unit: 'Pieces', specifications: {} }]
              }))}
              className={`${btnSm} border border-red-600 text-red-700 bg-transparent`}
            >
              <MdAdd size={12} /> Add Product
            </button>
          </div>
          
          {requestForm.products.map((product, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Product Name</label>
                  <input 
                    className={inputCls}
                    placeholder="e.g. Bottle"
                    value={product.productName}
                    onChange={e => {
                      const newProducts = [...requestForm.products];
                      newProducts[index].productName = e.target.value;
                      setRequestForm(prev => ({ ...prev, products: newProducts }));
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Type</label>
                  <select 
                    className={selectCls}
                    value={product.productType}
                    onChange={e => {
                      const newProducts = [...requestForm.products];
                      newProducts[index].productType = e.target.value;
                      setRequestForm(prev => ({ ...prev, products: newProducts }));
                    }}
                  >
                    <option value="Bottle">Bottle</option>
                    <option value="Container">Container</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                    <input 
                      type="number"
                      className={inputCls}
                      placeholder="1 lakh = 100000"
                      value={product.quantity}
                      onChange={e => {
                        const newProducts = [...requestForm.products];
                        newProducts[index].quantity = parseInt(e.target.value) || 0;
                        setRequestForm(prev => ({ ...prev, products: newProducts }));
                      }}
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500 mb-1 block">Unit</label>
                    <select 
                      className={selectCls}
                      value={product.unit}
                      onChange={e => {
                        const newProducts = [...requestForm.products];
                        newProducts[index].unit = e.target.value;
                        setRequestForm(prev => ({ ...prev, products: newProducts }));
                      }}
                    >
                      <option value="Pieces">Pieces</option>
                      <option value="Lakh">Lakh</option>
                      <option value="Crore">Crore</option>
                    </select>
                  </div>
                  {requestForm.products.length > 1 && (
                    <button 
                      onClick={() => {
                        const newProducts = requestForm.products.filter((_, i) => i !== index);
                        setRequestForm(prev => ({ ...prev, products: newProducts }));
                      }}
                      className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <MdDelete size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Packaging & Terms */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={fieldCls}>
            <label className={labelCls}>Packaging Type</label>
            <select 
              className={selectCls}
              value={requestForm.packaging.type}
              onChange={e => setRequestForm(prev => ({
                ...prev,
                packaging: { ...prev.packaging, type: e.target.value }
              }))}
            >
              <option value="Standard">Standard</option>
              <option value="Custom">Custom</option>
              <option value="Premium">Premium</option>
              <option value="Bulk">Bulk</option>
            </select>
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Payment Terms</label>
            <select 
              className={selectCls}
              value={requestForm.paymentTerms}
              onChange={e => setRequestForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
            >
              <option value="Advance">Advance</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
            </select>
          </div>
        </div>

        <div className={fieldCls}>
          <label className={labelCls}>Special Requirements</label>
          <textarea 
            className={inputCls}
            rows={3}
            placeholder="Any special requirements or notes..."
            value={requestForm.notes}
            onChange={e => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Approval Modal */}
      <Modal 
        open={showApprovalModal} 
        onClose={() => setShowApprovalModal(false)} 
        title="Approve Request - Price Approval"
        footer={
          <>
            <button className={btnOutline} onClick={() => setShowApprovalModal(false)}>
              Cancel
            </button>
            <button className={btnPrimary} onClick={handleApproveRequest} disabled={loading}>
              {loading ? 'Approving...' : 'Approve Request'}
            </button>
          </>
        }
      >
        {selectedRequest && (
          <div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Request Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Request ID:</span> <span className="font-semibold">{selectedRequest.requestId}</span></div>
                <div><span className="text-gray-500">Client:</span> <span className="font-semibold">{selectedRequest.clientName}</span></div>
                <div><span className="text-gray-500">Products:</span> <span className="font-semibold">{selectedRequest.products?.length || 0} items</span></div>
                <div><span className="text-gray-500">Delivery:</span> <span className="font-semibold">{new Date(selectedRequest.deliveryDate).toLocaleDateString('en-IN')}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={fieldCls}>
                <label className={labelCls}>Estimated Cost (₹) *</label>
                <input 
                  type="number"
                  className={inputCls}
                  placeholder="Enter estimated cost"
                  value={approvalForm.estimatedCost}
                  onChange={e => setApprovalForm(prev => ({ ...prev, estimatedCost: e.target.value }))}
                />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Selling Price (₹) *</label>
                <input 
                  type="number"
                  className={inputCls}
                  placeholder="Enter selling price"
                  value={approvalForm.sellingPrice}
                  onChange={e => setApprovalForm(prev => ({ ...prev, sellingPrice: e.target.value }))}
                />
              </div>
            </div>

            {approvalForm.estimatedCost && approvalForm.sellingPrice && (
              <div className="bg-green-50 rounded-lg p-3 mb-4">
                <div className="text-sm">
                  <span className="text-gray-600">Margin: </span>
                  <span className="font-bold text-green-700">
                    ₹{(parseFloat(approvalForm.sellingPrice) - parseFloat(approvalForm.estimatedCost)).toLocaleString('en-IN')} 
                    ({(((parseFloat(approvalForm.sellingPrice) - parseFloat(approvalForm.estimatedCost)) / parseFloat(approvalForm.sellingPrice)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}

            <div className={fieldCls}>
              <label className={labelCls}>Approval Notes</label>
              <textarea 
                className={inputCls}
                rows={3}
                placeholder="Add any approval notes..."
                value={approvalForm.approvalNotes}
                onChange={e => setApprovalForm(prev => ({ ...prev, approvalNotes: e.target.value }))}
              />
            </div>
          </div>
        )}
      </Modal>
      {/* View Request Modal */}
      <Modal 
        open={showViewModal} 
        onClose={() => setShowViewModal(false)} 
        title={`Request Details - ${viewRequest?.requestId || ''}`}
        size="lg"
        footer={
          <button className={btnPrimary} onClick={() => setShowViewModal(false)}>
            Close
          </button>
        }
      >
        {viewRequest && (
          <div>
            {/* Request Info */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">REQUEST ID</div>
                <div className="font-bold text-red-700">{viewRequest.requestId}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">CLIENT</div>
                <div className="font-semibold">{viewRequest.clientName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">STATUS</div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${bulkQuotationRequestApi.getStatusColor(viewRequest.status)}`}>
                  {bulkQuotationRequestApi.getStatusIcon(viewRequest.status)} {viewRequest.status}
                </span>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">DELIVERY DATE</div>
                <div className="font-semibold">{new Date(viewRequest.deliveryDate).toLocaleDateString('en-IN')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">PAYMENT TERMS</div>
                <div className="font-semibold">{viewRequest.paymentTerms}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-1">PACKAGING</div>
                <div className="font-semibold">{viewRequest.packaging?.type || '—'}</div>
              </div>
            </div>

            {/* Products */}
            <div className="mb-6">
              <div className="text-sm font-bold text-gray-800 mb-3">Products</div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewRequest.products?.map((product, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-semibold">{product.productName}</td>
                        <td className="px-4 py-3">{product.productType}</td>
                        <td className="px-4 py-3 font-bold">{product.quantity?.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">{product.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Workflow Status */}
            <div className="mb-6">
              <div className="text-sm font-bold text-gray-800 mb-3">Workflow Progress</div>
              <div className="space-y-3">
                {[
                  { step: 'Draft', status: 'completed', icon: MdEdit, desc: 'Request created' },
                  { step: 'Submitted', status: viewRequest.workflow?.submittedAt ? 'completed' : 'pending', icon: MdCheck, desc: 'Submitted for approval' },
                  { step: 'Approved', status: viewRequest.workflow?.approvedAt ? 'completed' : 'pending', icon: MdCheck, desc: 'Price approval completed' },
                  { step: 'Inventory Check', status: viewRequest.inventoryCheck?.checkedAt ? 'completed' : 'pending', icon: MdInventory, desc: 'Stock availability verified' },
                  { step: 'Production Plan', status: viewRequest.productionPlan?.plannedAt ? 'completed' : 'pending', icon: MdBuild, desc: 'Manufacturing plan created' }
                ].map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${item.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                        <IconComponent size={16} />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold text-sm ${item.status === 'completed' ? 'text-green-700' : 'text-gray-500'}`}>
                          {item.step}
                        </div>
                        <div className="text-xs text-gray-500">{item.desc}</div>
                      </div>
                      {item.status === 'completed' && (
                        <MdCheck className="text-green-600" size={16} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Approval Details */}
            {viewRequest.approvalDetails?.priceApproval && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-bold text-green-800 mb-2">Price Approval</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Estimated Cost:</span>
                    <div className="font-bold">{fmtMoney(viewRequest.approvalDetails.priceApproval.estimatedCost)}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Selling Price:</span>
                    <div className="font-bold">{fmtMoney(viewRequest.approvalDetails.priceApproval.sellingPrice)}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Margin:</span>
                    <div className="font-bold">{fmtMoney(viewRequest.approvalDetails.priceApproval.margin)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}