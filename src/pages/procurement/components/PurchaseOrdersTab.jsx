import { useState, useEffect } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import BulkPOUpload from './BulkPOUpload';
import { poApi } from '../../../api/poApi';
import { vendorApi } from '../../../api/vendorApi';   
import { rfqApi } from '../../../api/rfqApi';
import { MdVisibility, MdDeleteOutline, MdCheckCircle, MdCancel, MdSend, MdPrint, MdDownload, MdEmail, MdEdit } from 'react-icons/md';
import { dataEvents } from '../../../utils/dataEvents';

const EMPTY_FORM = {
  vendor: '', linkedRFQ: '', deliveryDate: '',
  paymentTerms: 'Net 30', remarks: '',
  items: [{ name: '', qty: 1, unit: 'Nos', basePrice: 0, gst: 18 }],
};

export default function PurchaseOrdersTab({ showPOModal, setShowPOModal, onSaved }) {
  const [pos, setPOs]               = useState([]);
  const [vendors, setVendors]       = useState([]);
  const [rfqs, setRFQs]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(25);
  const [viewPO, setViewPO] = useState(null);
  const [editPO, setEditPO] = useState(null);
  const [deletePO, setDeletePO] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusModal, setStatusModal] = useState(null); // { po, action: 'Approved'|'Cancelled'|'Pending' }
  const [emailModal, setEmailModal] = useState(null);   // { po, to: '' }
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    vendor: '',
    linkedRFQ: '',
    deliveryDate: '',
    paymentTerms: 'Net 30',
    items: [{ name: '', qty: 1, unit: 'Nos', basePrice: 0, gst: 18 }],
    remarks: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await poApi.getAll(params);
      setPOs(res.data || []);
    } catch (e) {
      console.error('Error fetching POs:', e);
      setPOs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await vendorApi.getAll({ status: 'Active' });
      setVendors(res.data || []);
    } catch (e) {
      console.error('Error fetching vendors:', e);
      setVendors([]);
    }
  };

  const fetchRFQs = async () => {
    try {
      const res = await rfqApi.getAll({ status: 'Quoted' });
      setRFQs(res.data);
    } catch (e) {
      console.error('Error fetching RFQs:', e);
    }
  };

  // Get RFQs for selected vendor
  const getVendorRFQs = (vendorId = formData.vendor) => {
    if (!vendorId) return [];
    const selectedVendor = vendors.find(v => v._id === vendorId);
    if (!selectedVendor) return [];

    return rfqs.filter(rfq => {
      return rfq.quotations?.some(q => {
        if (!q || !q.vendor) return false;
        const qVendorId = typeof q.vendor === 'object' ? (q.vendor._id || '') : q.vendor;
        return qVendorId === vendorId;
      });
    });
  };

  // Auto-populate items when RFQ is selected (used by handleRFQChange)
  useEffect(() => { fetchPOs(); }, [filterStatus]);

  // Apply date filter client-side
  const filteredPOs = pos.filter(p => {
    if (!dateFrom && !dateTo) return true;
    const created = new Date(p.createdAt);
    created.setHours(0, 0, 0, 0);
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (created < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (created > to) return false;
    }
    return true;
  });

  useEffect(() => {
    if (showPOModal) {
      setFormData(EMPTY_FORM);
      setFormError('');
      Promise.all([
        vendorApi.getAll({ status: 'Active' }),
        rfqApi.getAll({ status: 'Quoted' }),
        rfqApi.getAll({ status: 'Closed' }),
      ]).then(([vRes, quotedRes, closedRes]) => {
        setVendors(vRes.data || []);
        setRFQs([...(quotedRes.data || []), ...(closedRes.data || [])]);
      }).catch(console.error);
    }
  }, [showPOModal]);

  // When vendor changes — find matching RFQ quotation and auto-fill items
  const handleVendorChange = (vendorId) => {
    const matchingRFQs = getVendorRFQs(vendorId);
    setFormData(prev => {
      const next = { ...prev, vendor: vendorId };

      if (prev.linkedRFQ) {
        const rfq = rfqs.find(r => r._id === prev.linkedRFQ);
        const quotation = rfq?.quotations?.find(q => {
          if (!q || !q.vendor) return false;
          const qVendorId = typeof q.vendor === 'object' ? (q.vendor._id || '') : q.vendor;
          return qVendorId === vendorId;
        });

        if (quotation?.items?.length) {
          return {
            ...next,
            items: quotation.items.map(it => ({
              name: it.name, qty: it.qty, unit: it.unit || 'Nos',
              basePrice: it.unitPrice, gst: 18,
            })),
          };
        }

        return { ...next, linkedRFQ: '', items: EMPTY_FORM.items };
      }

      if (matchingRFQs.length === 1) {
        const rfq = matchingRFQs[0];
        const quotation = rfq.quotations?.find(q => {
          if (!q || !q.vendor) return false;
          const qVendorId = typeof q.vendor === 'object' ? (q.vendor._id || '') : q.vendor;
          return qVendorId === vendorId;
        });
        return {
          ...next,
          linkedRFQ: rfq._id,
          items: quotation?.items?.length
            ? quotation.items.map(it => ({ name: it.name, qty: it.qty, unit: it.unit || 'Nos', basePrice: it.unitPrice, gst: 18 }))
            : rfq.items?.map(it => ({ name: it.name, qty: it.qty, unit: it.unit || 'Nos', basePrice: 0, gst: 18 })) || EMPTY_FORM.items,
        };
      }

      return next;
    });
  };

  // When RFQ changes — auto-select vendor + fill items from that vendor's quotation
  const handleRFQChange = (rfqId) => {
    if (!rfqId) { setFormData(prev => ({ ...prev, linkedRFQ: '', items: EMPTY_FORM.items })); return; }
    const rfq = rfqs.find(r => r._id === rfqId);
    if (!rfq) { setFormData(prev => ({ ...prev, linkedRFQ: rfqId })); return; }

    // Find quotation for currently selected vendor, or pick the best (lowest total)
    let quotation = null;
    if (formData.vendor) {
      quotation = rfq.quotations?.find(q => (q.vendor?._id || q.vendor) === formData.vendor);
    }
    if (!quotation && rfq.quotations?.length) {
      quotation = rfq.quotations.reduce((best, q) => {
        if (!q || !q.vendor) return best;
        return (q.totalAmount || 0) < (best.totalAmount || Infinity) ? q : best;
      }, rfq.quotations[0]);
    }
    const vendorId = quotation ? (quotation.vendor?._id || quotation.vendor || '') : (rfq.vendors?.[0]?._id || '');

    setFormData(prev => ({
      ...prev,
      linkedRFQ: rfqId,
      vendor: vendorId || prev.vendor,
      items: quotation?.items?.length
        ? quotation.items.map(it => ({
            name: it.name, qty: it.qty, unit: it.unit || 'Nos',
            basePrice: it.unitPrice, gst: 18,
          }))
        : rfq.items?.map(it => ({ name: it.name, qty: it.qty, unit: it.unit || 'Nos', basePrice: 0, gst: 18 }))
          || EMPTY_FORM.items,
    }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await poApi.delete(deletePO._id);
      setDeletePO(null);
      dataEvents.emit('po:changed');
      fetchPOs();
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const handleStatusChange = async () => {
    if (!statusModal) return;
    try {
      await poApi.updateStatus(statusModal.po._id, statusModal.action);
      setStatusModal(null);
      dataEvents.emit('po:changed');
      fetchPOs();
      onSaved?.();
    } catch (e) { alert(e.message); }
  };

  const handleEdit = (po) => {
    setFormData({
      vendor: po.vendor?._id || '',
      linkedRFQ: po.linkedRFQ?._id || '',
      deliveryDate: po.deliveryDate ? po.deliveryDate.split('T')[0] : '',
      paymentTerms: po.paymentTerms || 'Net 30',
      items: po.items || [{ name: '', qty: 1, unit: 'Nos', basePrice: 0, gst: 18 }],
      remarks: po.remarks || ''
    });
    setEditPO(po._id);
    setShowPOModal(true);
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', qty: 1, unit: 'Nos', basePrice: 0, gst: 18 }]
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const calcTotals = () => {
    const subtotal  = formData.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.basePrice) || 0), 0);
    const gstTotal  = formData.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.basePrice) || 0) * (parseFloat(it.gst) || 0) / 100, 0);
    return { subtotal, gstTotal, grandTotal: subtotal + gstTotal };
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formData.vendor) { setFormError('Please select a vendor.'); return; }
    if (!formData.items[0]?.name) { setFormError('Add at least one item.'); return; }
    setSaving(true);
    try {
      // Calculate totals for each item
      const items = formData.items.map(item => ({
        name: item.name,
        qty: parseFloat(item.qty) || 0,
        unit: item.unit,
        basePrice: parseFloat(item.basePrice) || 0,
        gst: parseFloat(item.gst) || 18,
        total: (parseFloat(item.qty) || 0) * (parseFloat(item.basePrice) || 0) * (1 + (parseFloat(item.gst) || 18) / 100)
      }));

      const subtotal = items.reduce((sum, item) => sum + (item.qty * item.basePrice), 0);
      const gstTotal = items.reduce((sum, item) => sum + (item.qty * item.basePrice * item.gst / 100), 0);
      const grandTotal = subtotal + gstTotal;

      const payload = {
        vendor: formData.vendor,
        linkedRFQ: formData.linkedRFQ || null,
        deliveryDate: formData.deliveryDate || null,
        paymentTerms: formData.paymentTerms,
        items,
        subtotal,
        gstTotal,
        grandTotal,
        remarks: formData.remarks
      };

      if (editPO) {
        await poApi.update(editPO, payload);
        alert('✓ Purchase Order updated successfully!');
      } else {
        await poApi.create(payload);
        alert('✓ Purchase Order created successfully!');
      }
      
      setShowPOModal(false);
      setEditPO(null);
      setFormData({
        vendor: '',
        linkedRFQ: '',
        deliveryDate: '',
        paymentTerms: 'Net 30',
        items: [{ name: '', qty: 1, unit: 'Nos', basePrice: 0, gst: 18 }],
        remarks: ''
      });
      dataEvents.emit('po:changed');
      fetchPOs();
    } catch (e) {
      console.error('Error saving PO:', e);
      alert(`❌ Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Print PO function
  const handlePrint = (po) => {
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
    const fmtAmt  = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${po.poId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1e40af; margin: 0; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .total { text-align: right; font-weight: bold; }
          .grand-total { font-size: 18px; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MANUFACTURING ERP</h1>
          <h2>Purchase Order - ${po.poId}</h2>
        </div>
        <div class="details">
          <div><strong>Vendor:</strong> ${po.vendor?.companyName || '—'}</div>
          <div><strong>Date:</strong> ${fmtDate(po.createdAt)}</div>
          ${po.deliveryDate ? `<div><strong>Delivery Date:</strong> ${fmtDate(po.deliveryDate)}</div>` : ''}
          <div><strong>Payment Terms:</strong> ${po.paymentTerms || '—'}</div>
          <div><strong>Status:</strong> ${po.status}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Unit Price</th>
              <th>GST %</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(po.items || []).map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.unit}</td>
                <td>${fmtAmt(item.basePrice)}</td>
                <td>${item.gst}%</td>
                <td>${fmtAmt(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" class="total">Subtotal:</td>
              <td class="total">${fmtAmt(po.subtotal)}</td>
            </tr>
            <tr>
              <td colspan="5" class="total">GST Total:</td>
              <td class="total">${fmtAmt(po.gstTotal)}</td>
            </tr>
            <tr>
              <td colspan="5" class="total grand-total">Grand Total:</td>
              <td class="total grand-total">${fmtAmt(po.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
        ${po.remarks ? `<div><strong>Remarks:</strong> ${po.remarks}</div>` : ''}
      </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Download PO as HTML file
  const handleDownload = (po) => {
    const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';
    const fmtA = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${po.poId}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 16px; }
    .header h1 { color: #1e40af; margin: 0 0 4px; font-size: 22px; }
    .header h2 { margin: 0; font-size: 16px; color: #475569; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 20px; font-size: 13px; }
    .details strong { color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 9px 12px; }
    .tr { text-align: right; }
    .totals { margin-left: auto; max-width: 260px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e2e8f0; }
    .grand { font-size: 16px; font-weight: 800; color: #1e40af; }
    .remarks { font-size: 13px; color: #475569; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MANUFACTURING ERP</h1>
    <h2>Purchase Order — ${po.poId}</h2>
  </div>
  <div class="details">
    <div><strong>Vendor:</strong> ${po.vendor?.companyName || '—'}</div>
    <div><strong>Date:</strong> ${fmtD(po.createdAt)}</div>
    <div><strong>Delivery Date:</strong> ${fmtD(po.deliveryDate)}</div>
    <div><strong>Payment Terms:</strong> ${po.paymentTerms || '—'}</div>
    <div><strong>Status:</strong> ${po.status}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item</th><th class="tr">Qty</th><th>Unit</th>
        <th class="tr">Base Price</th><th class="tr">GST %</th><th class="tr">Total</th>
      </tr>
    </thead>
    <tbody>
      ${(po.items || []).map(it => `
        <tr>
          <td>${it.name}</td>
          <td class="tr">${it.qty}</td>
          <td>${it.unit}</td>
          <td class="tr">${fmtA(it.basePrice)}</td>
          <td class="tr">${it.gst}%</td>
          <td class="tr">${fmtA(it.total)}</td>
        </tr>`).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${fmtA(po.subtotal)}</span></div>
    <div class="totals-row"><span>GST Total</span><span>${fmtA(po.gstTotal)}</span></div>
    <div class="totals-row grand"><span>Grand Total</span><span>${fmtA(po.grandTotal)}</span></div>
  </div>
  ${po.remarks ? `<div class="remarks"><strong>Remarks:</strong> ${po.remarks}</div>` : ''}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${po.poId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Send PO Email function — opens email modal
  const handleSendEmail = (po) => {
    setEmailModal({ po, to: po.vendor?.email || '' });
  };

  const handleEmailSubmit = async () => {
    if (!emailModal?.to) return;
    setSendingEmail(true);
    try {
      await poApi.sendEmail(emailModal.po._id, emailModal.to);
      setEmailModal(null);
      alert('✓ PO sent via email successfully!');
      fetchPOs();
    } catch (e) {
      alert(`❌ Error: ${e.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  // Send PO WhatsApp function
  const handleSendWhatsApp = async (po) => {
    try {
      const to = prompt('Enter recipient phone number (with country code):', po.vendor?.phone || '');
      if (!to) return;
      await poApi.sendWhatsApp(po._id, to);
      alert('✓ PO sent via WhatsApp successfully!');
      fetchPOs();
    } catch (e) {
      alert(`❌ Error: ${e.message}`);
    }
  };

  // Calculate paginated POs
  const startIndex = (page - 1) * pageSize;
  const paginatedPOs = filteredPOs.slice(startIndex, startIndex + pageSize);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterStatus, dateFrom, dateTo]);

  const totals = calcTotals();

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '14px 22px', borderBottom: '1px solid var(--border)', gap: 10, flexWrap: 'wrap' }}>
          <BulkPOUpload onSuccess={fetchPOs} />
          {/* Date range filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>From</span>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', maxWidth: 150 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>To</span>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={{ fontSize: 13, padding: '6px 10px', maxWidth: 150 }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ fontSize: 12, padding: '6px 10px', color: '#64748b' }}
              title="Clear date filter"
            >
              ✕ Clear
            </button>
          )}
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All Status</option>
            <option>Draft</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Received</option>
            <option>Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', minWidth: '1100px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '11px 12px' }}>PO Number</th>
                    <th style={{ padding: '11px 12px' }}>Vendor</th>
                    <th style={{ padding: '11px 12px' }}>Item Name</th>
                    <th style={{ padding: '11px 12px' }}>Subtotal</th>
                    <th style={{ padding: '11px 12px' }}>GST</th>
                    <th style={{ padding: '11px 12px' }}>Grand Total</th>
                    <th style={{ padding: '11px 12px' }}>PO Date</th>
                    <th style={{ padding: '11px 12px' }}>Status</th>
                    <th style={{ padding: '11px 12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No purchase orders found</td></tr>
                  ) : paginatedPOs.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', padding: '12px' }}>{p.poId}</td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>{p.vendor?.companyName || '—'}</td>
                    <td style={{ padding: '12px', maxWidth: 220 }}>
                      {p.items?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {p.items.slice(0, 2).map((it, idx) => (
                            <span key={idx} style={{ fontSize: 12, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200, display: 'block' }}>
                              {it.name || '—'}
                            </span>
                          ))}
                          {p.items.length > 2 && (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>+{p.items.length - 2} more</span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap', padding: '12px' }}>₹{Math.round(p.subtotal).toLocaleString()}</td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>₹{Math.round(p.gstTotal).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap', padding: '12px' }}>₹{Math.round(p.grandTotal).toLocaleString()}</td>
                    <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', padding: '12px' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}><StatusBadge status={p.status} /></td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-sm" title="View" style={{ background: '#f1f5f9', color: 'var(--text)', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setViewPO(p)}>
                          <MdVisibility size={16} />
                        </button>
                        <button className="btn btn-sm" title="Edit" style={{ background: '#fef3c7', color: '#92400e', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleEdit(p)}>
                          <MdEdit size={16} />
                        </button>
                        <button className="btn btn-sm" title="Print" style={{ background: '#f0fdf4', color: '#15803d', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbf7d0', borderRadius: 6 }} onClick={() => handlePrint(p)}>
                          <MdPrint size={16} />
                        </button>
                        <button className="btn btn-sm" title="Download" style={{ background: '#eff6ff', color: '#1d4ed8', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe', borderRadius: 6 }} onClick={() => handleDownload(p)}>
                          <MdDownload size={16} />
                        </button>
                        <button className="btn btn-sm" title="Send Email" style={{ background: '#fdf4ff', color: '#7e22ce', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9d5ff', borderRadius: 6 }} onClick={() => handleSendEmail(p)}>
                          <MdEmail size={16} />
                        </button>
                        {(p.status === 'Draft' || p.status === 'Pending') && (
                          <button className="btn btn-sm" title="Approve PO" style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbf7d0', borderRadius: 6 }}
                            onClick={() => setStatusModal({ po: p, action: 'Approved' })}>
                            <MdCheckCircle size={16} />
                          </button>
                        )}
                        {p.status === 'Draft' && (
                          <button className="btn btn-sm" title="Submit for Approval" style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe', borderRadius: 6 }}
                            onClick={() => setStatusModal({ po: p, action: 'Pending' })}>
                            <MdSend size={16} />
                          </button>
                        )}
                        {(p.status === 'Draft' || p.status === 'Pending') && (
                          <button className="btn btn-sm" title="Cancel PO" style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fecaca', borderRadius: 6 }}
                            onClick={() => setStatusModal({ po: p, action: 'Cancelled' })}>
                            <MdCancel size={16} />
                          </button>
                        )}
                        <button className="btn btn-sm" title="Delete" style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 8px', minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeletePO(p)}>
                          <MdDeleteOutline size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPOs.length > 0 && (
            <Pagination
              total={filteredPOs.length}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          )}
        </>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <Modal open={!!deletePO} onClose={() => setDeletePO(null)} title="Delete Purchase Order"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeletePO(null)} disabled={deleting}>Cancel</button>
            <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', padding: '6px 18px' }} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }>
        <p style={{ fontSize: 14, color: '#374151' }}>Are you sure you want to delete <strong>{deletePO?.poId}</strong>? This action cannot be undone.</p>
      </Modal>

      {/* View PO Modal */}
      <Modal open={!!viewPO} onClose={() => setViewPO(null)} title={`Purchase Order: ${viewPO?.poId}`} size="lg"
        footer={<button className="btn btn-primary" onClick={() => setViewPO(null)}>Close</button>}>
        {viewPO && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 20px', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>PO ID</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{viewPO.poId}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>VENDOR</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{viewPO.vendor?.companyName || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>STATUS</div>
                <div><StatusBadge status={viewPO.status} /></div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>DELIVERY DATE</div>
                <div style={{ fontSize: 14 }}>{viewPO.deliveryDate ? new Date(viewPO.deliveryDate).toLocaleDateString('en-IN') : '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>PAYMENT TERMS</div>
                <div style={{ fontSize: 14 }}>{viewPO.paymentTerms || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>CREATED ON</div>
                <div style={{ fontSize: 14 }}>{new Date(viewPO.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
              {viewPO.linkedRFQ && (
                <div style={{ gridColumn: 'span 3' }}>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, fontWeight: 600 }}>LINKED RFQ</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
                    {typeof viewPO.linkedRFQ === 'string' ? viewPO.linkedRFQ : (viewPO.linkedRFQ?.rfqId || '—')} {typeof viewPO.linkedRFQ === 'object' && viewPO.linkedRFQ?.title ? ` — ${viewPO.linkedRFQ.title}` : ''}
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Line Items ({viewPO.items?.length || 0})</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: 11 }}>ITEM NAME</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: 11 }}>QTY</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#64748B', fontSize: 11 }}>UNIT</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: 11 }}>BASE PRICE</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: 11 }}>GST %</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#64748B', fontSize: 11 }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewPO.items || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.qty}</td>
                      <td style={{ padding: '10px 12px' }}>{item.unit}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{parseFloat(item.basePrice).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{item.gst}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>₹{Math.round(item.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>₹{Math.round(viewPO.subtotal).toLocaleString()}</td>
                  </tr>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>GST Total:</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>₹{Math.round(viewPO.gstTotal).toLocaleString()}</td>
                  </tr>
                  <tr style={{ background: '#FEF2F2' }}>
                    <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>Grand Total:</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#1e40af', fontSize: 16 }}>₹{Math.round(viewPO.grandTotal).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* Create/Edit PO Modal */}
      <Modal open={showPOModal} onClose={() => { setShowPOModal(false); setEditPO(null); }} title={editPO ? 'Edit Purchase Order' : 'Create Purchase Order'} size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowPOModal(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? (editPO ? 'Updating...' : 'Creating...') : (editPO ? 'Update PO' : 'Create PO')}
            </button>
          </>
        }>

        {formError && (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
            {formError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">Vendor *</label>
            <select className="form-select" value={formData.vendor} onChange={e => handleVendorChange(e.target.value)}>
              <option value="">Select vendor</option>
              {vendors.map(v => <option key={v._id} value={v._id}>{v.companyName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Linked RFQ (Optional — auto-fills items)</label>
            <select className="form-select" value={formData.linkedRFQ} onChange={e => handleRFQChange(e.target.value)} disabled={!formData.vendor}>
              <option value="">— None —</option>
              {getVendorRFQs().map(r => <option key={r._id} value={r._id}>{r.rfqId} — {r.title || r.quotations?.length + ' quote(s)'}</option>)}
            </select>
            {!formData.vendor && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Select a vendor first to see linked RFQs</div>}
            {formData.vendor && getVendorRFQs().length === 0 && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>No quoted RFQs for this vendor</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-input" value={formData.deliveryDate} onChange={e => setFormData(p => ({ ...p, deliveryDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Terms</label>
            <select className="form-select" value={formData.paymentTerms} onChange={e => setFormData(p => ({ ...p, paymentTerms: e.target.value }))}>
              <option>Net 30</option><option>Net 45</option><option>Net 60</option>
              <option>Net 90</option><option>Advance Payment</option><option>COD</option>
            </select>
          </div>
        </div>

        {/* Vendor Details Card */}
        {formData.vendor && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>👤 VENDOR DETAILS</div>
            {vendors.find(v => v._id === formData.vendor) && (() => {
              const vendor = vendors.find(v => v._id === formData.vendor);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 13 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>COMPANY</div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{vendor.companyName || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CONTACT PERSON</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{vendor.contactPerson || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>PHONE</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{vendor.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>EMAIL</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{vendor.email || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>CITY</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{vendor.city || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>PAYMENT TERMS</div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{vendor.paymentTerms || 'N/A'}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* RFQ Details Card */}
        {formData.linkedRFQ && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 12 }}>📋 LINKED RFQ DETAILS</div>
            {rfqs.find(r => r._id === formData.linkedRFQ) && (() => {
              const rfq = rfqs.find(r => r._id === formData.linkedRFQ);
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 13, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: '#1e40af', fontSize: 11, marginBottom: 4, opacity: 0.7, fontWeight: 600 }}>RFQ ID</div>
                      <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 14 }}>{rfq.rfqId || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#1e40af', fontSize: 11, marginBottom: 4, opacity: 0.7, fontWeight: 600 }}>TITLE</div>
                      <div style={{ fontWeight: 600, color: '#1e40af' }}>{rfq.title || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#1e40af', fontSize: 11, marginBottom: 4, opacity: 0.7, fontWeight: 600 }}>DUE DATE</div>
                      <div style={{ fontWeight: 600, color: '#1e40af' }}>{rfq.dueDate ? new Date(rfq.dueDate).toLocaleDateString('en-IN') : 'N/A'}</div>
                    </div>
                  </div>  
                  <div style={{ background: '#dbeafe', borderRadius: 8, padding: 10, marginTop: 10 }}>
                    <div style={{ color: '#1e40af', fontSize: 11, marginBottom: 6, opacity: 0.7, fontWeight: 600 }}>📦 ITEMS IN RFQ</div>
                    <div style={{ fontSize: 12, color: '#1e40af' }}>
                      {rfq.items && rfq.items.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          {rfq.items.map((item, idx) => (
                            <div key={idx} style={{ background: '#fff', padding: 8, borderRadius: 6, borderLeft: '3px solid #1e40af' }}>
                              <div style={{ fontWeight: 600, color: '#1e40af', fontSize: 12 }}>{item.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Qty: {item.qty} {item.unit}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#64748b' }}>No items in this RFQ</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Items</div>
          <button className="btn btn-sm btn-outline" onClick={() => setFormData(p => ({ ...p, items: [...p.items, { name: '', qty: 1, unit: 'Nos', basePrice: 0, gst: 18 }] }))}>+ Add Item</button>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['ITEM NAME','QTY','UNIT','BASE PRICE','GST %','TOTAL',''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'TOTAL' || h === 'QTY' || h === 'BASE PRICE' || h === 'GST %' ? 'right' : 'left', fontWeight: 600, color: '#64748B', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, i) => {
                const itemTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.basePrice) || 0) * (1 + (parseFloat(item.gst) || 0) / 100);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="text" className="form-input" placeholder="Item name" value={item.name}
                        onChange={e => handleItemChange(i, 'name', e.target.value)} style={{ minWidth: 150 }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="number" className="form-input" value={item.qty}
                        onChange={e => handleItemChange(i, 'qty', e.target.value)} style={{ width: 70, textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <select className="form-select" value={item.unit} onChange={e => handleItemChange(i, 'unit', e.target.value)} style={{ width: 90 }}>
                        {['Nos','Kg','Grams','Litre','ML','Metre','CM','Set','Box','Carton','Pcs','Dozen'].map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="number" className="form-input" value={item.basePrice}
                        onChange={e => handleItemChange(i, 'basePrice', e.target.value)} style={{ width: 100, textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="number" className="form-input" value={item.gst}
                        onChange={e => handleItemChange(i, 'gst', e.target.value)} style={{ width: 70, textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>₹{Math.round(itemTotal).toLocaleString()}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {formData.items.length > 1 && (
                        <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px' }}
                          onClick={() => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))}>×</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginLeft: 'auto', maxWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span>Subtotal</span><span style={{ fontWeight: 600 }}>₹{Math.round(totals.subtotal).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span>GST Total</span><span style={{ fontWeight: 600 }}>₹{Math.round(totals.gstTotal).toLocaleString()}</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: '#1e40af' }}>
            <span>Grand Total</span><span>₹{Math.round(totals.grandTotal).toLocaleString()}</span>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">Remarks</label>
          <textarea className="form-input" rows={2} value={formData.remarks}
            onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))}
            placeholder="Additional notes..." />
        </div>
      </Modal>

      {/* Send Email Modal */}
      <Modal
        open={!!emailModal}
        onClose={() => setEmailModal(null)}
        title="Send Purchase Order via Email"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setEmailModal(null)} disabled={sendingEmail}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleEmailSubmit}
              disabled={sendingEmail || !emailModal?.to}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', minWidth: 110 }}
            >
              {sendingEmail ? 'Sending...' : '✉ Send Email'}
            </button>
          </>
        }
      >
        {emailModal && (
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <MdEmail size={24} style={{ color: '#7e22ce', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{emailModal.po.poId}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{emailModal.po.vendor?.companyName} · ₹{Math.round(emailModal.po.grandTotal || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Recipient Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="vendor@example.com"
                value={emailModal.to}
                onChange={e => setEmailModal(prev => ({ ...prev, to: e.target.value }))}
                autoFocus
              />
              {emailModal.po.vendor?.email && emailModal.to !== emailModal.po.vendor.email && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Vendor email on file: <span style={{ fontWeight: 600, color: '#7e22ce', cursor: 'pointer' }} onClick={() => setEmailModal(prev => ({ ...prev, to: prev.po.vendor.email }))}>{emailModal.po.vendor.email}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Modal */}      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={
          statusModal?.action === 'Approved' ? 'Approve Purchase Order' :
          statusModal?.action === 'Cancelled' ? 'Cancel Purchase Order' :
          'Submit for Approval'
        }
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setStatusModal(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleStatusChange}
              style={{
                background: statusModal?.action === 'Approved' ? 'linear-gradient(135deg,#22c55e,#16a34a)' :
                  statusModal?.action === 'Cancelled' ? 'linear-gradient(135deg,#3b82f6,#1e40af)' :
                  'linear-gradient(135deg,#3b82f6,#2563eb)',
              }}
            >
              {statusModal?.action === 'Approved' ? '✓ Approve PO' :
               statusModal?.action === 'Cancelled' ? '✗ Cancel PO' : '→ Submit PO'}
            </button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>
            {statusModal?.action === 'Approved' ? '✅' : statusModal?.action === 'Cancelled' ? '❌' : '📤'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#1e293b' }}>
            {statusModal?.action === 'Approved' ? 'Approve this PO?' :
             statusModal?.action === 'Cancelled' ? 'Cancel this PO?' : 'Submit this PO for approval?'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            {statusModal?.action === 'Approved'
              ? 'Approving will allow a GRN to be created against this PO.'
              : statusModal?.action === 'Cancelled'
              ? 'This PO will be cancelled and cannot be used for GRN.'
              : 'PO will be submitted for manager approval.'}
          </div>
          {statusModal?.po && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, textAlign: 'left', maxWidth: 320, margin: '0 auto' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>PO DETAILS</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>{statusModal.po.poId}</div>
              <div style={{ fontSize: 12, color: '#475569' }}>{statusModal.po.vendor?.companyName} · ₹{Math.round(statusModal.po.grandTotal || 0).toLocaleString('en-IN')}</div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
