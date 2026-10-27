import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { financeApi } from '../../api/financeApi';
import { accountsLedgerApi } from '../../api/accountsLedgerApi';
import { tallyApi } from '../../api/tallyApi';
import { useDataEvent } from '../../utils/dataEvents';
import Pagination from '../../components/common/Pagination';
import { CHAKRA_LOGO_B64 } from '../../assets/chakraLogoB64';
import { SIGNATURE_B64 } from '../../assets/signatureB64.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const tabs = [
  'Dashboard',
  'Accounts Payable',
  'Accounts Receivable',
  'Supplier Payments',
  'Dealer Receipts',
  'Supplier Ledger',
  'Dealer Ledger',
  'Tally Ledger',
  'Sales Register',
  'Outstanding Invoices',
  'Bank & Cash Accounts',
  'Payment History',
  'Financial Reports',
  'Vendor Credit Notes',
  'Vendor Debit Notes',
];

const C = {
  red: '#ef4444',
  green: '#10b981',
  mid: '#6b7280',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

function Badge({ text, color = '#6b7280', bg = '#f1f5f9' }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: bg, color,
    }}>{text}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{
        width: 28, height: 28, border: '3px solid #f1f5f9',
        borderTop: `3px solid ${C.red}`, borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.mid }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
      padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13,
    }}>
      ⚠️ {message}
    </div>
  );
}

const th = 'bg-gray-50 px-4 py-2.5 text-left text-[10.5px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap';
const td = 'px-4 py-3 text-gray-800 align-middle';
const tr = 'border-b border-gray-50 last:border-0 hover:bg-red-50/40 transition-colors';

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 10,
  background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
  color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  boxShadow: '0 3px 10px rgba(185,28,28,0.3)',
};
const outlineBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', borderRadius: 10,
  background: 'transparent', color: '#1e40af',
  border: '1.5px solid #1e40af', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
};



