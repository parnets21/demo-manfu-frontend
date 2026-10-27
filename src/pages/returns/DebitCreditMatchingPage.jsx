import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MdRefresh, MdAdd, MdSync, 
  MdReceipt, MdCheckCircle, MdWarning, MdInfo,
  MdClose, MdSearch, MdCurrencyRupee
} from 'react-icons/md';
import { materialReturnApi } from '../../api/materialReturnApi';

// ─── Toast Component ───────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    error: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    info: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }
  };

  const style = colors[type] || colors.info;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 9999,
      background: style.bg,
      color: style.text,
      borderLeft: `4px solid ${style.border}`,
      padding: '12px 20px',
      borderRadius: 10,
      fontSize: 13,
      fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }}>
      {type === 'success' && <MdCheckCircle size={18} />}
      {type === 'error' && <MdWarning size={18} />}
      {type === 'info' && <MdInfo size={18} />}
      <span>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
    </div>
  );
};

// ─── Helper Functions ─────────────────────────────────────────────────────────
function getMatchStatusColor(status) {
  switch (status) {
    case 'Matched': return 'bg-green-100 text-green-700';
    case 'Partial': return 'bg-yellow-100 text-yellow-700';
    case 'Open': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getTallySyncIcon(sync) {
  if (sync === 'Synced') return { icon: <MdCheckCircle size={14} />, cls: 'text-green-600' };
  if (sync === 'Not synced') return { icon: <MdWarning size={14} />, cls: 'text-red-500' };
  return { icon: <MdSync size={14} />, cls: 'text-yellow-500' };
}

function formatCurrency(n) {
  if (!n || n === 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ─── Field Component ──────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DebitCreditMatchingPage() {
  const [matchingData, setMatchingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [rawReturns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const emptyEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      docket: `MR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      returnType: 'Material Return',
      party: '',
      invoiceNo: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      invoiceDate: today,
      cnNo: 'Not generated',
      cnAmount: 0,
      dnNo: '—',
      dnAmount: 0,
      difference: 0,
      gst: '18%',
      financeStatus: 'Pending',
      matchStatus: 'Open',
      tallySync: 'Not synced',
      voucherNo: '—',
      assignedTo: 'Self',
      lastUpdated: today,
      returnValue: '',
    };
  };

  const [newEntry, setNewEntry] = useState(emptyEntry);

  // ─── Load Data from Backend or Local Storage or Seed Data ───────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Try backend first — fetch material returns that have reconciliation data
      const response = await materialReturnApi.getAll();
      const backendData = (response.data || []);
      if (backendData.length > 0) {
        const mapped = backendData.map(r => ({
          id: r.mrId || r._id,
          _id: r._id,
          party: r.supplierName || r.customerName || 'Unknown',
          invoice: r.invoiceNo || '',
          invoiceDate: r.invoiceDate ? new Date(r.invoiceDate).toISOString().split('T')[0] : '',
          creditNote: r.creditNoteNo || 'Not generated',
          cnAmount: r.refundAmount || 0,
          debitNote: r.debitNoteNo || '—',
          dnAmount: 0,
          difference: r.creditNoteNo ? 0 : (r.value || r.refundAmount || 0),
          matchStatus: r.reconciliationStatus === 'Completed' ? 'Matched'
            : r.reconciliationStatus === 'In Progress' ? 'Partial' : 'Open',
          tallySync: r.stage === 'Tally_Sync' || r.stage === 'Closed' ? 'Synced' : 'Not synced',
          returnValue: r.value || r.refundAmount || 0,
          returnType: r.returnType || 'Material Return',
          gst: '18%',
          financeStatus: r.reconciliationStatus === 'Completed' ? 'Closed' : 'Pending',
          voucherNo: '—',
          assignedTo: r.approvedBy || 'Accounts',
          lastUpdated: r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : '',
          aging: r.createdAt
            ? `${Math.floor((Date.now() - new Date(r.createdAt)) / 86400000)} days`
            : '0 days',
        }));
        setMatchingData(mapped);
        showToast(`Loaded ${mapped.length} records from backend`, 'success');
        return;
      }
    } catch (err) {
      console.warn('Backend unavailable, falling back to local storage:', err.message);
    }

    // Fallback: localStorage or seed data
    try {
      const savedData = localStorage.getItem('debit_credit_matching_data');
      if (savedData && JSON.parse(savedData).length > 0) {
        const parsedData = JSON.parse(savedData);
        setMatchingData(parsedData);
        showToast(`Loaded ${parsedData.length} records from local storage`, 'success');
      } else {
        // Seed data fallback
        setMatchingData([]);
        showToast('No records available', 'info');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const lowSearch = searchTerm.toLowerCase();
    const filtered = matchingData.filter(item => {
      const matchesSearch = 
        item.id.toLowerCase().includes(lowSearch) ||
        item.party.toLowerCase().includes(lowSearch) ||
        item.invoice.toLowerCase().includes(lowSearch);
      const matchesStatus = statusFilter === 'All' || item.matchStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setFilteredData(filtered);
  }, [searchTerm, statusFilter, matchingData]);

  const stats = useMemo(() => ({
    fullyMatched: matchingData.filter(d => d.matchStatus === 'Matched').length,
    partialMismatch: matchingData.filter(d => d.matchStatus === 'Partial').length,
    cnNotGenerated: matchingData.filter(d => d.matchStatus === 'Open').length,
    totalLossAmount: matchingData.reduce((sum, d) => sum + (d.difference || 0), 0),
  }), [matchingData]);

  const handleMrSelect = async (mrId) => {
    const item = rawReturns.find(r => r._id === mrId || r.mrId === mrId);
    if (item) {
      setNewEntry(prev => ({
        ...prev,
        mrId: item.mrId,
        refundAmount: item.value || '',
        creditNoteNo: item.creditNoteNo || `CN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
        debitNoteNo: item.debitNoteNo || `DN-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`
      }));
    }
  };

  const handleCreate = async () => {
    if (!newEntry.mrId) { showToast('Please select a Return Request', 'error'); return; }
    setSaving(true);
    try {
      const targetMr = rawReturns.find(r => r.mrId === newEntry.mrId);
      const res = await materialReturnApi.processReconciliation(targetMr._id, {
        refundAmount: Number(newEntry.refundAmount),
        creditNoteNo: newEntry.creditNoteNo,
        debitNoteNo: newEntry.debitNoteNo,
        remarks: newEntry.remarks,
        financeStatus: 'CLOSED',
        currentStage: 'CLOSED',
        returnStatus: 'CLOSED'
      });

      if (res.success) {
        showToast('Finance Reconciliation & Return Closed successfully', 'success');
        
        // Auto Tally Sync Integration
        try {
          await materialReturnApi.updateStage(targetMr._id, 'CLOSED');
          showToast('Return synchronized to Tally automatically', 'success');
        } catch (tallyErr) {
          console.error('Tally sync failed:', tallyErr);
        }

        setShowCreateModal(false);
        setNewEntry(emptyEntry());
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncWithTally = async (id, item) => {
    try {
      const res = await materialReturnApi.updateStage(item._id, 'TALLY_SYNCED');
      if (res.success) {
        showToast(`Tally sync successful for ${id}`, 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id, item) => {
    if (window.confirm(`Delete reconciliation for ${id}?`)) {
      try {
        await materialReturnApi.updateStage(item._id, 'INVENTORY_UPDATED'); // Revert stage
        showToast(`Record ${id} reset to inventory stage`, 'info');
        loadData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  // ─── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Toast */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MdReceipt className="text-red-600" size={28} />
            Debit / Credit Matching
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and reconcile debit/credit notes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
          >
            <MdRefresh size={18} /> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
          >
            <MdAdd size={18} /> Process Reconciliation
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-green-600">{stats.fullyMatched}</p>
            <MdCheckCircle className="text-green-500" size={24} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Fully Matched</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-yellow-600">{stats.partialMismatch}</p>
            <MdWarning className="text-yellow-500" size={24} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Partial Mismatch</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-red-600">{stats.cnNotGenerated}</p>
            <MdReceipt className="text-red-500" size={24} />
          </div>
          <p className="text-sm text-gray-500 mt-1">CN Not Generated</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalLossAmount)}</p>
            <MdCurrencyRupee className="text-purple-500" size={24} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Total Loss Amount</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="flex-1 min-w-[220px] relative">
          <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by party, invoice, docket..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Matched', 'Partial', 'Open'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 ml-auto">{filteredData.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Docket', 'Party', 'Invoice', 'CN No', 'CN Amt', 'DN No', 'DN Amt', 'Diff', 'Status', 'Tally', 'Actions'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-10 text-gray-400">No records found</td>
              </tr>
            ) : (
              filteredData.map((r, idx) => {
                const sync = getTallySyncIcon(r.tallySync);
                return (
                  <tr key={r.id || idx} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-3 py-3 font-mono text-xs text-blue-600 font-medium whitespace-nowrap">{r.id}</td>
                    <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{r.party}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{r.invoice}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{r.creditNote}</td>
                    <td className="px-3 py-3 text-right text-green-700 font-medium">{r.cnAmount > 0 ? formatCurrency(r.cnAmount) : '—'}</td>
                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{r.debitNote}</td>
                    <td className="px-3 py-3 text-right text-blue-700 font-medium">{r.dnAmount > 0 ? formatCurrency(r.dnAmount) : '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold text-red-600">{r.difference > 0 ? formatCurrency(r.difference) : '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getMatchStatusColor(r.matchStatus)}`}>
                        {r.matchStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={sync.cls} title={r.tallySync}>{sync.icon}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5 flex-nowrap">
                        {r.tallySync !== 'Synced' && r.creditNote !== 'Not generated' && (
                          <button
                            onClick={() => handleSyncWithTally(r.id, r)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg whitespace-nowrap transition-colors flex items-center gap-1"
                            title="Sync with Tally"
                          >
                            <MdSync size={12} /> Sync
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(r.id, r)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg whitespace-nowrap transition-colors flex items-center gap-1"
                          title="Reset Reconciliation"
                        >
                          <MdRefresh size={12} /> Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <MdAdd className="text-red-600" size={24} />
                Process Reconciliation
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <MdClose size={24} />
              </button>
            </div>

            <div className="p-6 space-y-5 bg-white">
              <div className="grid grid-cols-2 gap-5">
                <Field label="Return Request (MR ID) *">
                  <select 
                    required 
                    value={newEntry.mrId}
                    onChange={e => handleMrSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  >
                    <option value="">— Select MR ID —</option>
                    {rawReturns.filter(r => r.currentStage === 'INVENTORY_UPDATED' || r.currentStage === 'FINANCE_PENDING').map(r => (
                      <option key={r._id} value={r._id}>{r.mrId} — {r.supplierName || r.customerName}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Reconciliation Amount (₹)">
                  <input 
                    type="number" 
                    value={newEntry.refundAmount}
                    onChange={e => setNewEntry({...newEntry, refundAmount: e.target.value})}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all font-semibold text-green-700" 
                  />
                </Field>

                <Field label="Credit Note No.">
                  <input 
                    type="text" 
                    value={newEntry.creditNoteNo}
                    onChange={e => setNewEntry({...newEntry, creditNoteNo: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono" 
                  />
                </Field>

                <Field label="Debit Note No.">
                  <input 
                    type="text" 
                    value={newEntry.debitNoteNo}
                    onChange={e => setNewEntry({...newEntry, debitNoteNo: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono" 
                  />
                </Field>
              </div>

              <Field label="Remarks / Notes">
                <textarea 
                  value={newEntry.remarks}
                  onChange={e => setNewEntry({...newEntry, remarks: e.target.value})}
                  rows={3}
                  placeholder="Enter reconciliation notes..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleCreate}
                  className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Submit Reconciliation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}