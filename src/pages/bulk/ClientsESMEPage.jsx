import { useState, useEffect } from 'react';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { clientApi } from '../../api/clientApi';
import { bulkOrderApi } from '../../api/bulkOrderApi';
import { corporateClientApi } from '../../api/corporateClientApi';
import { itemMasterApi } from '../../api/itemMasterApi';
import DynamicDataFlowDashboard from '../../components/corporate/DynamicDataFlowDashboard';

const initialClients = [
  { id: 'ESME-001', name: 'Precision Auto Parts Pvt Ltd', contact: 'Amit Patel', phone: '9876543210', email: 'amit@precisionauto.com', city: 'Bangalore', category: 'Manufacturing', creditLimit: '₹5,00,000', outstanding: '₹1,20,000', status: 'Active', gstNumber: '18AABCT1234H1Z0', address: 'Plot 123, Industrial Area, Bangalore' },
  { id: 'ESME-002', name: 'TechFlow Solutions', contact: 'Priya Sharma', phone: '9812345678', email: 'priya@techflow.com', city: 'Pune', category: 'Trading', creditLimit: '₹3,50,000', outstanding: '₹0', status: 'Active', gstNumber: '27AABCT5678H1Z0', address: 'Tech Park, Pune' },
  { id: 'ESME-003', name: 'Green Energy Systems', contact: 'Rajesh Kumar', phone: '9823456789', email: 'rajesh@greenenergy.com', city: 'Chennai', category: 'Manufacturing', creditLimit: '₹4,20,000', outstanding: '₹85,000', status: 'Active', gstNumber: '33AABCT9012H1Z0', address: 'Green Park, Chennai' },
  { id: 'ESME-004', name: 'Digital Commerce Hub', contact: 'Neha Gupta', phone: '9834567890', email: 'neha@digihub.com', city: 'Delhi', category: 'Trading', creditLimit: '₹2,80,000', outstanding: '₹0', status: 'Inactive', gstNumber: '07AABCT3456H1Z0', address: 'Commerce Plaza, Delhi' },
  { id: 'ESME-005', name: 'Industrial Supplies Co', contact: 'Vikram Singh', phone: '9845678901', email: 'vikram@indsupply.com', city: 'Ahmedabad', category: 'Distributor', creditLimit: '₹6,00,000', outstanding: '₹2,40,000', status: 'Active', gstNumber: '24AABCT7890H1Z0', address: 'Supply Hub, Ahmedabad' },
];

const initialQuotations = [
  { id: 'EQ-2024-001', client: 'Precision Auto Parts Pvt Ltd', items: 5, qty: 2000, value: '₹8,50,000', packaging: 'Standard', validity: '30 Apr', status: 'Sent' },
  { id: 'EQ-2024-002', client: 'TechFlow Solutions', items: 8, qty: 3500, value: '₹12,40,000', packaging: 'Custom Branded', validity: '28 Apr', status: 'Approved' },
  { id: 'EQ-2024-003', client: 'Green Energy Systems', items: 6, qty: 1800, value: '₹6,20,000', packaging: 'Standard', validity: '25 Apr', status: 'Draft' },
  { id: 'EQ-2024-004', client: 'Industrial Supplies Co', items: 10, qty: 4200, value: '₹15,80,000', packaging: 'Bulk Loose', validity: '22 Apr', status: 'Expired' },
];

const quotationItems = [
  { item: 'Bearing 6205', sku: 'SKU-1042', qty: 1000, unitPrice: 420, discount: 8, total: 386400 },
  { item: 'Oil Seal 35x52', sku: 'SKU-2187', qty: 800, unitPrice: 115, discount: 10, total: 82800 },
  { item: 'Gasket Set A', sku: 'SKU-0934', qty: 500, unitPrice: 650, discount: 5, total: 308750 },
];

const packagingOptions = [
  { id: 'PKG-01', name: 'Standard Box', description: 'Plain corrugated box with product label', moq: 100, extraCost: '₹0', leadTime: '0 days' },
  { id: 'PKG-02', name: 'Custom Branded', description: 'Client logo & branding on box', moq: 500, extraCost: '₹12/unit', leadTime: '5 days' },
  { id: 'PKG-03', name: 'Bulk Loose', description: 'No individual packaging, bulk pallet', moq: 1000, extraCost: '-₹5/unit', leadTime: '0 days' },
];