function fmt(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  const MOCK_STATS = {
    totalAccountsPayable: 1250000,
    totalAccountsReceivable: 875000,
    totalSupplierOutstanding: 1250000,
    totalDealerOutstanding: 875000,
    paymentsMadeToday: 45000,
    paymentsReceivedToday: 25000,
    overdueSupplierInvoices: 3,
    overdueDealerInvoices: 2,
  };

  const MOCK_TRANSACTIONS = [
    { id: 1, type: 'Payment', party: 'ABC Suppliers', amount: -25000, date: '2026-07-13', status: 'Completed' },
    { id: 2, type: 'Receipt', party: 'XYZ Dealers', amount: 15000, date: '2026-07-13', status: 'Completed' },
    { id: 3, type: 'Invoice', party: 'PQR Vendors', amount: -50000, date: '2026-07-12', status: 'Unpaid' },
    { id: 4, type: 'Invoice', party: 'LMN Traders', amount: 30000, date: '2026-07-12', status: 'Partially Paid' },
    { id: 5, type: 'Payment', party: 'DEF Suppliers', amount: -10000, date: '2026-07-11', status: 'Completed' },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, txRes] = await Promise.allSettled([
          financeApi.getDashboardStats(),
          financeApi.getRecentTransactions()
        ]);
        
        if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
          setStats(statsRes.value.data);
        }
        if (txRes.status === 'fulfilled' && txRes.value?.success) {
          setTransactions(txRes.value.data || []);
        }
      } catch (e) {
        // Use mock data if API fails
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;

  const displayStats = stats || MOCK_STATS;
  const displayTransactions = transactions.length ? transactions : MOCK_TRANSACTIONS;

  const kpis = [
    { label: 'Total Accounts Payable', value: fmt(displayStats.totalAccountsPayable), color: '#ef4444' },
    { label: 'Total Accounts Receivable', value: fmt(displayStats.totalAccountsReceivable), color: '#10b981' },
    { label: 'Total Supplier Outstanding', value: fmt(displayStats.totalSupplierOutstanding), color: '#f59e0b' },
    { label: 'Total Dealer Outstanding', value: fmt(displayStats.totalDealerOutstanding), color: '#3b82f6' },
    { label: 'Payments Made Today', value: fmt(displayStats.paymentsMadeToday), color: '#8b5cf6' },
    { label: 'Payments Received Today', value: fmt(displayStats.paymentsReceivedToday), color: '#06b6d4' },
  ];

  return (
    <div>
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all">
            <div className="text-2xl font-black tracking-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Overdue Invoices</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center p-4 bg-red-50 rounded-xl">
              <div className="text-3xl font-bold text-red-600">{displayStats.overdueSupplierInvoices}</div>
              <div className="text-xs text-gray-500">Supplier</div>
            </div>
            <div className="flex-1 text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-3xl font-bold text-orange-600">{displayStats.overdueDealerInvoices}</div>
              <div className="text-xs text-gray-500">Dealer</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button style={primaryBtn}>Record Payment</button>
            <button style={outlineBtn}>Record Receipt</button>
            <button style={outlineBtn}>Generate Invoice</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Date', 'Type', 'Party', 'Amount', 'Status'].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTransactions.map((tx) => (
                <tr key={tx.id} className={tr}>
                  <td className={td}>{tx.date}</td>
                  <td className={td}><StatusBadge status={tx.type} type={tx.type === 'Receipt' ? 'success' : tx.type === 'Payment' ? 'danger' : 'info'} /></td>
                  <td className={td} style={{ fontWeight: 600 }}>{tx.party}</td>
                  <td className={td} style={{ fontWeight: 700, color: tx.amount > 0 ? '#10b981' : '#ef4444' }}>
                    {fmt(Math.abs(tx.amount))}
                  </td>
                  <td className={td}><StatusBadge status={tx.status} type={tx.status === 'Completed' ? 'success' : tx.status === 'Partially Paid' ? 'info' : 'warning'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccountsPayableTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await financeApi.getAccountsPayable();
        setData(res.data || []);
      } catch (e) {
        toast('Failed to load accounts payable', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Accounts Payable</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} invoices</div>
        </div>
        <button style={primaryBtn}>+ New Payable</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Supplier Name', 'Invoice No', 'Invoice Amount', 'Paid Amount', 'Balance', 'Due Date', 'Status'].map(h => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className={tr}>
                <td className={td} style={{ fontWeight: 600 }}>{item.supplierName}</td>
                <td className={td}>{item.invoiceNumber}</td>
                <td className={td}>{fmt(item.invoiceAmount)}</td>
                <td className={td}>{fmt(item.paidAmount)}</td>
                <td className={td} style={{ fontWeight: 700, color: item.balanceAmount > 0 ? '#ef4444' : '#10b981' }}>{fmt(item.balanceAmount)}</td>
                <td className={td}>{item.dueDate}</td>
                <td className={td}>
                  <StatusBadge status={item.paymentStatus} type={item.paymentStatus === 'Paid' ? 'success' : item.paymentStatus === 'Partially Paid' ? 'info' : 'warning'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountsReceivableTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await financeApi.getAccountsReceivable();
        setData(res.data || []);
      } catch (e) {
        toast('Failed to load accounts receivable', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Accounts Receivable</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} invoices</div>
        </div>
        <button style={primaryBtn}>+ New Receivable</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Dealer Name', 'Invoice No', 'Invoice Amount', 'Paid Amount', 'Balance', 'Due Date', 'Status'].map(h => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className={tr}>
                <td className={td} style={{ fontWeight: 600 }}>{item.dealerName}</td>
                <td className={td}>{item.invoiceNumber}</td>
                <td className={td}>{fmt(item.invoiceAmount)}</td>
                <td className={td}>{fmt(item.paidAmount)}</td>
                <td className={td} style={{ fontWeight: 700, color: item.balanceAmount > 0 ? '#ef4444' : '#10b981' }}>{fmt(item.balanceAmount)}</td>
                <td className={td}>{item.dueDate}</td>
                <td className={td}>
                  <StatusBadge status={item.paymentStatus} type={item.paymentStatus === 'Paid' ? 'success' : item.paymentStatus === 'Partially Paid' ? 'info' : 'warning'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupplierPaymentsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [payables, setPayables] = useState([]);
  const [form, setForm] = useState({ supplierId: '', accountsPayableId: '', paymentAmount: '', paymentMethod: 'Bank Transfer' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getSupplierPayments();
      setData(res.data || []);
    } catch (e) {
      toast('Failed to load supplier payments', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = async () => {
    setShowModal(true);
    try {
      const [vRes, pRes] = await Promise.all([
        financeApi.getVendorsList(),
        financeApi.getAccountsPayable(),
      ]);
      setVendors(vRes.data || []);
      setPayables(pRes.data || []);
    } catch (e) {
      toast('Failed to load suppliers/invoices', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.supplierId || !form.accountsPayableId || !form.paymentAmount) {
      toast('Supplier, invoice and amount are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await financeApi.createSupplierPayment({
        supplier: form.supplierId,
        accountsPayable: form.accountsPayableId,
        paymentAmount: parseFloat(form.paymentAmount),
        paymentMethod: form.paymentMethod,
      });
      toast('Payment recorded');
      setShowModal(false);
      setForm({ supplierId: '', accountsPayableId: '', paymentAmount: '', paymentMethod: 'Bank Transfer' });
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to save payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Supplier Payments</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} payments</div>
        </div>
        <button style={primaryBtn} onClick={openModal}>+ Record Payment</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Date', 'Supplier', 'Invoice No', 'Amount', 'Method', 'Status', 'Source'].map(h => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.mid }}>No supplier payments found.</td></tr>
            ) : data.map((item) => (
              <tr key={item.id} className={tr}>
                <td className={td}>{item.date}</td>
                <td className={td} style={{ fontWeight: 600 }}>{item.supplierName}</td>
                <td className={td}>{item.invoiceNumber}</td>
                <td className={td} style={{ fontWeight: 700, color: '#ef4444' }}>{fmt(item.amount)}</td>
                <td className={td}>{item.paymentMethod}</td>
                <td className={td}><StatusBadge status={item.status} type="success" /></td>
                <td className={td}><Badge text={item.source || 'ERP'} color={item.source === 'Tally' ? '#16a34a' : '#3b82f6'} bg={item.source === 'Tally' ? '#f0fdf4' : '#eff6ff'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Supplier Payment">
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Supplier *</label>
            <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option value="">Select Supplier</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.companyName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Invoice *</label>
            <select value={form.accountsPayableId} onChange={e => setForm(f => ({ ...f, accountsPayableId: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option value="">Select Invoice</option>
              {payables.filter(p => !form.supplierId || p.supplierName).map(p => (
                <option key={p.id} value={p.id}>{p.invoiceNumber} — {fmt(p.balanceAmount)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Amount *</label>
            <input type="number" value={form.paymentAmount} onChange={e => setForm(f => ({ ...f, paymentAmount: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} placeholder="0.00" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Payment Method</label>
            <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Cash</option>
              <option>UPI</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={outlineBtn} onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button style={primaryBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Payment'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DealerReceiptsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [form, setForm] = useState({ dealerName: '', accountsReceivableId: '', receiptAmount: '', paymentMethod: 'Bank Transfer' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getDealerReceipts();
      setData(res.data || []);
    } catch (e) {
      toast('Failed to load dealer receipts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openModal = async () => {
    setShowModal(true);
    try {
      const [dRes, rRes] = await Promise.all([
        financeApi.getDealersList(),
        financeApi.getAccountsReceivable(),
      ]);
      setDealers(dRes.data || []);
      setReceivables(rRes.data || []);
    } catch (e) {
      toast('Failed to load dealers/invoices', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.accountsReceivableId || !form.receiptAmount) {
      toast('Invoice and amount are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await financeApi.createDealerReceipt({
        accountsReceivable: form.accountsReceivableId,
        receiptAmount: parseFloat(form.receiptAmount),
        paymentMethod: form.paymentMethod,
      });
      toast('Receipt recorded');
      setShowModal(false);
      setForm({ dealerName: '', accountsReceivableId: '', receiptAmount: '', paymentMethod: 'Bank Transfer' });
      await loadData();
    } catch (e) {
      toast(e.message || 'Failed to save receipt', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Dealer Receipts</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} receipts</div>
        </div>
        <button style={primaryBtn} onClick={openModal}>+ Record Receipt</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Date', 'Dealer', 'Invoice No', 'Amount', 'Method', 'Status', 'Source'].map(h => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: C.mid }}>No dealer receipts found.</td></tr>
            ) : data.map((item) => (
              <tr key={item.id} className={tr}>
                <td className={td}>{item.date}</td>
                <td className={td} style={{ fontWeight: 600 }}>{item.dealerName}</td>
                <td className={td}>{item.invoiceNumber}</td>
                <td className={td} style={{ fontWeight: 700, color: '#10b981' }}>{fmt(item.amount)}</td>
                <td className={td}>{item.paymentMethod}</td>
                <td className={td}><StatusBadge status={item.status} type="success" /></td>
                <td className={td}><Badge text={item.source || 'ERP'} color={item.source === 'Tally' ? '#16a34a' : '#3b82f6'} bg={item.source === 'Tally' ? '#f0fdf4' : '#eff6ff'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Dealer Receipt">
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Invoice *</label>
            <select value={form.accountsReceivableId} onChange={e => setForm(f => ({ ...f, accountsReceivableId: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option value="">Select Invoice</option>
              {receivables.map(r => (
                <option key={r.id} value={r.id}>{r.invoiceNumber} — {r.dealerName} — {fmt(r.balanceAmount)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Amount *</label>
            <input type="number" value={form.receiptAmount} onChange={e => setForm(f => ({ ...f, receiptAmount: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} placeholder="0.00" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 6 }}>Payment Method</label>
            <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option>Bank Transfer</option>
              <option>UPI</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>Other</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={outlineBtn} onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button style={primaryBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Receipt'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SupplierLedgerTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getSupplierLedger();
      setData(res.data || []);
    } catch (e) {
      toast('Failed to load supplier ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build party list dynamically from returned ledger rows
  const partyNames = [...new Set(data.map(r => r.party).filter(Boolean))].sort();

  const filtered = selectedSupplier
    ? data.filter(r => r.party === selectedSupplier || !r.party)
    : data;

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Supplier Ledger</div>
          <div className="text-xs text-gray-400 mt-0.5">{filtered.length} entries</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
            <option value="">All Suppliers</option>
            {partyNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState message="No ledger entries found. Sync Tally data or add accounts payable records." /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Date', 'Type', 'Reference', 'Party', 'Debit', 'Credit', 'Balance', 'Source'].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id || i} className={tr}>
                  <td className={td}>{item.date}</td>
                  <td className={td}><StatusBadge status={item.type} type={item.type === 'Invoice' ? 'danger' : 'success'} /></td>
                  <td className={td}>{item.reference}</td>
                  <td className={td} style={{ color: C.mid, fontSize: 12 }}>{item.party || '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.debit > 0 ? '#ef4444' : '#64748b' }}>{item.debit > 0 ? fmt(item.debit) : '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.credit > 0 ? '#10b981' : '#64748b' }}>{item.credit > 0 ? fmt(item.credit) : '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.balance > 0 ? '#ef4444' : '#10b981' }}>{fmt(item.balance)}</td>
                  <td className={td}><Badge text={item.source || 'ERP'} color={item.source === 'Tally' ? '#16a34a' : '#3b82f6'} bg={item.source === 'Tally' ? '#f0fdf4' : '#eff6ff'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DealerLedgerTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getDealerLedger();
      setData(res.data || []);
    } catch (e) {
      toast('Failed to load dealer ledger', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Build dealer list dynamically from returned ledger rows
  const partyNames = [...new Set(data.map(r => r.party).filter(Boolean))].sort();

  const filtered = selectedDealer
    ? data.filter(r => r.party === selectedDealer || !r.party)
    : data;

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Dealer Ledger</div>
          <div className="text-xs text-gray-400 mt-0.5">{filtered.length} entries</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={selectedDealer} onChange={e => setSelectedDealer(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
            <option value="">All Dealers</option>
            {partyNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState message="No ledger entries found. Sync Tally data or add accounts receivable records." /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Date', 'Type', 'Reference', 'Party', 'Debit', 'Credit', 'Balance', 'Source'].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id || i} className={tr}>
                  <td className={td}>{item.date}</td>
                  <td className={td}><StatusBadge status={item.type} type={item.type === 'Invoice' ? 'success' : 'danger'} /></td>
                  <td className={td}>{item.reference}</td>
                  <td className={td} style={{ color: C.mid, fontSize: 12 }}>{item.party || '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.debit > 0 ? '#ef4444' : '#64748b' }}>{item.debit > 0 ? fmt(item.debit) : '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.credit > 0 ? '#10b981' : '#64748b' }}>{item.credit > 0 ? fmt(item.credit) : '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.balance > 0 ? '#ef4444' : '#10b981' }}>{fmt(item.balance)}</td>
                  <td className={td}><Badge text={item.source || 'ERP'} color={item.source === 'Tally' ? '#16a34a' : '#3b82f6'} bg={item.source === 'Tally' ? '#f0fdf4' : '#eff6ff'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Voucher detail HTML builder (for print/download) ─────────────────────────
// Uses the same MANUFACTURING ERP invoice format as InvoiceGeneratorPage
function buildVoucherHtml(v, forDownload = false) {
  const fmtDate = d => {
    if (!d) return '—';
    try {
      const dt = new Date(d); return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
    } catch { return String(d) || '—'; }
  };
  const fmtNum  = n => (Number(n)||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const fmtCurr = n => `₹ ${fmtNum(n)}`;
  const fmtQty  = q => { const n = Number(q); return isNaN(n) ? String(q||'') : (n%1===0?`${n} Nos`:`${n.toFixed(2)} Nos`); };
  const fmtRate = r => { const n = Number(r); return isNaN(n) ? String(r||'') : `${fmtNum(n)}/Nos`; };

  const items = v.inventoryEntries || [];
  const allLedgers = v.ledgerEntries || [];
  const taxLines = allLedgers.filter(le => {
    const n = (le.ledgerName || '').toLowerCase();
    return n.includes('cgst') || n.includes('sgst') || n.includes('igst') || n.includes('cess') || n.includes('freight') || n.includes('round');
  });
  const salesLedger = allLedgers.find(le =>
    !le.isDeemed && /(sales|purchase|income|revenue)/i.test(le.ledgerName || '')
  ) || allLedgers.find(le => !le.isDeemed && !/cgst|sgst|igst|cess|freight|round/i.test(le.ledgerName || ''));

  const subtotal   = items.reduce((s, ie) => s + Math.abs(ie.amount || 0), 0);
  const taxTotal   = taxLines.reduce((s, le) => s + Math.abs(le.amount || 0), 0);
  const grandTotal = v.amount || subtotal + taxTotal;
  const totalQty   = items.reduce((s, ie) => s + (Number(ie.qty) || 0), 0);

  // CGST/SGST/IGST amounts from named ledger lines
  const cgstAmt = taxLines.filter(l=>(l.ledgerName||'').toLowerCase().includes('cgst')).reduce((s,l)=>s+Math.abs(l.amount||0),0);
  const sgstAmt = taxLines.filter(l=>(l.ledgerName||'').toLowerCase().includes('sgst')).reduce((s,l)=>s+Math.abs(l.amount||0),0);
  const igstAmt = taxLines.filter(l=>(l.ledgerName||'').toLowerCase().includes('igst')).reduce((s,l)=>s+Math.abs(l.amount||0),0);
  const formatTaxRate = (rate) => {
    // Handle floating-point precision issues, check if it's very close to an integer
    const epsilon = 1e-10;
    const roundedRate = Math.round(rate * 100) / 100; // Round to 2 decimal places first
    if (Math.abs(roundedRate - Math.round(roundedRate)) < epsilon) {
      return Math.round(roundedRate).toString();
    }
    // For non-integers, find the shortest representation
    // Try to remove trailing zeros after decimal
    const fixed2 = roundedRate.toFixed(2);
    const fixed1 = roundedRate.toFixed(1);
    if (Math.abs(parseFloat(fixed1) - roundedRate) < epsilon) return fixed1;
    return fixed2;
  };
  const cgstRateNum = subtotal>0 ? ((cgstAmt/subtotal)*100) : 0;
  const sgstRateNum = subtotal>0 ? ((sgstAmt/subtotal)*100) : 0;
  const igstRateNum = subtotal>0 ? ((igstAmt/subtotal)*100) : 0;
  const cgstRate = formatTaxRate(cgstRateNum);
  const sgstRate = formatTaxRate(sgstRateNum);
  const igstRate = formatTaxRate(igstRateNum);
  
  // Bill To / Ship To details from voucher
  // Derive state from GSTIN state code when billToState is blank
  const gstinStateMap = {
    '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
    '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
    '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
    '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
    '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
    '24':'Gujarat','25':'Daman & Diu','26':'Dadra & Nagar Haveli','27':'Maharashtra',
    '28':'Andhra Pradesh','29':'Karnataka','30':'Goa','31':'Lakshadweep',
    '32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar',
    '36':'Telangana','37':'Andhra Pradesh (New)','38':'Ladakh','97':'Other Territory',
    '99':'Centre Jurisdiction'
  };
  const deriveStateFromGstin = (gstin) => {
    if (!gstin || gstin.length < 2) return '';
    const code = gstin.substring(0, 2);
    return gstinStateMap[code] || '';
  };

  const billToGstin = v.billToGST || v.partyGstin || '';
  const derivedState = deriveStateFromGstin(billToGstin);

  const billTo = {
    name: v.billToName || v.partyName,
    mailingName: v.billToMailingName,
    address: v.billToAddress || v.partyAddress,
    city: v.billToCity || v.partyCity,
    state: v.billToState || v.partyState || derivedState || v.placeOfSupply,
    pincode: v.billToPincode || v.partyPostal,
    country: v.billToCountry || 'India',
    gst: billToGstin,
    gstRegType: v.billToGstRegType
  };

  // If Tally has no real Ship To data, fall back to Bill To details fully.
  // NOTE: The sync service stores billToName as shipToName when there's no real
  // ship-to, so we must check address/city/state/GST (not name) for "real" ship-to.
  // Also: Tally sometimes puts the party name in shipToAddress — treat that as blank.
  const _shipAddrRaw1 = (v.shipToAddress || '').trim();
  const _cleanShipAddr1 = (
    _shipAddrRaw1.toLowerCase() === (v.shipToName || '').trim().toLowerCase() ||
    _shipAddrRaw1.toLowerCase() === (v.billToName || v.partyName || '').trim().toLowerCase()
  ) ? '' : _shipAddrRaw1;
  const _shipMailRaw1 = (v.shipToMailingName || '').trim();
  const _cleanShipMail1 = (
    _shipMailRaw1.toLowerCase() === (v.shipToName || '').trim().toLowerCase() ||
    _shipMailRaw1.toLowerCase() === (v.billToName || v.partyName || '').trim().toLowerCase()
  ) ? '' : _shipMailRaw1;
  const hasRealShipTo = _cleanShipAddr1 || v.shipToCity || v.shipToState || v.shipToGST;
  const shipTo = {
    name:        v.shipToName || billTo.name,
    mailingName: hasRealShipTo ? _cleanShipMail1  : billTo.mailingName,
    address:     hasRealShipTo ? _cleanShipAddr1  : billTo.address,
    city:        hasRealShipTo ? v.shipToCity     : billTo.city,
    state:       hasRealShipTo ? v.shipToState    : billTo.state,
    country:     hasRealShipTo ? v.shipToCountry  : billTo.country,
    gst:         hasRealShipTo ? v.shipToGST      : billTo.gst,
  };

  // Amount in words
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tensW=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const toWords=n=>{n=Math.round(n);if(n===0)return'Zero';if(n<20)return ones[n];if(n<100)return tensW[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');if(n<1000)return ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+toWords(n%100):'');if(n<100000)return toWords(Math.floor(n/1000))+' Thousand'+(n%1000?' '+toWords(n%1000):'');if(n<10000000)return toWords(Math.floor(n/100000))+' Lakh'+(n%100000?' '+toWords(n%100000):'');return toWords(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+toWords(n%10000000):'');};
  const rupees=Math.floor(grandTotal), paise=Math.round((grandTotal-rupees)*100);
  const amtWords=toWords(rupees)+' Rupees'+(paise>0?' and '+toWords(paise)+' Paise':' Only');

  const itemRowsHtml = items.map((ie,i)=>`<tr><td>${i+1}</td><td>${ie.stockItemName||''}</td><td class="mono">—</td><td class="r">${fmtQty(ie.qty)}</td><td class="r">${fmtRate(ie.rate)}</td><td class="r">${fmtCurr(ie.amount)}</td></tr>`).join('');
  const ledgerRowsHtml = allLedgers.map(le=>{const c=le.amount<0||le.isDeemed;return`<tr><td>${le.ledgerName}</td><td class="r" style="color:#ef4444">${!c?fmtCurr(Math.abs(le.amount)):'—'}</td><td class="r" style="color:#10b981">${c?fmtCurr(Math.abs(le.amount)):'—'}</td></tr>`;}).join('');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>${v.voucherType||''} ${v.voucherNumber||''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#fff;color:#111;font-size:12px}
.page{max-width:820px;margin:0 auto;padding:20px 24px;border:1px solid #ccc}
.top-label{text-align:right;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px}
.top-label span{border:1px solid #999;padding:2px 10px;font-size:10px;margin-left:8px}
.header{display:flex;align-items:flex-start;gap:14px;padding-bottom:12px;border-bottom:2px solid #111;margin-bottom:0}
.logo-wrap img{width:60px;height:60px;object-fit:contain;border-radius:6px}
.company-info{flex:1}
.company-name{font-size:17px;font-weight:900;color:#111}
.company-detail{font-size:11px;color:#333;line-height:1.6;margin-top:3px}
.inv-box{text-align:right;min-width:200px}
.inv-box table{margin-left:auto;border-collapse:collapse}
.inv-box td{padding:2px 6px;font-size:12px}
.inv-box td:first-child{font-weight:700;text-align:right}
.party-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #ccc;border-top:none}
.party-cell{padding:10px 12px}
.party-cell+.party-cell{border-left:1px solid #ccc}
.party-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:4px}
.party-name{font-size:13px;font-weight:800;color:#111;margin-bottom:3px}
.party-line{font-size:11px;color:#333;line-height:1.55}
.items-wrap{border:1px solid #ccc;border-top:none}
.it{width:100%;border-collapse:collapse}
.it th{background:#f0f0f0;padding:7px 8px;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;text-align:left}
.it th.r{text-align:right}
.it td{padding:7px 8px;font-size:12px;border-bottom:1px solid #eee;vertical-align:top}
.it td.r{text-align:right}
.it td.mono{font-family:monospace;font-size:11px}
.tr td{background:#fafafa;font-size:11px;color:#444;border-bottom:1px solid #eee}
.hsn-wrap{border:1px solid #ccc;border-top:none}
.ht{width:100%;border-collapse:collapse;table-layout:fixed}
.ht th{background:#f0f0f0;padding:4px 5px;font-size:8.5px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;text-align:left;word-break:break-word}
.ht th.r{text-align:right}
.ht td{padding:4px 5px;font-size:9.5px;border-bottom:1px solid #eee;word-break:break-word}
.ht td.r{text-align:right}
.ht .tot td{font-weight:700;background:#f5f5f5;border-top:1px solid #ccc;border-bottom:none}
.aw{border:1px solid #ccc;border-top:none;padding:8px 12px;font-size:11px}
.fg{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #ccc;border-top:none}
.fc{padding:10px 12px}
.fc+.fc{border-left:1px solid #ccc}
.fl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:6px}
.fv{font-size:11px;color:#333;line-height:1.6}
.sig{text-align:right;display:flex;flex-direction:column;justify-content:space-between}
.sline{border-top:1px solid #999;margin-top:36px;padding-top:5px;font-size:11px;color:#555;text-align:center}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{border:none;padding:10px}img{display:block!important;visibility:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}@page{margin:.8cm}}
</style></head><body>
<div class="page">
<div class="top-label">TAX INVOICE <span>ORIGINAL</span></div>
<div class="header">
  <div class="logo-wrap"><img src="${CHAKRA_LOGO_B64}" alt="MANUFACTURING ERP"/></div>
  <div class="company-info">
    <div class="company-name">MANUFACTURING ERP</div>
    <div class="company-detail">#13/14, Azeez Sait Industrial Estate, Mysore Road, Nayandahalli, Bangalore - 560039<br/>GSTIN: 29ABWFS0002M1ZR</div>
  </div>
  <div class="inv-box"><table>
    <tr><td>Voucher No.</td><td>${v.voucherNumber||'—'}</td></tr>
    <tr><td>Type</td><td>${v.voucherType||'—'}</td></tr>
    <tr><td>Date</td><td>${fmtDate(v.voucherDate)}</td></tr>
  </table></div>
</div>
<div style="padding:10px 12px;border:1px solid #ccc;border-top:none">
  <div style="text-align:center;font-size:12px;font-weight:700;margin-bottom:8px">Party Details</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:4px">Buyer (Bill to)</div>
      <div style="font-size:12px;line-height:1.5">
        ${billTo.name ? `<div style="font-weight:700">${billTo.name}</div>` : ''}
        ${billTo.mailingName && billTo.mailingName !== billTo.name ? `<div>${billTo.mailingName}</div>` : ''}
        ${billTo.address ? `<div>${billTo.address}</div>` : ''}
        ${billTo.city ? `<div>${billTo.city}</div>` : ''}
      </div>
      <table style="font-size:11px;margin-top:4px;border-collapse:collapse;width:100%">
        ${billTo.state   ? `<tr><td style="color:#555;padding:1px 6px 1px 0;white-space:nowrap">State</td><td style="padding:1px 0">${billTo.state}</td></tr>` : ''}
        ${billTo.country ? `<tr><td style="color:#555;padding:1px 6px 1px 0;white-space:nowrap">Country</td><td style="padding:1px 0">${billTo.country}</td></tr>` : ''}
        ${billTo.pincode ? `<tr><td style="color:#555;padding:1px 6px 1px 0;white-space:nowrap">Pincode</td><td style="padding:1px 0">${billTo.pincode}</td></tr>` : ''}
        ${billTo.gstRegType ? `<tr><td style="color:#555;padding:1px 6px 1px 0;white-space:nowrap">GST Registration type</td><td style="padding:1px 0">${billTo.gstRegType}</td></tr>` : ''}
        ${billTo.gst ? `<tr><td style="color:#555;padding:1px 6px 1px 0;white-space:nowrap">GSTIN/UIN</td><td style="padding:1px 0;font-weight:600">${billTo.gst}</td></tr>` : ''}
        ${v.placeOfSupply ? `<tr><td style="color:#555;padding:1px 6px 1px 0;white-space:nowrap">Place of Supply</td><td style="padding:1px 0">${v.placeOfSupply}</td></tr>` : ''}
      </table>
    </div>
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#555;margin-bottom:4px">Consignee (Ship to)</div>
      <div style="font-size:12px;line-height:1.5">
        ${shipTo.name ? `<div>${shipTo.name}</div>` : ''}
        ${shipTo.mailingName ? `<div>${shipTo.mailingName}</div>` : ''}
        ${shipTo.address ? `<div>${shipTo.address}</div>` : ''}
        ${shipTo.city ? `<div>${shipTo.city}</div>` : ''}
        ${shipTo.state ? `<div>${shipTo.state}</div>` : ''}
        ${shipTo.country ? `<div>${shipTo.country}</div>` : ''}
        ${shipTo.gst ? `<div>GSTIN: ${shipTo.gst}</div>` : ''}
      </div>
    </div>
  </div>
</div>

<div class="items-wrap">
${items.length>0?`<table class="it"><thead><tr><th style="width:36px">S.NO.</th><th>ITEMS</th><th>HSN</th><th class="r">QTY.</th><th class="r">RATE</th><th class="r">AMOUNT</th></tr></thead><tbody>
${itemRowsHtml}
<tr style="background:#f5f5f5;border-top:2px solid #ccc"><td colspan="3" style="font-size:11px;font-style:italic;color:#666">${items.length} item${items.length>1?'s':''}</td><td class="r" style="font-size:11px">${totalQty>0?fmtQty(totalQty):''}</td><td class="r" style="font-size:11px;font-weight:700;color:#475569">Sub-total</td><td class="r" style="font-weight:700">${fmtCurr(subtotal)}</td></tr>
${cgstAmt>0?`<tr class="tr"><td colspan="5" style="text-align:right;padding-right:8px">CGST @ ${cgstRate}%</td><td class="r">${fmtCurr(cgstAmt)}</td></tr>`:''}
${sgstAmt>0?`<tr class="tr"><td colspan="5" style="text-align:right;padding-right:8px">SGST/UTGST @ ${sgstRate}%</td><td class="r">${fmtCurr(sgstAmt)}</td></tr>`:''}
${igstAmt>0?`<tr class="tr"><td colspan="5" style="text-align:right;padding-right:8px">IGST @ ${igstRate}%</td><td class="r">${fmtCurr(igstAmt)}</td></tr>`:''}
<tr style="background:#f0fdf4;border-top:2px solid #bbf7d0"><td colspan="5" style="text-align:right;font-weight:800;font-size:14px;padding:10px 8px">Grand Total</td><td class="r" style="font-weight:900;font-size:16px;color:#16a34a;padding:10px 8px">${fmtCurr(grandTotal)}</td></tr>
</tbody></table>`
:allLedgers.length>0?`<table class="it"><thead><tr><th>Ledger Name</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead><tbody>
${ledgerRowsHtml}
<tr style="background:#f0fdf4;border-top:2px solid #bbf7d0"><td style="text-align:right;font-weight:800">Grand Total</td><td></td><td class="r" style="font-weight:900;font-size:15px;color:#16a34a">${fmtCurr(grandTotal)}</td></tr>
</tbody></table>`:'<div style="padding:16px;color:#999;text-align:center">No item details available</div>'}
</div>
${items.length>0?`<div class="hsn-wrap"><table class="ht"><thead><tr>
<th style="width:28%">HSN / Item</th><th class="r">Taxable</th>
<th class="r">CGST%</th><th class="r">CGST ₹</th>
<th class="r">SGST%</th><th class="r">SGST ₹</th>
<th class="r">IGST%</th><th class="r">IGST ₹</th>
<th class="r">Total Tax</th></tr></thead><tbody>
${items.map(ie=>{const a=Math.abs(ie.amount||0);const cg=subtotal>0?(cgstAmt/subtotal)*a:0;const sg=subtotal>0?(sgstAmt/subtotal)*a:0;const ig=subtotal>0?(igstAmt/subtotal)*a:0;return`<tr><td>${ie.stockItemName||'—'}</td><td class="r">${fmtNum(a)}</td><td class="r">${cgstRate>0?cgstRate+'%':'—'}</td><td class="r">${cg>0?fmtNum(cg):'—'}</td><td class="r">${sgstRate>0?sgstRate+'%':'—'}</td><td class="r">${sg>0?fmtNum(sg):'—'}</td><td class="r">${igstRate>0?igstRate+'%':'—'}</td><td class="r">${ig>0?fmtNum(ig):'—'}</td><td class="r">${fmtNum(cg+sg+ig)}</td></tr>`;}).join('')}
<tr class="tot"><td>Total</td><td class="r">${fmtNum(subtotal)}</td><td></td><td class="r">${fmtNum(cgstAmt)}</td><td></td><td class="r">${fmtNum(sgstAmt)}</td><td></td><td class="r">${fmtNum(igstAmt)}</td><td class="r">${fmtNum(cgstAmt+sgstAmt+igstAmt)}</td></tr>
</tbody></table></div>`:''}
<div class="aw"><strong>Total Amount in Words:</strong> ${amtWords}</div>
<div class="fg">
  <div class="fc" style="grid-column:span 2"><div class="fl">Terms &amp; Conditions</div><div class="fv">1. Goods once sold will not be taken back or exchanged<br/>2. All disputes are subject to Bangalore jurisdiction only<br/>3. This is a computer generated invoice &amp; doesn't require any signature</div></div>
  <div class="fc sig"><div class="fl">For MANUFACTURING ERP</div>${v.narration?`<div class="fv" style="font-size:10px;color:#555;margin-bottom:4px"><em>Narr: ${v.narration}</em></div>`:''}<div style="text-align:right;"><img src="${SIGNATURE_B64}" alt="Signature" style="height:60px;margin-bottom:5px;"/></div><div class="sline">Authorised Signatory</div></div>
</div>
</div>
${forDownload?'<script>window.onload=()=>{window.print();}<\/script>':''}
</body></html>`;
}

// ── Voucher detail view component ────────────────────────────────────────────
function VoucherDetailView({ voucher: v, onClose, onPrint, onDownload, onSave }) {
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtCurr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty  = q => {
    if (!q && q !== 0) return '—';
    const n = Number(q);
    return isNaN(n) ? String(q) : n % 1 === 0 ? `${n} Nos` : `${n.toFixed(2)} Nos`;
  };
  const fmtRate = r => {
    if (!r && r !== 0) return '—';
    const n = Number(r);
    return isNaN(n) ? String(r) : `${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/Nos`;
  };

  // ── Edit state ──
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    billToName:        v.billToName        || v.partyName || '',
    billToMailingName: v.billToMailingName || '',
    billToAddress:     v.billToAddress     || '',
    billToCity:        v.billToCity        || '',
    billToState:       v.billToState       || '',
    billToCountry:     v.billToCountry     || '',
    billToGST:         v.billToGST         || v.partyGstin || '',
    billToGstRegType:  v.billToGstRegType  || '',
    shipToName:        v.shipToName        || '',
    shipToMailingName: v.shipToMailingName || '',
    shipToAddress:     v.shipToAddress     || '',
    shipToCity:        v.shipToCity        || '',
    shipToState:       v.shipToState       || '',
    shipToCountry:     v.shipToCountry     || '',
    shipToGST:         v.shipToGST         || '',
  });

  const handleEditField = (field, value) => setEditForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await tallyApi.updateVoucher(v._id, editForm);
      toast('Invoice details saved', 'success');
      setIsEditing(false);
      if (onSave) onSave({ ...v, ...editForm });
    } catch (e) {
      toast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      billToName:        v.billToName        || v.partyName || '',
      billToMailingName: v.billToMailingName || '',
      billToAddress:     v.billToAddress     || '',
      billToCity:        v.billToCity        || '',
      billToState:       v.billToState       || '',
      billToCountry:     v.billToCountry     || '',
      billToGST:         v.billToGST         || v.partyGstin || '',
      billToGstRegType:  v.billToGstRegType  || '',
      shipToName:        v.shipToName        || '',
      shipToMailingName: v.shipToMailingName || '',
      shipToAddress:     v.shipToAddress     || '',
      shipToCity:        v.shipToCity        || '',
      shipToState:       v.shipToState       || '',
      shipToCountry:     v.shipToCountry     || '',
      shipToGST:         v.shipToGST         || '',
    });
    setIsEditing(false);
  };

  // Use editForm values when editing, otherwise use voucher values
  const effectiveV = isEditing ? { ...v, ...editForm } : v;

  const items = effectiveV.inventoryEntries || [];

  // Bill To / Ship To details from voucher
  const billTo = {
    name: effectiveV.billToName || effectiveV.partyName,
    mailingName: effectiveV.billToMailingName,
    address: effectiveV.billToAddress,
    city: effectiveV.billToCity,
    state: effectiveV.billToState,
    country: effectiveV.billToCountry,
    gst: effectiveV.billToGST || effectiveV.partyGstin,
    gstRegType: effectiveV.billToGstRegType
  };

  // If Tally has no real Ship To data, fall back to Bill To details fully.
  // NOTE: The sync service stores billToName as shipToName when there's no real
  // ship-to, so we must check address/city/state/GST (not name) for "real" ship-to.
  // Also: Tally sometimes puts the party name in shipToAddress — treat that as blank.
  const _shipAddrRaw2 = (effectiveV.shipToAddress || '').trim();
  const _cleanShipAddr2 = (
    _shipAddrRaw2.toLowerCase() === (effectiveV.shipToName || '').trim().toLowerCase() ||
    _shipAddrRaw2.toLowerCase() === (effectiveV.billToName || effectiveV.partyName || '').trim().toLowerCase()
  ) ? '' : _shipAddrRaw2;
  const _shipMailRaw2 = (effectiveV.shipToMailingName || '').trim();
  const _cleanShipMail2 = (
    _shipMailRaw2.toLowerCase() === (effectiveV.shipToName || '').trim().toLowerCase() ||
    _shipMailRaw2.toLowerCase() === (effectiveV.billToName || effectiveV.partyName || '').trim().toLowerCase()
  ) ? '' : _shipMailRaw2;
  const hasRealShipTo = _cleanShipAddr2 || effectiveV.shipToCity || effectiveV.shipToState || effectiveV.shipToGST;
  const shipTo = {
    name:        effectiveV.shipToName || billTo.name,
    mailingName: hasRealShipTo ? _cleanShipMail2         : billTo.mailingName,
    address:     hasRealShipTo ? _cleanShipAddr2         : billTo.address,
    city:        hasRealShipTo ? effectiveV.shipToCity   : billTo.city,
    state:       hasRealShipTo ? effectiveV.shipToState  : billTo.state,
    country:     hasRealShipTo ? effectiveV.shipToCountry: billTo.country,
    gst:         hasRealShipTo ? effectiveV.shipToGST    : billTo.gst,
  };

  // Split ledger entries: party ledger (isDeemed=true) vs tax/charge lines
  const allLedgers = v.ledgerEntries || [];
  const partyLedger = allLedgers.find(le => le.isDeemed);
  const salesLedger = allLedgers.find(le =>
    !le.isDeemed && /(sales|purchase|income|revenue)/i.test(le.ledgerName || '')
  );
  const taxLines = allLedgers.filter(le => {
    const n = (le.ledgerName || '').toLowerCase();
    return n.includes('cgst') || n.includes('sgst') || n.includes('igst') ||
           n.includes('cess') || n.includes('freight') || n.includes('round');
  });

  const subtotal = items.reduce((s, ie) => s + Math.abs(ie.amount || 0), 0);
  const taxTotal = taxLines.reduce((s, le) => s + Math.abs(le.amount || 0), 0);
  const grandTotal = v.amount || subtotal + taxTotal;

  const vTypeColor = {
    Sales: '#16a34a', Purchase: '#dc2626', Receipt: '#2563eb',
    Payment: '#ef4444', Journal: '#7c3aed', Contra: '#0891b2',
  }[v.voucherType] || '#475569';

  const totalQty = items.reduce((s, ie) => s + (Number(ie.qty) || 0), 0);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#111' }}>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={onDownload} style={{ ...primaryBtn, fontSize: 12, padding: '6px 14px' }}>📥 Download PDF</button>
        <button onClick={onPrint}    style={{ ...outlineBtn, fontSize: 12, padding: '6px 14px' }}>🖨️ Print</button>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{ ...outlineBtn, fontSize: 12, padding: '6px 14px', color: '#2563eb', borderColor: '#2563eb' }}>
            ✏️ Edit
          </button>
        )}
        {isEditing && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ ...primaryBtn, fontSize: 12, padding: '6px 14px', background: 'linear-gradient(135deg,#16a34a,#15803d)', opacity: saving ? 0.7 : 1 }}>
              {saving ? '⏳ Saving…' : '💾 Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{ ...outlineBtn, fontSize: 12, padding: '6px 14px' }}>
              ✕ Cancel
            </button>
          </>
        )}
        {isEditing && (
          <span style={{ fontSize: 11, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
            ✏️ Editing — Bill To &amp; Ship To fields are now editable
          </span>
        )}
      </div>

      {/* ── Tally-style header band ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        background: vTypeColor + '12', border: `1.5px solid ${vTypeColor}30`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 14,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
              background: vTypeColor, color: '#fff', letterSpacing: 0.5,
            }}>{v.voucherType}</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.3px' }}>
              {v.voucherNumber}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {fmtDate(v.voucherDate)}
            {v.voucherDate && ` · ${new Date(v.voucherDate).toLocaleDateString('en-IN', { weekday: 'long' })}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Grand Total</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: vTypeColor }}>{fmtCurr(grandTotal)}</div>
        </div>
      </div>

      {/* ── Party Details (like Tally) ── */}
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: `1px solid ${isEditing ? '#bfdbfe' : '#e2e8f0'}`, marginBottom: 14, transition: 'border-color 0.2s' }}>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
          Party Details
        </div>
        {isEditing ? (
          /* ── Edit mode ── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Bill To edit */}
            <div>
              <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Buyer (Bill To)
              </div>
              {[
                { label: 'Name',           field: 'billToName' },
                { label: 'Mailing Name',   field: 'billToMailingName' },
                { label: 'Address',        field: 'billToAddress' },
                { label: 'City',           field: 'billToCity' },
                { label: 'State',          field: 'billToState' },
                { label: 'Country',        field: 'billToCountry' },
                { label: 'GSTIN',          field: 'billToGST' },
                { label: 'GST Reg. Type',  field: 'billToGstRegType' },
              ].map(({ label, field }) => (
                <div key={field} style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>{label}</label>
                  <input
                    value={editForm[field]}
                    onChange={e => handleEditField(field, e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
            {/* Ship To edit */}
            <div>
              <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Consignee (Ship To)
              </div>
              {[
                { label: 'Name',         field: 'shipToName' },
                { label: 'Mailing Name', field: 'shipToMailingName' },
                { label: 'Address',      field: 'shipToAddress' },
                { label: 'City',         field: 'shipToCity' },
                { label: 'State',        field: 'shipToState' },
                { label: 'Country',      field: 'shipToCountry' },
                { label: 'GSTIN',        field: 'shipToGST' },
              ].map(({ label, field }) => (
                <div key={field} style={{ marginBottom: 6 }}>
                  <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 2 }}>{label}</label>
                  <input
                    value={editForm[field]}
                    onChange={e => handleEditField(field, e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Buyer (Bill to)
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: '#333' }}>
                {billTo.name && <div style={{ fontWeight: 600 }}>{billTo.name}</div>}
                {billTo.mailingName && <div>{billTo.mailingName}</div>}
                {billTo.address && <div>{billTo.address}</div>}
                {billTo.city && <div>{billTo.city}</div>}
                {billTo.state && <div>{billTo.state}</div>}
                {billTo.country && <div>{billTo.country}</div>}
                {billTo.gst && <div style={{ fontFamily: 'monospace', fontSize: 11 }}>GSTIN: {billTo.gst}</div>}
                {billTo.gstRegType && <div>GST Registration Type: {billTo.gstRegType}</div>}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Consignee (Ship to)
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: '#333' }}>
                {shipTo.name && <div style={{ fontWeight: 600 }}>{shipTo.name}</div>}
                {shipTo.mailingName && <div>{shipTo.mailingName}</div>}
                {shipTo.address && <div>{shipTo.address}</div>}
                {shipTo.city && <div>{shipTo.city}</div>}
                {shipTo.state && <div>{shipTo.state}</div>}
                {shipTo.country && <div>{shipTo.country}</div>}
                {shipTo.gst && <div style={{ fontFamily: 'monospace', fontSize: 11 }}>GSTIN: {shipTo.gst}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Additional Invoice Fields ── */}




      {/* ── Items table (exact Tally column layout) ── */}
      {items.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '9px 12px', textAlign: 'left',  fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Name of Item</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Quantity</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Rate</th>
                <th style={{ padding: '9px 12px', textAlign: 'center',fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>per</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ie, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1e293b' }}>{ie.stockItemName || '—'}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', fontFamily: 'monospace' }}>{fmtQty(ie.qty)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', fontFamily: 'monospace' }}>{fmtRate(ie.rate)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>Nos</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>{fmtCurr(ie.amount)}</td>
                </tr>
              ))}

              {/* ── Subtotal row ── */}
              <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #e2e8f0' }}>
                <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                  {items.length} item{items.length > 1 ? 's' : ''}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569', fontFamily: 'monospace', fontWeight: 600 }}>
                  {totalQty > 0 ? `${totalQty} Nos` : ''}
                </td>
                <td colSpan={2} style={{ padding: '8px 12px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>Sub-total</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmtCurr(subtotal)}</td>
              </tr>

              {/* ── Tax / charge lines ── */}
              {taxLines.map((le, idx) => {
                const isPercent = Math.abs(le.amount) < subtotal * 0.5 && subtotal > 0;
                const formatTaxRate = (rate) => {
                  // Handle floating-point precision issues, check if it's very close to an integer
                  const epsilon = 1e-10;
                  const roundedRate = Math.round(rate * 100) / 100; // Round to 2 decimal places first
                  if (Math.abs(roundedRate - Math.round(roundedRate)) < epsilon) {
                    return Math.round(roundedRate).toString();
                  }
                  // For non-integers, find the shortest representation
                  // Try to remove trailing zeros after decimal
                  const fixed2 = roundedRate.toFixed(2);
                  const fixed1 = roundedRate.toFixed(1);
                  if (Math.abs(parseFloat(fixed1) - roundedRate) < epsilon) return fixed1;
                  return fixed2;
                };
                const pctNum = isPercent ? ((Math.abs(le.amount) / subtotal) * 100) : null;
                const pct = pctNum !== null ? formatTaxRate(pctNum) : null;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td colSpan={4} style={{ padding: '7px 12px', textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                      {le.ledgerName}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                      {fmtCurr(Math.abs(le.amount))}
                    </td>
                  </tr>
                );
              })}

              {/* ── Grand Total ── */}
              <tr style={{ background: vTypeColor + '10', borderTop: `2px solid ${vTypeColor}40` }}>
                <td colSpan={4} style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>
                  Grand Total
                </td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: vTypeColor, fontFamily: 'monospace' }}>
                  {fmtCurr(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Ledger-only entries (payment/receipt/journal — no items) ── */}
      {items.length === 0 && allLedgers.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1.5px solid #e2e8f0', marginBottom: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '9px 12px', textAlign: 'left',  fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Ledger Name</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Debit</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11, color: '#475569', borderBottom: '2px solid #e2e8f0' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {allLedgers.map((le, idx) => {
                const isCredit = le.amount < 0 || le.isDeemed;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>{le.ledgerName}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>
                      {!isCredit ? fmtCurr(Math.abs(le.amount)) : '—'}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace' }}>
                      {isCredit ? fmtCurr(Math.abs(le.amount)) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: vTypeColor + '10', borderTop: `2px solid ${vTypeColor}40` }}>
                <td colSpan={2} style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 800, fontSize: 14 }}>Grand Total</td>
                <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: vTypeColor, fontFamily: 'monospace' }}>
                  {fmtCurr(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Narration (bottom, like Tally) ── */}
      {v.narration && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
          padding: '10px 14px', fontSize: 12, color: '#92400e',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>Narration:</span>
          <span>{v.narration}</span>
        </div>
      )}
    </div>
  );
}

function TallyLedgerTab() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ledgers'); // 'ledgers' or 'vouchers'
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);   // server-reported total for vouchers
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [groupFilter, setGroupFilter]           = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [fixingAmounts, setFixingAmounts] = useState(false);
  // Voucher detail modal
  const [viewVoucher, setViewVoucher] = useState(null);

  // Debounced search state so we don't fire a request on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Re-fetch when page/filter changes (vouchers: server-side; ledgers: client-side)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'ledgers') {
        const r = await accountsLedgerApi.getAll();
        setData(r.data || []);
        setTotal(0);
      } else {
        const params = {
          page,
          limit: pageSize,
          ...(voucherTypeFilter ? { type: voucherTypeFilter } : {}),
          ...(debouncedSearch   ? { search: debouncedSearch } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo   ? { dateTo }   : {}),
        };
        const r = await tallyApi.getVouchers(params);
        setData(r.data || []);
        setTotal(r.total ?? (r.data || []).length);
      }
    } catch (e) {
      setError(e.message || `Failed to fetch ${activeTab}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, voucherTypeFilter, debouncedSearch, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [activeTab, voucherTypeFilter, debouncedSearch, dateFrom, dateTo]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useDataEvent('ledger:changed', fetchData);
  useDataEvent('tally-voucher:changed', fetchData);

  // Ledger rows: client-side filter; voucher rows: already paginated by server
  const filteredRows = activeTab === 'ledgers'
    ? data.filter(x => {
        const matchSearch = !search || x.ledgerName?.toLowerCase().includes(search.toLowerCase());
        const matchGroup  = !groupFilter || x.ledgerGroup === groupFilter;
        return matchSearch && matchGroup;
      })
    : data; // server already filtered + paginated

  // For ledgers keep client-side pagination; for vouchers use server total
  const effectiveTotal = activeTab === 'ledgers' ? filteredRows.length : total;
  const startIndex     = (page - 1) * pageSize;
  const paginatedRows  = activeTab === 'ledgers'
    ? filteredRows.slice(startIndex, startIndex + pageSize)
    : data; // server returned exactly `pageSize` rows

  const handleView = (ledger) => { navigate(`/finance/ledger/${ledger._id}`); };
  const handlePrintLedger = (ledger) => { window.open(`/finance/ledger/${ledger._id}`, '_blank'); };
  const handleDownloadLedger = async (ledger) => {
    try {
      const csvContent = [['Ledger Name:', ledger.ledgerName], ['Ledger Code:', ledger.ledgerCode], ['Group:', ledger.ledgerGroup], ['Opening Balance:', ledger.openingBalance], ['Closing Balance:', ledger.closingBalance || ledger.openingBalance], ['GST Number:', ledger.gstNumber], ['Phone:', ledger.phone], ['Email:', ledger.email], []].map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledger-${ledger.ledgerCode}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast('Ledger downloaded successfully', 'success');
    } catch (err) { toast('Failed to download ledger', 'error'); }
  };

  // ── Voucher print / download ──────────────────────────────────────────────
  const handlePrintVoucher = (v) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(buildVoucherHtml(v));
    win.document.close();
    win.focus();
    // Wait for images (logo + stamp) to fully load before printing
    win.onload = () => { setTimeout(() => win.print(), 300); };
    // Fallback in case onload already fired
    setTimeout(() => { try { win.print(); } catch (_) {} }, 1200);
  };
  const handleDownloadVoucher = async (v) => {
    try {
      toast('Generating PDF...', 'info');
      // Create a temporary div to render the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildVoucherHtml(v);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      document.body.appendChild(tempDiv);

      // Wait for base64 images (logo + stamp) to fully render before capture
      await new Promise(r => setTimeout(r, 600));

      // Find the .page element inside tempDiv
      const pageElement = tempDiv.querySelector('.page');
      if (!pageElement) {
        throw new Error('Could not find page element');
      }

      // Capture the canvas with html2canvas
      const canvas = await html2canvas(pageElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Create PDF with jsPDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download the PDF
      const fileName = `${v.voucherType || 'Voucher'}_${v.voucherNumber || 'document'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast('Failed to generate PDF. Please try printing instead.', 'error');
      // Fallback to original print method
      const win = window.open('', '_blank', 'width=800,height=600');
      if (win) {
        win.document.write(buildVoucherHtml(v, true));
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
      }
    } finally {
      // Clean up the temporary div
      const tempDivs = document.querySelectorAll('div[style*="left: -9999px"]');
      tempDivs.forEach(div => div.remove());
    }
  };

  const handleDownload = async () => {
    let headers, rows;
    if (activeTab === 'ledgers') {
      headers = ['Ledger Code', 'Ledger Name', 'Group', 'GST No.', 'Opening Balance', 'Closing Balance', 'Synced'];
      rows = filteredRows.map(row => [row.ledgerCode || '', `"${(row.ledgerName || '').replace(/"/g, '""')}"`, row.ledgerGroup || '', row.gstNumber || '', row.openingBalance || 0, row.closingBalance || row.openingBalance || 0, row.syncedWithTally ? 'Yes' : 'No']);
    } else {
      let allRows = [];
      try {
        const r = await tallyApi.getVouchers({ limit: 10000, page: 1, ...(voucherTypeFilter ? { type: voucherTypeFilter } : {}), ...(debouncedSearch ? { search: debouncedSearch } : {}), ...(dateFrom ? { dateFrom } : {}), ...(dateTo ? { dateTo } : {}) });
        allRows = r.data || [];
      } catch (_) { allRows = data; }
      headers = ['Voucher No.', 'Type', 'Date', 'Party', 'Items', 'Amount', 'Narration'];
      rows = allRows.map(row => {
        const itemNames = (row.inventoryEntries || []).map(i => i.stockItemName).filter(Boolean).join('; ');
        return [row.voucherNumber || '', row.voucherType || '', row.voucherDate ? new Date(row.voucherDate).toLocaleDateString('en-IN') : '', `"${(row.partyName || '').replace(/"/g, '""')}"`, `"${itemNames.replace(/"/g, '""')}"`, row.amount || 0, `"${(row.narration || '').replace(/"/g, '""')}"`];
      });
    }
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tally-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handlePrint = () => { window.print(); };

  // Fix zero-amount vouchers: reset sync state so next import re-fetches all amounts
  const handleFixZeroAmounts = async () => {
    if (!window.confirm('This will reset voucher sync states so the next Tally sync re-fetches all amounts.\n\nAfter clicking OK, go to Tally → Import tab and run a Full Sync.')) return;
    setFixingAmounts(true);
    try {
      const r = await tallyApi.resetVoucherSyncStates();
      if (r.success) {
        toast(`✅ ${r.message || 'Sync states reset. Run a Full Sync from the Tally Import tab to refresh amounts.'}`, 'success');
      } else {
        toast(r.message || 'Reset failed', 'error');
      }
    } catch (e) {
      toast(e.message || 'Failed to reset sync states', 'error');
    } finally {
      setFixingAmounts(false);
    }
  };
  const fmtAmtShort = n => n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button 
          onClick={() => { setActiveTab('ledgers'); setPage(1); }}
          style={{
            padding: '8px 16px', 
            borderRadius: 8, 
            border: activeTab === 'ledgers' ? '1px solid #16a34a' : '1px solid #e2e8f0',
            background: activeTab === 'ledgers' ? '#f0fdf4' : '#fff',
            color: activeTab === 'ledgers' ? '#16a34a' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}>
          Ledgers
        </button>
        <button 
          onClick={() => { setActiveTab('vouchers'); setPage(1); }}
          style={{
            padding: '8px 16px', 
            borderRadius: 8, 
            border: activeTab === 'vouchers' ? '1px solid #16a34a' : '1px solid #e2e8f0',
            background: activeTab === 'vouchers' ? '#f0fdf4' : '#fff',
            color: activeTab === 'vouchers' ? '#16a34a' : '#475569',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}>
          Vouchers
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div className="text-sm font-bold text-gray-800">Tally {activeTab === 'ledgers' ? 'Ledger' : 'Vouchers'}</div>
          <div className="text-xs text-gray-400 mt-0.5">{activeTab === 'vouchers' ? effectiveTotal : filteredRows.length} {activeTab} synced from Tally</div>
        </div>
        <button style={outlineBtn} onClick={handlePrint}>🖨️ Print</button>
        <button style={primaryBtn} onClick={handleDownload}>📥 Download</button>
        {activeTab === 'vouchers' && (
          <button
            style={{ ...outlineBtn, color: '#b45309', borderColor: '#b45309', opacity: fixingAmounts ? 0.6 : 1 }}
            onClick={handleFixZeroAmounts}
            disabled={fixingAmounts}
            title="Resets sync state so next Tally import re-fetches all voucher amounts">
            {fixingAmounts ? '⏳ Resetting…' : '🔧 Fix ₹0 Amounts'}
          </button>
        )}
        <input placeholder={`Search ${activeTab === 'ledgers' ? 'ledger name' : 'party / voucher no'}...`} value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 190 }} />
        {activeTab === 'ledgers' ? (
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
            <option value="">All Groups</option>
            <option value="Sundry Debtors">Sundry Debtors</option>
            <option value="Sundry Creditors">Sundry Creditors</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Duties & Taxes">Duties &amp; Taxes</option>
            <option value="Expenses">Expenses</option>
            <option value="Incomes">Incomes</option>
            <option value="Assets">Assets</option>
            <option value="Liabilities">Liabilities</option>
            <option value="Capital">Capital</option>
            <option value="Primary">Primary</option>
          </select>
        ) : (
          <>
            <select value={voucherTypeFilter} onChange={e => setVoucherTypeFilter(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
              <option value="">All Types</option>
              <option value="Purchase">Purchase</option>
              <option value="Sales">Sales</option>
              <option value="Payment">Payment</option>
              <option value="Receipt">Receipt</option>
              <option value="Journal">Journal</option>
              <option value="Contra">Contra</option>
              <option value="Debit Note">Debit Note</option>
              <option value="Credit Note">Credit Note</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From Date"
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To Date"
              style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#f8fafc', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#64748b' }}>
                ✕ Clear
              </button>
            )}
          </>
        )}
      </div>
      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : error ? null : filteredRows.length === 0 ? <EmptyState message={`No ${activeTab} found. Run the Tally sync to populate.`} /> : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200" style={{borderBottomLeftRadius:0, borderBottomRightRadius:0}}>
            {activeTab === 'ledgers' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Ledger Code', 'Name', 'Group', 'GST No.', 'Opening Bal.', 'Closing Bal.', 'Synced', 'Actions'].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((x, i) => (
                  <tr key={x._id || i} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                    <td className={td} style={{ fontFamily:'monospace', fontWeight:700, color:C.red, fontSize:11 }}>{x.ledgerCode}</td>
                    <td className={td} style={{ fontWeight:600 }}>{x.ledgerName}</td>
                    <td className={td}>
                      <Badge
                        text={x.ledgerGroup || '—'}
                        color={x.ledgerGroup==='Sundry Debtors'?'#1e40af':x.ledgerGroup==='Sundry Creditors'?'#9d174d':C.mid}
                        bg={x.ledgerGroup==='Sundry Debtors'?'#dbeafe':x.ledgerGroup==='Sundry Creditors'?'#fce7f3':'#f1f5f9'}
                      />
                    </td>
                    <td className={td} style={{ fontFamily:'monospace', fontSize:12 }}>{x.gstNumber || '—'}</td>
                    <td className={td} style={{ fontWeight:600, color:(x.openingBalance||0)>=0?C.green:C.red }}>{fmtAmtShort(x.openingBalance)}</td>
                    <td className={td} style={{ fontWeight:600, color:(x.closingBalance||0)>=0?C.green:C.red }}>{fmtAmtShort(x.closingBalance || x.openingBalance || 0)}</td>
                    <td className={td}><Badge text={x.syncedWithTally?'✅ Yes':'—'} color={x.syncedWithTally?'#047857':C.mid} bg={x.syncedWithTally?'#ecfdf5':C.bg} /></td>
                    <td className={td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button 
                          onClick={() => handleView(x)} 
                          style={{...outlineBtn, padding: '3px 8px', fontSize: 11}}>
                          👁 View
                        </button>
                        <button 
                          onClick={() => handleDownloadLedger(x)} 
                          style={{...outlineBtn, padding: '3px 8px', fontSize: 11}}>
                          ↓
                        </button>
                        <button 
                          onClick={() => handlePrintLedger(x)} 
                          style={{...outlineBtn, padding: '3px 8px', fontSize: 11}}>
                          🖨
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Voucher No.', 'Type', 'Date', 'Party', 'Items', 'Amount', 'Actions'].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((x, i) => {
                  const vTypeColor = { Purchase:'#dc2626', Sales:'#16a34a', Payment:'#ef4444', Receipt:'#10b981', Journal:'#7c3aed', Contra:'#0ea5e9', 'Debit Note':'#d97706', 'Credit Note':'#0891b2' };
                  const vTypeBg   = { Purchase:'#fef2f2', Sales:'#f0fdf4', Payment:'#fee2e2', Receipt:'#dcfce7', Journal:'#f3e8ff', Contra:'#e0f2fe', 'Debit Note':'#fef3c7', 'Credit Note':'#e0f7fa' };
                  const itemNames = (x.inventoryEntries || []).map(ie => ie.stockItemName).filter(Boolean);
                  return (
                    <tr key={x._id || i} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                      <td className={td} style={{ fontFamily:'monospace', fontWeight:700, color:C.red, fontSize:11 }}>{x.voucherNumber}</td>
                      <td className={td}>
                        <Badge text={x.voucherType} color={vTypeColor[x.voucherType]||'#475569'} bg={vTypeBg[x.voucherType]||'#f1f5f9'} />
                      </td>
                      <td className={td}>{x.voucherDate ? new Date(x.voucherDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td className={td} style={{ fontWeight:600, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{x.partyName || '—'}</td>
                      <td className={td} style={{ maxWidth:180 }}>
                        {itemNames.length > 0 ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {itemNames.slice(0,2).map((nm,idx) => (
                              <span key={idx} style={{ fontSize:10, background:'#f1f5f9', color:'#374151', padding:'2px 6px', borderRadius:4, fontWeight:600 }}>
                                {nm.length > 16 ? nm.slice(0,16)+'…' : nm}
                              </span>
                            ))}
                            {itemNames.length > 2 && (
                              <span style={{ fontSize:10, background:'#e2e8f0', color:'#64748b', padding:'2px 6px', borderRadius:4 }}>+{itemNames.length-2}</span>
                            )}
                          </div>
                        ) : <span style={{ color:'#94a3b8', fontSize:12 }}>—</span>}
                      </td>
                      <td className={td} style={{ fontWeight:700, color:(x.amount||0)>0?C.green:C.mid }}>{fmtAmtShort(x.amount)}</td>
                      <td className={td}>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => setViewVoucher(x)} style={{...outlineBtn, padding:'3px 8px', fontSize:11}}>👁 View</button>
                          <button onClick={() => handleDownloadVoucher(x)} style={{...outlineBtn, padding:'3px 8px', fontSize:11}} title="Download PDF">↓</button>
                          <button onClick={() => handlePrintVoucher(x)} style={{...outlineBtn, padding:'3px 8px', fontSize:11}} title="Print">🖨</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
          <Pagination total={effectiveTotal} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </>
      )}

      {/* ── Voucher Detail Modal ───────────────────────────────────────────── */}
      <Modal
        open={!!viewVoucher}
        onClose={() => setViewVoucher(null)}
        title={viewVoucher ? `${viewVoucher.voucherType} · ${viewVoucher.voucherNumber} · ${viewVoucher.voucherDate ? new Date(viewVoucher.voucherDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : ''}` : ''}
        size="lg"
      >
        {viewVoucher && (
          <VoucherDetailView
            voucher={viewVoucher}
            onClose={() => setViewVoucher(null)}
            onPrint={() => handlePrintVoucher(viewVoucher)}
            onDownload={() => handleDownloadVoucher(viewVoucher)}
            onSave={(updated) => {
              setViewVoucher(updated);
              fetchData();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function OutstandingInvoicesTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await financeApi.getOutstandingInvoices();
        setData(res.data || []);
      } catch (e) {
        toast('Failed to load outstanding invoices', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Outstanding Invoices</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} outstanding invoices</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Type', 'Party', 'Invoice No', 'Amount', 'Paid', 'Balance', 'Due Date', 'Days Overdue'].map(h => (
                <th key={h} className={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className={tr}>
                <td className={td}><StatusBadge status={item.type} type={item.type === 'Payable' ? 'danger' : 'success'} /></td>
                <td className={td} style={{ fontWeight: 600 }}>{item.partyName}</td>
                <td className={td}>{item.invoiceNumber}</td>
                <td className={td}>{fmt(item.invoiceAmount)}</td>
                <td className={td}>{fmt(item.paidAmount)}</td>
                <td className={td} style={{ fontWeight: 700, color: '#ef4444' }}>{fmt(item.balanceAmount)}</td>
                <td className={td}>{item.dueDate}</td>
                <td className={td} style={{ fontWeight: 700, color: item.daysOverdue > 0 ? '#ef4444' : '#10b981' }}>
                  {item.daysOverdue > 0 ? `${item.daysOverdue} days` : 'Not due'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BankCashAccountsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await financeApi.getBankCashAccounts();
        setData(res.data || []);
      } catch (e) {
        toast('Failed to load bank accounts', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Bank & Cash Accounts</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} accounts</div>
        </div>
        <button style={primaryBtn}>+ Add Account</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map((item) => (
          <div key={item.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm font-bold text-gray-800">{item.accountName}</div>
                <div className="text-xs text-gray-500">{item.type} • {item.accountNumber}</div>
              </div>
              <StatusBadge status={item.type} type={item.type === 'Bank' ? 'info' : 'warning'} />
            </div>
            <div className="text-2xl font-black text-gray-800">{fmt(item.balance)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentHistoryTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await financeApi.getPaymentHistory();
        setData(res.data || []);
      } catch (e) {
        toast('Failed to load payment history', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = typeFilter ? data.filter(r => r.type === typeFilter) : data;

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Payment History</div>
          <div className="text-xs text-gray-400 mt-0.5">{filtered.length} transactions</div>
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Types</option>
          <option value="Payment">Payment</option>
          <option value="Receipt">Receipt</option>
          <option value="Journal">Journal</option>
          <option value="Contra">Contra</option>
        </select>
      </div>
      {filtered.length === 0 ? <EmptyState message="No payment history found. Sync Tally data or record payments/receipts." /> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Date', 'Type', 'Party', 'Reference', 'Amount', 'Method', 'Source'].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id || i} className={tr}>
                  <td className={td}>{item.date}</td>
                  <td className={td}><StatusBadge status={item.type} type={item.type === 'Receipt' ? 'success' : item.type === 'Payment' ? 'danger' : 'info'} /></td>
                  <td className={td} style={{ fontWeight: 600 }}>{item.party}</td>
                  <td className={td} style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.reference}</td>
                  <td className={td} style={{ fontWeight: 700, color: item.type === 'Receipt' ? '#10b981' : '#ef4444' }}>
                    {fmt(item.amount)}
                  </td>
                  <td className={td}>{item.method}</td>
                  <td className={td}><Badge text={item.source || 'ERP'} color={item.source === 'Tally' ? '#16a34a' : '#3b82f6'} bg={item.source === 'Tally' ? '#f0fdf4' : '#eff6ff'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinancialReportsTab() {
  const reportTypes = ['Trial Balance', 'Balance Sheet', 'Profit & Loss', 'Cash Flow Statement'];
  const [selectedReport, setSelectedReport] = useState(reportTypes[0]);
  const [trialBalance, setTrialBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTrialBalance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await accountsLedgerApi.getTrialBalance();
      setTrialBalance(res.data);
    } catch (e) {
      setError(e.message || 'Failed to load trial balance');
      toast('Failed to load trial balance', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateReport = () => {
    if (selectedReport === 'Trial Balance') {
      loadTrialBalance();
    } else {
      toast(`${selectedReport} report generation coming soon`, 'info');
    }
  };

  const handleExport = () => {
    if (!trialBalance) return;
    const rows = [['Ledger Code', 'Ledger Name', 'Group', 'Debit', 'Credit']];
    trialBalance.ledgers.forEach(l => {
      rows.push([
        l.ledgerCode,
        `"${l.ledgerName}"`,
        l.ledgerGroup,
        l.debit || '',
        l.credit || ''
      ]);
    });
    rows.push(['', '', 'TOTAL', trialBalance.totalDebit, trialBalance.totalCredit]);
    
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const fmt = n => n != null ? '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—';
  const C = { bg: '#f8fafc', white: '#ffffff', mid: '#64748b', red: '#ef4444', green: '#10b981', border: '#e2e8f0' };
  const td = 'px-4 py-3 text-left text-sm text-gray-700 border-b border-gray-200';
  const th = 'px-4 py-3 text-left text-sm font-bold text-gray-800 bg-gray-50 border-b border-gray-200 sticky top-0';
  const primaryBtn = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const outlineBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Financial Reports</div>
          <div className="text-xs text-gray-400 mt-0.5">Generate financial statements</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
            {reportTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button style={primaryBtn} onClick={handleGenerateReport}>📊 Generate</button>
          <button style={outlineBtn} onClick={handleExport} disabled={!trialBalance}>📥 Export</button>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      
      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}
      
      {!loading && !trialBalance ? (
        <div className="p-8 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">{selectedReport}</div>
          <div className="text-sm">Click "Generate Report" to view the {selectedReport.toLowerCase()}</div>
        </div>
      ) : trialBalance && selectedReport === 'Trial Balance' ? (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #86efac' }}>
              <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Total Debit</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{fmt(trialBalance.totalDebit)}</div>
            </div>
            <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
              <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Total Credit</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{fmt(trialBalance.totalCredit)}</div>
            </div>
            <div style={{ padding: 12, background: trialBalance.isBalanced ? '#f0fdf4' : '#fee2e2', borderRadius: 8, border: trialBalance.isBalanced ? '1px solid #86efac' : '1px solid #fca5a5' }}>
              <div style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Status</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: trialBalance.isBalanced ? '#16a34a' : '#ef4444' }}>
                {trialBalance.isBalanced ? '✅ Balanced' : `❌ Discrepancy: ${fmt(trialBalance.discrepancy)}`}
              </div>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Code', 'Ledger Name', 'Group', 'Debit', 'Credit'].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trialBalance.ledgers.map((item, i) => (
                  <tr key={item.ledgerCode} style={{ background: i % 2 === 0 ? C.bg : C.white }}>
                    <td className={td} style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: C.red }}>{item.ledgerCode}</td>
                    <td className={td} style={{ fontWeight: 600 }}>{item.ledgerName}</td>
                    <td className={td}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: item.ledgerGroup === 'Sundry Debtors' ? '#dbeafe' : item.ledgerGroup === 'Sundry Creditors' ? '#fce7f3' : '#f1f5f9', color: item.ledgerGroup === 'Sundry Debtors' ? '#1e40af' : item.ledgerGroup === 'Sundry Creditors' ? '#9d174d' : C.mid }}>
                        {item.ledgerGroup}
                      </span>
                    </td>
                    <td className={td} style={{ fontWeight: 700, color: C.green, textAlign: 'right' }}>{item.debit > 0 ? fmt(item.debit) : '—'}</td>
                    <td className={td} style={{ fontWeight: 700, color: C.red, textAlign: 'right' }}>{item.credit > 0 ? fmt(item.credit) : '—'}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #16a34a' }}>
                  <td className={td} colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                  <td className={td} style={{ color: C.green, textAlign: 'right' }}>{fmt(trialBalance.totalDebit)}</td>
                  <td className={td} style={{ color: C.red, textAlign: 'right' }}>{fmt(trialBalance.totalCredit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SalesRegisterTab() {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]       = useState(1);
  const pageSize = 50;
  const [expandedRow, setExpandedRow] = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page, limit: pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(dateFrom ? { fromDate: dateFrom } : {}),
        ...(dateTo   ? { toDate:   dateTo   } : {}),
      };
      const r = await tallyApi.getSalesInvoices(params);
      setData(r.data || []);
      setTotal(r.total ?? (r.data || []).length);
    } catch (e) {
      toast(e.message || 'Failed to load Sales Register', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [debouncedSearch, dateFrom, dateTo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtAmt = n => (n == null || n === 0) ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // Summary totals
  const totals = data.reduce((acc, row) => {
    acc.subtotal   += row.subtotal   || 0;
    acc.cgst       += row.cgst       || 0;
    acc.sgst       += row.sgst       || 0;
    acc.igst       += row.igst       || 0;
    acc.grandTotal += row.grandTotal || 0;
    return acc;
  }, { subtotal: 0, cgst: 0, sgst: 0, igst: 0, grandTotal: 0 });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Sales Register</div>
          <div className="text-xs text-gray-400 mt-0.5">{total} vouchers synced from Tally</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search party / voucher no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', width: 200 }}
          />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From Date"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To Date"
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, cursor: 'pointer', color: '#64748b', fontFamily: 'inherit' }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {data.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Subtotal',   value: totals.subtotal,   color: '#1e40af' },
            { label: 'CGST',       value: totals.cgst,       color: '#7c3aed' },
            { label: 'SGST',       value: totals.sgst,       color: '#7c3aed' },
            { label: 'IGST',       value: totals.igst,       color: '#0891b2' },
            { label: 'Grand Total',value: totals.grandTotal, color: '#16a34a' },
          ].map(k => (
            <div key={k.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '6px 14px', border: '1px solid #e2e8f0', minWidth: 110 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: k.color }}>
                {k.value > 0 ? '₹' + Number(k.value).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? <Spinner /> : data.length === 0 ? (
        <EmptyState message="No Sales vouchers found. Run a Tally sync to import data." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Voucher No', 'Date', 'Party', 'Items', 'Subtotal', 'CGST', 'SGST', 'IGST', 'Grand Total'].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <>
                    <tr
                      key={row.id || i}
                      style={{ background: i % 2 === 0 ? C.bg : C.white, cursor: 'pointer' }}
                      onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    >
                      <td className={td} style={{ fontFamily: 'monospace', fontWeight: 700, color: C.red, fontSize: 11 }}>
                        {row.voucherNumber || '—'}
                      </td>
                      <td className={td}>{fmtDate(row.date)}</td>
                      <td className={td} style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.partyName || '—'}
                      </td>
                      <td className={td}>
                        {(row.items || []).length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {(row.items || []).slice(0, 2).map((it, idx) => (
                              <span key={idx} style={{ fontSize: 10, background: '#f1f5f9', color: '#374151', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                {it.name?.length > 18 ? it.name.slice(0, 18) + '…' : it.name} ×{it.qty}
                              </span>
                            ))}
                            {(row.items || []).length > 2 && (
                              <span style={{ fontSize: 10, background: '#e2e8f0', color: '#64748b', padding: '2px 6px', borderRadius: 4 }}>
                                +{(row.items || []).length - 2}
                              </span>
                            )}
                          </div>
                        ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                      </td>
                      <td className={td} style={{ fontWeight: 600, color: '#1e40af' }}>{fmtAmt(row.subtotal)}</td>
                      <td className={td} style={{ color: '#7c3aed' }}>{fmtAmt(row.cgst)}</td>
                      <td className={td} style={{ color: '#7c3aed' }}>{fmtAmt(row.sgst)}</td>
                      <td className={td} style={{ color: '#0891b2' }}>{fmtAmt(row.igst)}</td>
                      <td className={td} style={{ fontWeight: 800, color: '#16a34a' }}>{fmtAmt(row.grandTotal)}</td>
                    </tr>

                    {/* Expanded item detail row */}
                    {expandedRow === i && (row.items || []).length > 0 && (
                      <tr key={`exp-${i}`} style={{ background: '#f0fdf4' }}>
                        <td colSpan={9} style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                            Items in {row.voucherNumber}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {['Item Name', 'Qty', 'Rate', 'Amount'].map(h => (
                                  <th key={h} style={{ textAlign: 'left', padding: '4px 10px', color: '#6b7280', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #dcfce7', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(row.items || []).map((it, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #dcfce7' }}>
                                  <td style={{ padding: '5px 10px', fontWeight: 600 }}>{it.name}</td>
                                  <td style={{ padding: '5px 10px', color: '#374151' }}>{it.qty || '—'} Nos</td>
                                  <td style={{ padding: '5px 10px', color: '#374151' }}>
                                    {it.rate ? '₹' + Number(it.rate).toLocaleString('en-IN') : '—'}
                                  </td>
                                  <td style={{ padding: '5px 10px', fontWeight: 700, color: '#16a34a' }}>
                                    {it.amount ? '₹' + Number(it.amount).toLocaleString('en-IN') : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {row.narration && (
                            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>
                              Narration: {row.narration}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={total} page={page} pageSize={pageSize} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function VendorCreditNotesTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getVendorCreditNotes(selectedVendor || undefined);
      setData(res.data || []);
    } catch (e) {
      toast('Failed to load vendor credit notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedVendor]);

  useEffect(() => { loadData(); }, [loadData]);

  const uniqueVendors = [...new Set(data.map(item => item.vendorName).filter(Boolean))].sort();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Vendor Credit Notes</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} credit notes</div>
        </div>
        <select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Vendors</option>
          {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : data.length === 0 ? (
        <EmptyState message="No vendor credit notes found." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['CN ID', 'Vendor Name', 'Invoice No', 'Amount', 'Days Open', 'Status', 'Created'].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item._id || item.id || i} className={tr}>
                  <td className={td} style={{ fontWeight: 600, color: '#3b82f6' }}>{item.cnId}</td>
                  <td className={td} style={{ fontWeight: 600 }}>{item.vendorName}</td>
                  <td className={td}>{item.invoiceNumber || '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: '#10b981' }}>{fmt(item.amount)}</td>
                  <td className={td} style={{ fontWeight: 700, color: (item.daysOpen || 0) > 14 ? '#ef4444' : (item.daysOpen || 0) > 7 ? '#f59e0b' : '#10b981' }}>
                    {item.daysOpen || 0}d
                  </td>
                  <td className={td}>
                    <StatusBadge status={item.status} type={item.status === 'Closed' ? 'success' : item.status === 'Disputed' ? 'danger' : 'warning'} />
                  </td>
                  <td className={td}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorDebitNotesTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeApi.getVendorDebitNotes(selectedVendor || undefined);
      setData(res.data || []);
    } catch (e) {
      toast('Failed to load vendor debit notes', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedVendor]);

  useEffect(() => { loadData(); }, [loadData]);

  const uniqueVendors = [...new Set(data.map(item => item.vendorName).filter(Boolean))].sort();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="text-sm font-bold text-gray-800">Vendor Debit Notes</div>
          <div className="text-xs text-gray-400 mt-0.5">{data.length} debit notes</div>
        </div>
        <select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
          <option value="">All Vendors</option>
          {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : data.length === 0 ? (
        <EmptyState message="No vendor debit notes found." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['DN ID', 'Vendor Name', 'Invoice No', 'Amount', 'Damage Type', 'Status', 'Created'].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={item._id || item.id || i} className={tr}>
                  <td className={td} style={{ fontWeight: 600, color: '#ef4444' }}>{item.dnId}</td>
                  <td className={td} style={{ fontWeight: 600 }}>{item.vendorName}</td>
                  <td className={td}>{item.invoiceNumber || '—'}</td>
                  <td className={td} style={{ fontWeight: 700, color: '#ef4444' }}>{fmt(item.totalAmount || item.debitAmount)}</td>
                  <td className={td} style={{ fontSize: 11, color: C.mid }}>{item.damageType || '—'}</td>
                  <td className={td}>
                    <StatusBadge status={item.approvalStatus} type={item.approvalStatus === 'Approved' || item.approvalStatus === 'Posted' ? 'success' : item.approvalStatus === 'Rejected' ? 'danger' : 'warning'} />
                  </td>
                  <td className={td}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const tabComponents = {
  0: DashboardTab,
  1: AccountsPayableTab,
  2: AccountsReceivableTab,
  3: SupplierPaymentsTab,
  4: DealerReceiptsTab,
  5: SupplierLedgerTab,
  6: DealerLedgerTab,
  7: TallyLedgerTab,
  8: SalesRegisterTab,
  9: OutstandingInvoicesTab,
  10: BankCashAccountsTab,
  11: PaymentHistoryTab,
  12: FinancialReportsTab,
  13: VendorCreditNotesTab,
  14: VendorDebitNotesTab,
};

export default function FinancePage({ initialTab = 0 }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const ActiveTabComponent = tabComponents[activeTab];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #f1f5f9', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 2 }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            padding: '8px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            border: 'none', background: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0',
            color: activeTab === i ? '#1e40af' : '#64748b',
            borderBottom: activeTab === i ? '2px solid #1e40af' : '2px solid transparent',
            marginBottom: -2, whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </div>

      <ActiveTabComponent />
    </div>
  );
}
