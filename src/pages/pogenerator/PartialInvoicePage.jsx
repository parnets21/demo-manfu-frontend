import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { poGeneratorApi } from '../../api/poGeneratorApi';
import { MdReceipt, MdVisibility, MdCheckCircle, MdSearch, MdDelete } from 'react-icons/md';
import Modal from '../../components/common/Modal';

const STATUS_COLORS = {
  Draft:     { bg: '#f1f5f9', color: '#64748b' },
  Approved:  { bg: '#dcfce7', color: '#16a34a' },
  Sent:      { bg: '#dbeafe', color: '#1d4ed8' },
  Paid:      { bg: '#f0fdf4', color: '#15803d' },
  Cancelled: { bg: '#fee2e2', color: '#dc2626' },
};

export default function PartialInvoicePage() {
  const navigate = useNavigate();
  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('');
  const [viewInv, setViewInv]     = useState(null);
  const [updating, setUpdating]   = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      if (search) params.search = search;
      const res = await poGeneratorApi.listInvoices(params);
      setInvoices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [filter]);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(true);
    try {
      await poGeneratorApi.updateInvoiceStatus(id, status);
      fetchInvoices();
      if (viewInv?._id === id) setViewInv(prev => ({ ...prev, status }));
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await poGeneratorApi.deleteInvoice(id);
      fetchInvoices();
      if (viewInv?._id === id) setViewInv(null);
      setDeleteConfirm(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>Partial Invoice Generator</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>All partial and full invoices generated against Purchase Orders</p>
      </div>

      {/* Quick action */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af,#172554)', borderRadius: 14, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Generate New Invoice</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>Select a PO, verify stock, and generate a partial or full invoice</div>
        </div>
        <button
          onClick={() => navigate('/po-generator/upload')}
          style={{ padding: '10px 20px', background: '#fff', color: '#1e40af', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + New Invoice from PO
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchInvoices()}
            placeholder="Search invoice no, PO ref, vendor..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}>
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Approved">Approved</option>
          <option value="Sent">Sent</option>
          <option value="Paid">Paid</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <MdReceipt size={40} style={{ marginBottom: 8, opacity: 0.3 }} />
            <div>No invoices found</div>
            <button onClick={() => navigate('/po-generator/upload')} style={{ marginTop: 12, padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              Generate First Invoice
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Invoice No', 'PO Ref', 'Vendor', 'Type', 'Items', 'Grand Total', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => {
                  const sc = STATUS_COLORS[inv.status] || STATUS_COLORS.Draft;
                  return (
                    <tr key={inv._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{inv.invoiceNo}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1d4ed8', fontWeight: 600 }}>{inv.poRef || '—'}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#1e293b' }}>{inv.vendorName || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: inv.invoiceType === 'partial' ? '#fef9c3' : '#dcfce7', color: inv.invoiceType === 'partial' ? '#a16207' : '#16a34a' }}>
                          {inv.invoiceType === 'partial' ? 'Partial' : 'Full'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569' }}>{inv.items?.length || 0}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#1e293b' }}>₹{Math.round(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>{inv.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setViewInv(inv)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                            <MdVisibility size={14} /> View
                          </button>
                          {inv.status === 'Draft' && (
                            <button onClick={() => handleStatusUpdate(inv._id, 'Approved')} disabled={updating} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                              <MdCheckCircle size={14} /> Approve
                            </button>
                          )}
                          <button onClick={() => setDeleteConfirm(inv)} disabled={deleting === inv._id} title="Delete Invoice"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 8px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 7, fontSize: 12, cursor: deleting === inv._id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleting === inv._id ? 0.6 : 1 }}>
                            <MdDelete size={15} />
                          </button>
                        </div>                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      <Modal
        open={!!viewInv}
        onClose={() => setViewInv(null)}
        title={`Invoice: ${viewInv?.invoiceNo}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            {viewInv?.status === 'Draft' && (
              <button onClick={() => handleStatusUpdate(viewInv._id, 'Approved')} disabled={updating} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Approve
              </button>
            )}
            <button onClick={() => setViewInv(null)} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Close
            </button>
          </div>
        }
      >
        {viewInv && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 20px', marginBottom: 20 }}>
              {[
                ['Invoice No', viewInv.invoiceNo],
                ['PO Reference', viewInv.poRef || '—'],
                ['Vendor', viewInv.vendorName || '—'],
                ['Type', viewInv.invoiceType === 'partial' ? 'Partial Invoice' : 'Full Invoice'],
                ['Status', viewInv.status],
                ['Date', new Date(viewInv.createdAt).toLocaleDateString('en-IN')],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>Line Items — Full Price Breakup</div>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
                    {['#','Item / HSN','Qty','Unit Rate','Disc%','Taxable Val','CGST%','CGST Amt','SGST%','SGST Amt','IGST%','IGST Amt','Tax Amt','Total Amt'].map(h => (
                      <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewInv.items || []).map((it, i) => {
                    const n = v => Number(v) || 0;
                    const taxable = n(it.taxableValue) || n(it.invoicedQty) * n(it.basePrice);
                    const cgstPct = n(it.cgst) || n(it.gst) / 2;
                    const sgstPct = n(it.sgst) || n(it.gst) / 2;
                    const igstPct = n(it.igst);
                    const cgstVal = n(it.cgstVal) || +(taxable * cgstPct / 100).toFixed(2);
                    const sgstVal = n(it.sgstVal) || +(taxable * sgstPct / 100).toFixed(2);
                    const igstVal = n(it.igstVal) || +(taxable * igstPct / 100).toFixed(2);
                    const taxAmt  = +(cgstVal + sgstVal + igstVal).toFixed(2);
                    const total   = n(it.lineTotal) || +(taxable + taxAmt).toFixed(2);
                    const fmt = v => `₹${(Number(v)||0).toLocaleString('en-IN',{minimumFractionDigits:2})}`;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i%2===0?'#fff':'#f8fafc' }}>
                        <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 700 }}>{i+1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                          {it.itemName}
                          {it.hsn && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>HSN: {it.hsn}</div>}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{n(it.invoicedQty)} {it.unit}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{fmt(it.basePrice)}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{n(it.discount)||0}%</td>
                        <td style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>{fmt(taxable)}</td>
                        <td style={{ padding: '8px 10px', color: '#1d4ed8' }}>{cgstPct}%</td>
                        <td style={{ padding: '8px 10px', color: '#1d4ed8', fontWeight: 600 }}>{fmt(cgstVal)}</td>
                        <td style={{ padding: '8px 10px', color: '#1d4ed8' }}>{sgstPct}%</td>
                        <td style={{ padding: '8px 10px', color: '#1d4ed8', fontWeight: 600 }}>{fmt(sgstVal)}</td>
                        <td style={{ padding: '8px 10px', color: '#7c3aed' }}>{igstPct}%</td>
                        <td style={{ padding: '8px 10px', color: '#7c3aed', fontWeight: 600 }}>{fmt(igstVal)}</td>
                        <td style={{ padding: '8px 10px', color: '#a16207', fontWeight: 600 }}>{fmt(taxAmt)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: '#1e40af' }}>{fmt(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={5} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: 12 }}>Totals</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#475569' }}>
                      ₹{(viewInv.items||[]).reduce((s,it) => s+(Number(it.taxableValue)||Number(it.invoicedQty)*Number(it.basePrice)||0), 0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                    <td /><td style={{ padding: '8px 10px', fontWeight: 700, color: '#1d4ed8' }}>
                      ₹{(viewInv.items||[]).reduce((s,it) => { const t=Number(it.taxableValue)||Number(it.invoicedQty)*Number(it.basePrice)||0; return s+(Number(it.cgstVal)||(t*(Number(it.cgst)||Number(it.gst)/2)/100)||0); }, 0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                    <td /><td style={{ padding: '8px 10px', fontWeight: 700, color: '#1d4ed8' }}>
                      ₹{(viewInv.items||[]).reduce((s,it) => { const t=Number(it.taxableValue)||Number(it.invoicedQty)*Number(it.basePrice)||0; return s+(Number(it.sgstVal)||(t*(Number(it.sgst)||Number(it.gst)/2)/100)||0); }, 0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                    <td /><td style={{ padding: '8px 10px', fontWeight: 700, color: '#7c3aed' }}>
                      ₹{(viewInv.items||[]).reduce((s,it) => { const t=Number(it.taxableValue)||Number(it.invoicedQty)*Number(it.basePrice)||0; return s+(Number(it.igstVal)||(t*(Number(it.igst)||0)/100)||0); }, 0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#a16207' }}>
                      ₹{(Number(viewInv.gstTotal)||0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 900, color: '#1e40af', fontSize: 14 }}>
                      ₹{(Number(viewInv.grandTotal)||0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {viewInv.notes && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#475569' }}>
                <strong>Notes:</strong> {viewInv.notes}
              </div>
            )}
          </div>
        )}
      </Modal>
      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Invoice"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <button onClick={() => setDeleteConfirm(null)} disabled={!!deleting}
              style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm._id)} disabled={!!deleting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: deleting ? 0.6 : 1 }}>
              <MdDelete size={15} /> {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        }
      >
        {deleteConfirm && (
          <div style={{ padding: '8px 0', fontSize: 14, color: '#475569' }}>
            Are you sure you want to delete <strong>{deleteConfirm.invoiceNo}</strong>? This cannot be undone.
          </div>
        )}
      </Modal>
    </div>
  );
}
