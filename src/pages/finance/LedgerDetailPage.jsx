import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { accountsLedgerApi } from '../../api/accountsLedgerApi';
import { toast } from '../../components/common/Toast';

const C = { 
  bg: '#f8fafc', white: '#ffffff', mid: '#64748b', red: '#ef4444', green: '#10b981', 
  border: '#e2e8f0', darkText: '#0f172a'
};

export default function LedgerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ledger, setLedger] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLedgerData();
  }, [id]);

  const loadLedgerData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ledgerRes, transactionsRes] = await Promise.all([
        accountsLedgerApi.getById(id),
        accountsLedgerApi.getTransactions(id)
      ]);
      
      if (!ledgerRes.success) throw new Error(ledgerRes.message);
      setLedger(ledgerRes.data);
      
      if (transactionsRes.success && transactionsRes.data?.transactions) {
        console.log('Transactions fetched:', transactionsRes.data.transactions);
        setVouchers(transactionsRes.data.transactions || []);
      } else {
        console.warn('No transactions found for this ledger');
        setVouchers([]);
      }
    } catch (err) {
      console.error('Error loading ledger:', err);
      setError(err.message || 'Failed to load ledger');
      toast('Failed to load ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!ledger) return;
    try {
      const element = document.getElementById('ledger-print-content');
      const html = element.innerHTML;
      
      const printWindow = window.open('', '', 'width=900,height=1200');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${ledger.ledgerName} - Ledger Statement</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .detail-item { margin-bottom: 10px; }
            .detail-label { font-weight: bold; color: #666; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
            .table td { padding: 10px; border: 1px solid #ddd; }
            .total-row { font-weight: bold; background: #f9fafb; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
      toast('PDF opened for download', 'success');
    } catch (err) {
      toast('Failed to download PDF', 'error');
    }
  };

  const handleDownloadCSV = () => {
    if (!ledger) return;
    try {
      const fmt = n => n != null ? Number(n).toFixed(2) : '';
      const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '';
      
      let csvContent = 'Ledger Statement\n';
      csvContent += `Generated on,${new Date().toLocaleDateString('en-IN')}\n\n`;
      csvContent += 'Ledger Details\n';
      csvContent += `Ledger Name,${ledger.ledgerName}\n`;
      csvContent += `Ledger Code,${ledger.ledgerCode}\n`;
      csvContent += `Group,${ledger.ledgerGroup}\n`;
      csvContent += `Type,${ledger.ledgerType}\n`;
      csvContent += `GST Number,${ledger.gstNumber || ''}\n`;
      csvContent += `Phone,${ledger.phone || ''}\n`;
      csvContent += `Email,${ledger.email || ''}\n`;
      csvContent += `Address,"${(ledger.address || '').replace(/"/g, '""')}"\n\n`;
      
      csvContent += 'Balance Summary\n';
      csvContent += `Opening Balance,${fmt(ledger.openingBalance)}\n`;
      
      let totalDebit = 0, totalCredit = 0;
      vouchers.forEach(v => {
        v.ledgerEntries?.forEach(entry => {
          if (entry.ledgerName === ledger.ledgerName) {
            if (entry.amount > 0) totalDebit += entry.amount;
            else totalCredit += Math.abs(entry.amount);
          }
        });
      });
      
      csvContent += `Total Debit,${fmt(totalDebit)}\n`;
      csvContent += `Total Credit,${fmt(totalCredit)}\n`;
      
      const closingBalance = ledger.closingBalance !== undefined && ledger.closingBalance !== 0 
        ? ledger.closingBalance 
        : (ledger.openingBalance + totalDebit - totalCredit);
      csvContent += `Closing Balance,${fmt(closingBalance)}\n\n`;
      
      csvContent += 'Transactions\n';
      csvContent += 'Date,Type,Reference,Debit,Credit,Narration\n';
      vouchers.forEach(v => {
        v.ledgerEntries?.forEach(entry => {
          if (entry.ledgerName === ledger.ledgerName) {
            const debit = entry.amount > 0 ? entry.amount : 0;
            const credit = entry.amount < 0 ? Math.abs(entry.amount) : 0;
            csvContent += `${fmtDate(v.voucherDate)},${v.voucherType || ''},${v.voucherNumber || ''},${fmt(debit)},${fmt(credit)},"${(v.narration || '').replace(/"/g, '""')}"\n`;
          }
        });
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ledger-${ledger.ledgerCode}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('Ledger downloaded as CSV', 'success');
    } catch (err) {
      toast('Failed to download CSV', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ fontSize: 18, color: C.mid }}>Loading ledger details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, margin: 20, background: '#fee2e2', color: '#991b1b', borderRadius: 8 }}>
        <div style={{ marginBottom: 16 }}>{error}</div>
        <button 
          onClick={() => navigate(-1)}
          style={{ padding: '8px 16px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!ledger) {
    return <div style={{ padding: 20, color: C.mid }}>Ledger not found</div>;
  }

  const fmt = n => n != null ? '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  // Calculate total debit/credit from vouchers
  let totalDebit = 0, totalCredit = 0;
  
  if (vouchers && vouchers.length > 0) {
    vouchers.forEach(v => {
      if (v.ledgerEntries && Array.isArray(v.ledgerEntries)) {
        v.ledgerEntries.forEach(entry => {
          if (entry && entry.ledgerName === ledger.ledgerName) {
            if (entry.amount > 0) {
              totalDebit += entry.amount;
            } else if (entry.amount < 0) {
              totalCredit += Math.abs(entry.amount);
            }
          }
        });
      }
    });
  }

  console.log('Ledger:', ledger.ledgerName, 'Total Debit:', totalDebit, 'Total Credit:', totalCredit);

  const closingBalance = ledger.closingBalance !== undefined && ledger.closingBalance !== 0 
    ? ledger.closingBalance 
    : (ledger.openingBalance + totalDebit - totalCredit);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '8px 12px', background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, flex: 1 }}>{ledger.ledgerName}</h1>
        <button onClick={handleDownloadCSV} style={{ padding: '8px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>📥 Download CSV</button>
        <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🖨️ Print</button>
      </div>

      {/* Printable Content */}
      <div id="ledger-print-content" style={{ background: '#fff', borderRadius: 8, padding: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', pageBreakAfter: 'always' }}>
        {/* Debug Info - Only in development */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginBottom: 20, padding: 10, background: '#f3f4f6', borderRadius: 4, fontSize: 11, color: '#6b7280', fontFamily: 'monospace', border: '1px solid #e5e7eb' }}>
            <div><strong>Debug:</strong> Vouchers loaded: {vouchers.length}</div>
            <div>Ledger Name: "{ledger.ledgerName}"</div>
            <div>Total Debit: {totalDebit}, Total Credit: {totalCredit}</div>
          </div>
        )}
        {/* Print Header */}
        <div style={{ textAlign: 'center', marginBottom: 30, borderBottom: '2px solid #333', paddingBottom: 15 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.darkText, marginBottom: 5 }}>LEDGER STATEMENT</div>
          <div style={{ fontSize: 12, color: C.mid }}>Generated on {fmtDate(new Date())}</div>
        </div>

        {/* Main Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginBottom: 30 }}>
          {/* Left Column */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Ledger Name</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.darkText }}>{ledger.ledgerName}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Ledger Code</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.red, fontFamily: 'monospace' }}>{ledger.ledgerCode}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Group</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkText }}>{ledger.ledgerGroup}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkText }}>{ledger.ledgerType}</div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>GST Number</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkText, fontFamily: 'monospace' }}>{ledger.gstNumber || '—'}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Contact Person</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkText }}>{ledger.contactPerson || '—'}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Phone</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkText }}>{ledger.phone || '—'}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.mid, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.darkText }}>{ledger.email || '—'}</div>
            </div>
          </div>
        </div>

        {/* Address and Tally Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginBottom: 30, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          {/* Address Info */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.darkText, marginBottom: 15, textTransform: 'uppercase' }}>Address</div>
            <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
              {ledger.address?.street && <div>{ledger.address.street}</div>}
              {(ledger.address?.city || ledger.address?.state) && (
                <div>{[ledger.address?.city, ledger.address?.state].filter(Boolean).join(', ')}</div>
              )}
              {ledger.address?.pincode && <div>Pincode: {ledger.address.pincode}</div>}
              {ledger.address?.country && <div>{ledger.address.country}</div>}
            </div>
          </div>

          {/* Tally Details */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.darkText, marginBottom: 15, textTransform: 'uppercase' }}>System Info</div>
            <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.8 }}>
              <div><strong>Tally GUID:</strong> {ledger.tallyGuid || '—'}</div>
              <div><strong>Synced:</strong> {ledger.syncedWithTally ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Last Sync:</strong> {fmtDate(ledger.lastTallySync)}</div>
              <div><strong>Created:</strong> {fmtDate(ledger.createdAt)}</div>
              <div><strong>Updated:</strong> {fmtDate(ledger.updatedAt)}</div>
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, marginBottom: 30, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ padding: 20, background: '#f0f9ff', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Opening Balance</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0284c7' }}>{fmt(ledger.openingBalance)}</div>
            <div style={{ fontSize: 10, color: '#0369a1', marginTop: 4 }}>{ledger.balanceType === 'Dr' ? 'Debit' : 'Credit'}</div>
          </div>

          <div style={{ padding: 20, background: '#f0fdf4', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: '#15803d', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Transaction Summary</div>
            <div style={{ fontSize: 12, color: '#15803d', marginBottom: 4 }}>Debit: {fmt(totalDebit)}</div>
            <div style={{ fontSize: 12, color: '#15803d' }}>Credit: {fmt(totalCredit)}</div>
          </div>

          <div style={{ padding: 20, background: '#fef3c7', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Closing Balance</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#b45309' }}>{fmt(closingBalance)}</div>
            <div style={{ fontSize: 10, color: '#92400e', marginTop: 4 }}>{closingBalance >= 0 ? 'Debit' : 'Credit'}</div>
          </div>
        </div>

        {/* Transactions Table */}
        {vouchers.length > 0 ? (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.darkText, marginBottom: 15, textTransform: 'uppercase', paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              Transaction History ({vouchers.length} transactions)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: 10, textAlign: 'left', border: `1px solid ${C.border}`, fontWeight: 600 }}>Date</th>
                  <th style={{ padding: 10, textAlign: 'left', border: `1px solid ${C.border}`, fontWeight: 600 }}>Type</th>
                  <th style={{ padding: 10, textAlign: 'left', border: `1px solid ${C.border}`, fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: 10, textAlign: 'right', border: `1px solid ${C.border}`, fontWeight: 600 }}>Debit</th>
                  <th style={{ padding: 10, textAlign: 'right', border: `1px solid ${C.border}`, fontWeight: 600 }}>Credit</th>
                  <th style={{ padding: 10, textAlign: 'left', border: `1px solid ${C.border}`, fontWeight: 600 }}>Narration</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: 10, border: `1px solid ${C.border}` }}>{fmtDate(voucher.voucherDate)}</td>
                    <td style={{ padding: 10, border: `1px solid ${C.border}` }}>{voucher.voucherType}</td>
                    <td style={{ padding: 10, border: `1px solid ${C.border}`, fontFamily: 'monospace' }}>{voucher.voucherNumber}</td>
                    <td style={{ padding: 10, border: `1px solid ${C.border}`, textAlign: 'right', color: C.green, fontWeight: 600 }}>
                      {voucher.ledgerEntries?.some(e => e.ledgerName === ledger.ledgerName && e.amount > 0) 
                        ? fmt(voucher.ledgerEntries.find(e => e.ledgerName === ledger.ledgerName)?.amount || 0)
                        : '—'}
                    </td>
                    <td style={{ padding: 10, border: `1px solid ${C.border}`, textAlign: 'right', color: C.red, fontWeight: 600 }}>
                      {voucher.ledgerEntries?.some(e => e.ledgerName === ledger.ledgerName && e.amount < 0)
                        ? fmt(Math.abs(voucher.ledgerEntries.find(e => e.ledgerName === ledger.ledgerName)?.amount || 0))
                        : '—'}
                    </td>
                    <td style={{ padding: 10, border: `1px solid ${C.border}`, fontSize: 11, color: C.mid }}>{voucher.narration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ marginTop: 30, padding: 20, background: '#fef3c7', borderRadius: 8, color: '#92400e' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>ℹ️ No Transactions Found</div>
            <div style={{ fontSize: 13 }}>
              This ledger has no transactions recorded yet. Opening balance: {fmt(ledger.openingBalance)}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: `1px solid ${C.border}`, textAlign: 'center', fontSize: 11, color: C.mid }}>
          <div>This is a computer-generated statement from the ERP system</div>
          <div style={{ marginTop: 5 }}>For official records, please verify with Tally ERP</div>
        </div>
      </div>
    </div>
  );
}