const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 placeholder:text-gray-400 font-[inherit]";
const selectCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-100 font-[inherit]";
const labelCls = "text-xs font-semibold text-gray-600";
const fieldCls = "flex flex-col gap-1.5 mb-4";
const btnPrimary = "inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-red-400 to-red-700 text-white rounded-xl text-sm font-semibold shadow-md hover:-translate-y-px transition-all border-0 cursor-pointer font-[inherit]";
const btnOutline = "inline-flex items-center gap-1.5 px-4 py-2 border border-red-600 text-red-700 bg-transparent rounded-xl text-sm font-semibold hover:bg-red-700 hover:text-white transition-all cursor-pointer font-[inherit]";
const btnSm = "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg";
const thCls = "bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap";
const tdCls = "px-4 py-3 text-gray-800 align-middle";
const trCls = "border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors";

export default function ClientsESMEPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDataFlowModal, setShowDataFlowModal] = useState(false);
  const [clients, setClients] = useState(initialClients);
  const [quotations, setQuotations] = useState(initialQuotations);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemMaster, setItemMaster] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [integrationStats, setIntegrationStats] = useState({
    total: 0,
    synced: 0,
    pending: 0,
    failed: 0
  });
  const [quotationForm, setQuotationForm] = useState({
    validityDate: '',
    packaging: 'Standard Box',
    paymentTerms: 'Net 30',
    notes: ''
  });
  const [newClientForm, setNewClientForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    category: 'Manufacturing',
    creditLimit: '',
    gstNumber: '',
    address: '',
  });

  // Helper function to transform backend client data to frontend format
  const transformClientData = (backendClient) => ({
    id: backendClient.clientId || backendClient._id,
    name: backendClient.name,
    contact: backendClient.contact,
    phone: backendClient.phone,
    email: backendClient.email,
    city: backendClient.address?.city || backendClient.city,
    category: backendClient.category || (backendClient.tier === 'Platinum' ? 'Manufacturing' : 'Trading'),
    creditLimit: typeof backendClient.creditLimit === 'number' ? `₹${backendClient.creditLimit.toLocaleString()}` : backendClient.creditLimit,
    outstanding: typeof backendClient.outstanding === 'number' ? `₹${backendClient.outstanding.toLocaleString()}` : backendClient.outstanding,
    status: backendClient.status,
    gstNumber: backendClient.gstNumber,
    address: typeof backendClient.address === 'object' 
      ? `${backendClient.address.street || ''}, ${backendClient.address.city || ''}, ${backendClient.address.state || ''} - ${backendClient.address.pincode || ''}`.replace(/^,\s*|,\s*$/g, '')
      : backendClient.address,
    tier: backendClient.tier,
    integrationStatus: backendClient.integrationStatus,
    tallySync: backendClient.tallySync,
    availableCredit: backendClient.availableCredit
  });

  // Fetch clients and item master from backend on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch clients from corporate client API
        const clientsResponse = await corporateClientApi.getAll();
        if (clientsResponse.success && Array.isArray(clientsResponse.data)) {
          const transformedClients = clientsResponse.data.map(transformClientData);
          setClients(transformedClients);
          
          // Calculate integration stats
          const total = transformedClients.length;
          const synced = transformedClients.filter(c => c.tallySync?.synced).length;
          const failed = transformedClients.filter(c => c.tallySync?.syncStatus === 'Failed').length;
          const pending = total - synced - failed;
          setIntegrationStats({ total, synced, pending, failed });
        }

        // Fetch quotations from bulk order API
        const quotationsResponse = await bulkOrderApi.getQuotations();
        if (quotationsResponse.success && Array.isArray(quotationsResponse.data)) {
          setQuotations(quotationsResponse.data);
        }

        // Fetch item master for quotation creation
        const itemsResponse = await itemMasterApi.getAll();
        if (itemsResponse.success && Array.isArray(itemsResponse.data)) {
          setItemMaster(itemsResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast('❌ Failed to load data from server');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const subtotal = quotationItems.reduce((s, i) => s + i.total, 0);
  const gst = Math.round(subtotal * 0.18);
  const grand = subtotal + gst;

  const kpis = [
    { label: 'ESME Clients', value: clients.filter(c => c.status === 'Active').length, color: '#8b5cf6' },
    { label: 'Active Quotations', value: quotations.filter(q => q.status === 'Sent').length, color: '#f59e0b' },
    { label: 'Tally Synced', value: integrationStats.synced, color: '#10b981' },
    { label: 'Sync Pending', value: integrationStats.pending, color: '#ef4444' },
  ];

  const handleSyncClient = async (clientId) => {
    setLoading(true);
    try {
      const response = await corporateClientApi.syncWithTally(clientId);
      if (response.success) {
        toast(`✅ Client synced successfully with Tally!`);
        // Refresh client data
        const clientsResponse = await corporateClientApi.getAll();
        if (clientsResponse.success) {
          const transformedClients = clientsResponse.data.map(transformClientData);
          setClients(transformedClients);
        }
      }
    } catch (error) {
      toast(`❌ Sync failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSync = async () => {
    setLoading(true);
    try {
      const response = await corporateClientApi.bulkSync();
      if (response.success) {
        toast(`✅ Bulk sync completed! ${response.data.totalClients} clients processed.`);
        // Refresh client data
        const clientsResponse = await corporateClientApi.getAll();
        if (clientsResponse.success) {
          const transformedClients = clientsResponse.data.map(transformClientData);
          setClients(transformedClients);
        }
      }
    } catch (error) {
      toast(`❌ Bulk sync failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatusBadge = (integrationStatus) => {
    if (!integrationStatus) return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Not Integrated</span>;
    
    const modules = Object.keys(integrationStatus);
    const integrated = Object.values(integrationStatus).filter(Boolean).length;
    
    if (integrated === modules.length) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Fully Integrated</span>;
    } else if (integrated > 0) {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Partial ({integrated}/{modules.length})</span>;
    } else {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Not Integrated</span>;
    }
  };

  const getTallySyncBadge = (tallySync) => {
    if (!tallySync) return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Pending</span>;
    
    switch (tallySync.syncStatus) {
      case 'Success':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Synced</span>;
      case 'Failed':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Failed</span>;
      case 'Pending':
      default:
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
    }
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setShowViewModal(true);
    toast(`👁 Viewing ${client.name} details`);
  };

  const handleQuoteClient = (client) => {
    setSelectedClient(client);
    setShowQuoteModal(true);
    toast(`📋 Creating quotation for ${client.name}`);
  };
  const handleAddClient = async () => {
    if (!newClientForm.companyName || !newClientForm.contactPerson) {
      toast('❌ Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const clientName = newClientForm.companyName;
      
      // Prepare enhanced payload for corporate client API with dynamic data flow
      const payload = {
        name: newClientForm.companyName,
        contact: newClientForm.contactPerson,
        phone: newClientForm.phone || '9999999999',
        email: newClientForm.email || 'noemail@company.com',
        tier: newClientForm.category === 'Manufacturing' ? 'Gold' : 'Silver',
        creditLimit: newClientForm.creditLimit ? parseInt(newClientForm.creditLimit) : 0,
        gstNumber: newClientForm.gstNumber || '',
        panNumber: '', // Can be added to form later
        paymentTerms: 'Net 30',
        discountPercentage: 0,
        status: 'Active',
        address: {
          street: newClientForm.address || '',
          city: newClientForm.city || 'Unknown',
          state: '',
          pincode: '',
          country: 'India'
        },
        billingAddress: {
          street: newClientForm.address || '',
          city: newClientForm.city || 'Unknown',
          state: '',
          pincode: '',
          country: 'India'
        },
        shippingAddress: {
          street: newClientForm.address || '',
          city: newClientForm.city || 'Unknown',
          state: '',
          pincode: '',
          country: 'India'
        }
      };

      // Save to backend using corporate client API with dynamic data flow
      const response = await corporateClientApi.create(payload);
      
      if (response.success && response.data) {
        // Transform the backend response to frontend format
        const newClient = transformClientData(response.data);
        
        // Add the new client to the list
        setClients([newClient, ...clients]);
        
        setShowClientModal(false);
        setNewClientForm({
          companyName: '',
          contactPerson: '',
          phone: '',
          email: '',
          city: '',
          category: 'Manufacturing',
          creditLimit: '',
          gstNumber: '',
          address: '',
        });
        
        // Show dynamic data flow result
        if (response.dataFlow) {
          const integrations = Object.entries(response.dataFlow.integrations || {})
            .filter(([_, status]) => status)
            .map(([module, _]) => module)
            .join(', ');
          
          toast(`✅ Client "${clientName}" added successfully! Integrated with: ${integrations}`);
        } else {
          toast(`✅ Client "${clientName}" added successfully!`);
        }
      } else {
        toast(`❌ Failed to add client: Invalid response from server`);
      }
    } catch (error) {
      console.error('Failed to add client:', error);
      toast(`❌ Failed to add client: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuotation = () => {
    if (!selectedClient) {
      toast('❌ Please select a client');
      return;
    }

    const newQuotation = {
      id: `EQ-2024-${String(quotations.length + 1).padStart(3, '0')}`,
      client: selectedClient.name,
      items: quotationItems.length,
      qty: quotationItems.reduce((sum, item) => sum + item.qty, 0),
      value: `₹${grand.toLocaleString()}`,
      packaging: 'Custom Branded',
      validity: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      status: 'Sent',
    };

    setQuotations([...quotations, newQuotation]);
    setShowQuoteModal(false);
    setSelectedClient(null);
    toast(`✉️ Quotation sent to ${selectedClient.name}!`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">ESME Clients & Quotations</h1>

      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={() => setShowDataFlowModal(true)} 
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              boxShadow: '0 3px 10px rgba(29,78,216,0.3)',
            }}
          >
            📊 Data Flow Dashboard
          </button>
          {integrationStats.pending > 0 && (
            <button 
              onClick={handleBulkSync}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                boxShadow: '0 3px 10px rgba(5,150,105,0.3)',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Syncing...' : `🔄 Bulk Sync (${integrationStats.pending})`}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeTab === 0 && <button onClick={() => { setSelectedClient(null); setShowClientModal(true); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}>+ Add Client</button>}
          {activeTab === 1 && <button onClick={() => { setSelectedQuotation(null); setShowQuoteModal(true); }} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
          }}>+ New Quotation</button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        {['Clients', 'Quotations', 'Data Flow'].map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === i ? 'border-red-600 text-red-700' : 'border-transparent text-gray-600 hover:text-gray-800'}`}>
            {tab}
            {i === 2 && integrationStats.pending > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                {integrationStats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Clients Tab */}
      {activeTab === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <DataTable
            columns={[
              { key: 'id', label: 'Client ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'name', label: 'Company', render: v => <span className="font-bold">{v}</span> },
              { key: 'contact', label: 'Contact' },
              { key: 'city', label: 'City' },
              { key: 'tier', label: 'Tier', render: v => (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  v === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                  v === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {v}
                </span>
              )},
              { key: 'creditLimit', label: 'Credit Limit', render: v => <span className="font-semibold">{v}</span> },
              { key: 'outstanding', label: 'Outstanding', render: v => <span className={`font-bold ${v === '₹0' ? 'text-green-600' : 'text-red-500'}`}>{v}</span> },
              { key: 'integrationStatus', label: 'Integration', render: (_, row) => getIntegrationStatusBadge(row.integrationStatus) },
              { key: 'tallySync', label: 'Tally Sync', render: (_, row) => getTallySyncBadge(row.tallySync) },
              { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
              { key: 'id', label: 'Actions', render: (_, row) => (
                <div className="flex gap-1.5">
                  <button onClick={() => handleViewClient(row)} className={`${btnSm} border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]`}>View</button>
                  <button onClick={() => handleQuoteClient(row)} className={`${btnSm} bg-gradient-to-br from-red-400 to-red-700 text-white font-semibold border-0 cursor-pointer font-[inherit]`}>Quote</button>
                  {(!row.tallySync?.synced || row.tallySync?.syncStatus === 'Failed') && (
                    <button 
                      onClick={() => handleSyncClient(row.id)} 
                      disabled={loading}
                      className={`${btnSm} bg-blue-600 text-white font-semibold border-0 cursor-pointer font-[inherit] disabled:opacity-50`}
                    >
                      Sync
                    </button>
                  )}
                </div>
              )},
            ]}
            data={clients}
          />
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <DataTable
            columns={[
              { key: 'id', label: 'Quote ID', render: v => <span className="font-semibold text-red-700">{v}</span> },
              { key: 'client', label: 'Client', render: v => <span className="font-semibold">{v}</span> },
              { key: 'items', label: 'SKUs' },
              { key: 'qty', label: 'Total Qty', render: v => <span className="font-bold">{v.toLocaleString()}</span> },
              { key: 'value', label: 'Value', render: v => <span className="font-bold text-red-700">{v}</span> },
              { key: 'packaging', label: 'Packaging' },
              { key: 'validity', label: 'Valid Till' },
              { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
              { key: 'id', label: 'Actions', render: (_, row) => (
                <div className="flex gap-1.5">
                  <button onClick={() => { setSelectedQuotation(row); setShowViewModal(true); }} className={`${btnSm} border border-red-600 text-red-700 bg-transparent font-semibold cursor-pointer font-[inherit]`}>View</button>
                  <button onClick={() => toast('Converting to PO...')} className={`${btnSm} bg-gray-100 text-gray-800 font-semibold border-0 cursor-pointer font-[inherit]`}>Convert</button>
                </div>
              )},
            ]}
            data={quotations}
          />
        </div>
      )}

      {/* Data Flow Tab */}
      {activeTab === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <DynamicDataFlowDashboard />
        </div>
      )}

      {/* Data Flow Modal */}
      <Modal 
        open={showDataFlowModal} 
        onClose={() => setShowDataFlowModal(false)} 
        title="Dynamic Data Flow Dashboard" 
        size="xl"
      >
        <DynamicDataFlowDashboard />
      </Modal>
      <Modal open={showViewModal && selectedClient && !selectedQuotation} onClose={() => { setShowViewModal(false); setSelectedClient(null); }} title={`Client Details - ${selectedClient?.name}`} size="lg">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className={labelCls}>Client ID</label>
              <div className="text-sm font-semibold text-red-700 mt-1">{selectedClient?.id}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Company Name</label>
              <div className="text-sm font-bold text-gray-800 mt-1">{selectedClient?.name}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Contact Person</label>
              <div className="text-sm text-gray-800 mt-1">{selectedClient?.contact}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Phone</label>
              <div className="text-sm text-gray-800 mt-1">{selectedClient?.phone}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Email</label>
              <div className="text-sm text-gray-800 mt-1">{selectedClient?.email}</div>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <label className={labelCls}>City</label>
              <div className="text-sm text-gray-800 mt-1">{selectedClient?.city}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Tier</label>
              <div className="text-sm text-gray-800 mt-1">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedClient?.tier === 'Platinum' ? 'bg-purple-100 text-purple-800' :
                  selectedClient?.tier === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedClient?.tier || selectedClient?.category}
                </span>
              </div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>GST Number</label>
              <div className="text-sm font-mono text-gray-800 mt-1">{selectedClient?.gstNumber}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Credit Limit</label>
              <div className="text-sm font-bold text-red-700 mt-1">{selectedClient?.creditLimit}</div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Outstanding</label>
              <div className={`text-sm font-bold mt-1 ${selectedClient?.outstanding === '₹0' ? 'text-green-600' : 'text-red-500'}`}>{selectedClient?.outstanding}</div>
            </div>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Address</label>
            <div className="text-sm text-gray-800 mt-1 p-3 bg-gray-50 rounded-lg">{selectedClient?.address}</div>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Status</label>
            <div className="mt-1"><StatusBadge status={selectedClient?.status} /></div>
          </div>
          
          {/* Integration Status Section */}
          <div className="col-span-2 border-t pt-4">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Dynamic Data Flow Status</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Integration Status</label>
                <div className="mt-1">{getIntegrationStatusBadge(selectedClient?.integrationStatus)}</div>
              </div>
              <div>
                <label className={labelCls}>Tally Sync Status</label>
                <div className="mt-1">{getTallySyncBadge(selectedClient?.tallySync)}</div>
              </div>
              {selectedClient?.tallySync?.lastSyncAt && (
                <div>
                  <label className={labelCls}>Last Sync</label>
                  <div className="text-sm text-gray-800 mt-1">
                    {new Date(selectedClient.tallySync.lastSyncAt).toLocaleString('en-IN')}
                  </div>
                </div>
              )}
              {selectedClient?.availableCredit !== undefined && (
                <div>
                  <label className={labelCls}>Available Credit</label>
                  <div className="text-sm font-bold text-green-600 mt-1">
                    ₹{selectedClient.availableCredit?.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
            
            {/* Module Integration Details */}
            {selectedClient?.integrationStatus && (
              <div className="mt-4">
                <label className={labelCls}>Module Integration Details</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(selectedClient.integrationStatus).map(([module, status]) => (
                    <span
                      key={module}
                      className={`px-3 py-1 text-xs rounded-full ${
                        status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {module}: {status ? '✓' : '✗'}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sync Action */}
            {(!selectedClient?.tallySync?.synced || selectedClient?.tallySync?.syncStatus === 'Failed') && (
              <div className="mt-4">
                <button
                  onClick={() => handleSyncClient(selectedClient.id)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Syncing...' : 'Sync with Tally'}
                </button>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* View Quotation Modal */}
      <Modal open={showViewModal && selectedQuotation} onClose={() => { setShowViewModal(false); setSelectedQuotation(null); }} title={`Quotation Details - ${selectedQuotation?.id}`} size="lg">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className={labelCls}>Quote ID</label>
            <div className="text-sm font-semibold text-red-700 mt-1">{selectedQuotation?.id}</div>
          </div>
          <div>
            <label className={labelCls}>Client</label>
            <div className="text-sm font-semibold text-gray-800 mt-1">{selectedQuotation?.client}</div>
          </div>
          <div>
            <label className={labelCls}>Total Items</label>
            <div className="text-sm font-bold text-gray-800 mt-1">{selectedQuotation?.items} SKUs</div>
          </div>
          <div>
            <label className={labelCls}>Total Quantity</label>
            <div className="text-sm font-bold text-gray-800 mt-1">{selectedQuotation?.qty.toLocaleString()} units</div>
          </div>
          <div>
            <label className={labelCls}>Packaging</label>
            <div className="text-sm text-gray-800 mt-1">{selectedQuotation?.packaging}</div>
          </div>
          <div>
            <label className={labelCls}>Valid Till</label>
            <div className="text-sm text-gray-800 mt-1">{selectedQuotation?.validity}</div>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <div className="mt-1"><StatusBadge status={selectedQuotation?.status} /></div>
          </div>
          <div>
            <label className={labelCls}>Quote Value</label>
            <div className="text-sm font-bold text-red-700 mt-1">{selectedQuotation?.value}</div>
          </div>
        </div>
        <div className="font-bold text-[13px] text-gray-800 mb-2.5">Line Items</div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
          <table className="w-full">
            <thead><tr>{['Item', 'SKU', 'Qty', 'Unit Price (₹)', 'Discount %', 'Total (₹)'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {quotationItems.map((item, i) => (
                <tr key={i} className={trCls}>
                  <td className={`${tdCls} font-semibold`}>{item.item}</td>
                  <td className={`${tdCls} font-mono text-xs text-red-700`}>{item.sku}</td>
                  <td className={tdCls}>{item.qty.toLocaleString()}</td>
                  <td className={tdCls}>₹{item.unitPrice.toLocaleString()}</td>
                  <td className={tdCls}>{item.discount}%</td>
                  <td className={`${tdCls} font-bold`}>₹{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 max-w-[300px] ml-auto">
          <div className="flex justify-between mb-2 text-[13px]"><span className="text-gray-600">Subtotal</span><span className="font-semibold text-gray-800">₹{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between mb-2 text-[13px]"><span className="text-gray-600">GST (18%)</span><span className="font-semibold text-gray-800">₹{gst.toLocaleString()}</span></div>
          <div className="flex justify-between pt-2 border-t border-gray-200 text-[15px] font-extrabold text-red-700"><span>Grand Total</span><span>₹{grand.toLocaleString()}</span></div>
        </div>
      </Modal>

      {/* Add/Edit Client Modal */}
      <Modal open={showClientModal} onClose={() => { setShowClientModal(false); setNewClientForm({ companyName: '', contactPerson: '', phone: '', email: '', city: '', category: 'Manufacturing', creditLimit: '', gstNumber: '', address: '' }); }} title="Add ESME Client"
        footer={<>
          <button className={btnOutline} onClick={() => { setShowClientModal(false); setNewClientForm({ companyName: '', contactPerson: '', phone: '', email: '', city: '', category: 'Manufacturing', creditLimit: '', gstNumber: '', address: '' }); }}>Cancel</button>
          <button className={btnPrimary} onClick={handleAddClient}>Save Client</button>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className={fieldCls}><label className={labelCls}>Company Name *</label><input className={inputCls} placeholder="e.g. Precision Auto Parts" value={newClientForm.companyName} onChange={(e) => setNewClientForm({...newClientForm, companyName: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>Contact Person *</label><input className={inputCls} placeholder="Name" value={newClientForm.contactPerson} onChange={(e) => setNewClientForm({...newClientForm, contactPerson: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>Phone</label><input className={inputCls} type="tel" placeholder="10-digit number" maxLength={10} value={newClientForm.phone} onChange={(e) => setNewClientForm({...newClientForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})} /></div>
          <div className={fieldCls}><label className={labelCls}>Email</label><input type="email" className={inputCls} placeholder="email@company.com" value={newClientForm.email} onChange={(e) => setNewClientForm({...newClientForm, email: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>City</label><input className={inputCls} placeholder="City" value={newClientForm.city} onChange={(e) => setNewClientForm({...newClientForm, city: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>Category</label><select className={selectCls} value={newClientForm.category} onChange={(e) => setNewClientForm({...newClientForm, category: e.target.value})}><option>Manufacturing</option><option>Trading</option><option>Distributor</option></select></div>
          <div className={fieldCls}><label className={labelCls}>Credit Limit (₹)</label><input type="number" className={inputCls} placeholder="0" value={newClientForm.creditLimit} onChange={(e) => setNewClientForm({...newClientForm, creditLimit: e.target.value})} /></div>
          <div className={fieldCls}><label className={labelCls}>GST Number</label><input className={inputCls} placeholder="GSTIN" value={newClientForm.gstNumber} onChange={(e) => setNewClientForm({...newClientForm, gstNumber: e.target.value})} /></div>
          <div className={`${fieldCls} col-span-2`}><label className={labelCls}>Address</label><textarea className={inputCls} placeholder="Full address..." value={newClientForm.address} onChange={(e) => setNewClientForm({...newClientForm, address: e.target.value})} /></div>
        </div>
      </Modal>

      {/* Create Quotation Modal */}
      <Modal open={showQuoteModal && selectedClient} onClose={() => { setShowQuoteModal(false); setSelectedClient(null); }} title={`Create Quotation for ${selectedClient?.name}`} size="lg"
        footer={<>
          <button className={btnOutline} onClick={() => { setShowQuoteModal(false); setSelectedClient(null); toast('📝 Quotation saved as draft'); }}>Save Draft</button>
          <button className={btnPrimary} onClick={handleSendQuotation}>Send Quotation</button>
        </>}>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className={fieldCls}><label className={labelCls}>Client</label>
            <div className="text-sm font-semibold text-gray-800 p-2.5 bg-gray-50 rounded-lg">{selectedClient?.name}</div>
          </div>
          <div className={fieldCls}><label className={labelCls}>Contact</label>
            <div className="text-sm text-gray-600 p-2.5 bg-gray-50 rounded-lg">{selectedClient?.phone}</div>
          </div>
          <div className={fieldCls}><label className={labelCls}>Validity Date</label><input type="date" className={inputCls} /></div>
          <div className={fieldCls}><label className={labelCls}>Packaging Option</label>
            <select className={selectCls}>{packagingOptions.map(p => <option key={p.id}>{p.name}</option>)}</select>
          </div>
          <div className={fieldCls}><label className={labelCls}>Payment Terms</label>
            <select className={selectCls}><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Advance</option></select>
          </div>
        </div>
        <div className="font-bold text-[13px] text-gray-800 mb-2.5">Line Items</div>
        <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
          <table className="w-full">
            <thead><tr>{['Item', 'SKU', 'Qty', 'Unit Price (₹)', 'Discount %', 'Total (₹)'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {quotationItems.map((item, i) => (
                <tr key={i} className={trCls}>
                  <td className={`${tdCls} font-semibold`}>{item.item}</td>
                  <td className={`${tdCls} font-mono text-xs text-red-700`}>{item.sku}</td>
                  <td className={tdCls}><input type="number" className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 font-[inherit]" defaultValue={item.qty} /></td>
                  <td className={tdCls}><input type="number" className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 font-[inherit]" defaultValue={item.unitPrice} /></td>
                  <td className={tdCls}><input type="number" className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm outline-none bg-white text-gray-800 focus:border-red-500 font-[inherit]" defaultValue={item.discount} /></td>
                  <td className={`${tdCls} font-bold`}>₹{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 max-w-[300px] ml-auto">
          <div className="flex justify-between mb-2 text-[13px]"><span className="text-gray-600">Subtotal</span><span className="font-semibold text-gray-800">₹{subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between mb-2 text-[13px]"><span className="text-gray-600">GST (18%)</span><span className="font-semibold text-gray-800">₹{gst.toLocaleString()}</span></div>
          <div className="flex justify-between pt-2 border-t border-gray-200 text-[15px] font-extrabold text-red-700"><span>Grand Total</span><span>₹{grand.toLocaleString()}</span></div>
        </div>
      </Modal>
    </div>
  );
}
