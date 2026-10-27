import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Pagination from '../../../../components/common/Pagination';
import { rfqApi } from '../../../../api/rfqApi';
import { vendorApi } from '../../../../api/vendorApi';
import { prApi } from '../../../../api/prApi';
import { MdCompareArrows, MdDeleteOutline, MdVisibility, MdClose, MdAdd, MdAttachFile, MdEdit } from 'react-icons/md';
import CompareQuotesModal from './CompareQuotesModal';

export default function RFQList({ onCompare, refresh }) {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteRFQ, setDeleteRFQ] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewRFQ, setViewRFQ] = useState(null);
  const [editRFQ, setEditRFQ] = useState(null);
  const [addQuoteRFQ, setAddQuoteRFQ] = useState(null); // open compare/add-quote modal directly
  const [editForm, setEditForm] = useState({});
  const [editItems, setEditItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [prs, setPrs] = useState([]);
  const [editVendors, setEditVendors] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [editAttachments, setEditAttachments] = useState([]);

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await rfqApi.getAll(params);
      setRfqs(res.data);
    } catch (e) {
      console.error('RFQ fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRFQs(); }, [filterStatus, refresh]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await rfqApi.delete(deleteRFQ._id);
      setDeleteRFQ(null);
      fetchRFQs();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditOpen = async (rfq) => {
    setEditRFQ(rfq);
    setEditForm({
      title: rfq.title,
      dueDate: rfq.dueDate?.split('T')[0] || '',
      priority: rfq.priority,
      termsConditions: rfq.termsConditions || '',
      linkedPR: rfq.linkedPR?._id || '',
    });
    setEditItems(rfq.items || []);
    setEditVendors(rfq.vendors?.map(v => v._id) || []);
    setEditAttachments(rfq.attachments?.map(a => ({ name: a, file: null })) || []);
    
    // Load vendors and PRs
    setLoadingData(true);
    try {
      const [vendorsRes, prsRes] = await Promise.all([
        vendorApi.getAll({ status: 'Active' }),
        prApi.getAll({ status: 'Pending' })
      ]);
      setVendors(vendorsRes.data);
      setPrs(prsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleEditSave = async () => {
    if (!editForm.title.trim()) {
      alert('Please enter RFQ title');
      return;
    }
    if (editVendors.length === 0) {
      alert('Please select at least one vendor');
      return;
    }
    if (!editForm.dueDate) {
      alert('Please select due date');
      return;
    }
    if (editItems.some(item => !item.name.trim() || !item.qty)) {
      alert('Please fill all item details');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        dueDate: editForm.dueDate,
        priority: editForm.priority,
        termsConditions: editForm.termsConditions.trim() || '',
        linkedPR: editForm.linkedPR || null,
        vendors: editVendors,
        items: editItems.map(item => ({
          sku: item.sku?.trim() || null,
          name: item.name.trim(),
          qty: parseFloat(item.qty),
          unit: item.unit,
          basePrice: item.basePrice ? parseFloat(item.basePrice) : null,
          gst: parseFloat(item.gst) || 18,
          lastPrice: item.lastPrice ? parseFloat(item.lastPrice) : null,
        })),
        attachments: editAttachments.map(a => a.name),
      };

      await rfqApi.update(editRFQ._id, payload);
      setEditRFQ(null);
      fetchRFQs();
      alert('RFQ updated successfully');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateEditItem = (i, field, value) =>
    setEditItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const removeEditItem = (i) => setEditItems(prev => prev.filter((_, idx) => idx !== i));

  const addEditItem = () => setEditItems(prev => [...prev, { sku: '', name: '', qty: '', unit: 'Nos', basePrice: '', gst: 18, lastPrice: '' }]);

  const toggleEditVendor = (vendorId) =>
    setEditVendors(prev =>
      prev.includes(vendorId) ? prev.filter(v => v !== vendorId) : [...prev, vendorId]
    );

  const handleEditAttachmentAdd = (e) => {
    const files = Array.from(e.target.files || []);
    setEditAttachments(prev => [...prev, ...files.map(f => ({ file: f, name: f.name, size: f.size }))]);
  };

  const removeEditAttachment = (idx) => {
    setEditAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculate paginated RFQs
  const startIndex = (page - 1) * pageSize;
  const paginatedRFQs = rfqs.slice(startIndex, startIndex + pageSize);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 'none', boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 22px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Request for Quotations</div>
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All Status</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Quoted</option>
            <option>Closed</option>
            <option>Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', width: '100%', background: 'transparent' }}>
              <table style={{ width: '100%', minWidth: '900px', background: 'transparent' }}>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>RFQ ID</th>
                    <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Title</th>
                    <th style={{ padding: '11px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Vendors</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Items</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Due Date</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Priority</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                    <th style={{ padding: '11px 12px', textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>No RFQs found</td></tr>
                  ) : paginatedRFQs.map((r) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap', padding: '12px', fontSize: 12, fontFamily: 'monospace' }}>{r.rfqId}</td>
                    <td style={{ fontWeight: 600, padding: '12px', fontSize: 13, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {r.vendors?.slice(0, 2).map(v => (
                          <span key={v._id} style={{ fontSize: 11, background: '#f1f5f9', padding: '4px 10px', borderRadius: 12, color: '#475569', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {v.companyName}
                          </span>
                        ))}
                        {r.vendors?.length > 2 && (
                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, padding: '4px 8px' }}>+{r.vendors.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.items?.length || 0}</td>
                    <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', padding: '12px', textAlign: 'center' }}>
                      {r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, display: 'inline-block',
                        background: r.priority === 'Critical' ? '#fee2e2' : r.priority === 'Urgent' ? '#fef3c7' : '#f1f5f9',
                        color: r.priority === 'Critical' ? '#991b1b' : r.priority === 'Urgent' ? '#92400e' : '#475569',
                      }}>{r.priority}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, display: 'inline-block',
                        background: r.status === 'Sent' ? '#dcfce7' : r.status === 'Draft' ? '#fef3c7' : r.status === 'Quoted' ? '#dbeafe' : '#f1f5f9',
                        color: r.status === 'Sent' ? '#166534' : r.status === 'Draft' ? '#92400e' : r.status === 'Quoted' ? '#1e40af' : '#475569',
                      }}>{r.status}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', padding: '12px', textAlign: 'center' }}>
                      <style>{`
                        .rfq-action-btn {
                          display: inline-flex;
                          align-items: center;
                          justify-content: center;
                          width: 36px;
                          height: 36px;
                          border-radius: 8px;
                          border: 1.5px solid;
                          cursor: pointer;
                          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                          font-family: inherit;
                          flex-shrink: 0;
                        }
                        .rfq-action-btn:hover {
                          transform: translateY(-2px);
                          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                        }
                        .rfq-action-btn:active {
                          transform: translateY(0);
                        }
                        .rfq-action-view {
                          background: #f1f5f9;
                          color: #475569;
                          border-color: #cbd5e1;
                        }
                        .rfq-action-view:hover {
                          background: #e2e8f0;
                          border-color: #94a3b8;
                          color: #1e293b;
                        }
                        .rfq-action-edit {
                          background: #fef2f2;
                          color: #ef4444;
                          border-color: #fecaca;
                        }
                        .rfq-action-edit:hover {
                          background: #fee2e2;
                          border-color: #f87171;
                          color: #991b1b;
                        }
                        .rfq-action-compare {
                          background: #f0fdf4;
                          color: #16a34a;
                          border-color: #bbf7d0;
                        }
                        .rfq-action-compare:hover {
                          background: #dcfce7;
                          border-color: #86efac;
                          color: #15803d;
                        }
                        .rfq-action-delete {
                          background: #fee2e2;
                          color: #dc2626;
                          border-color: #fecaca;
                        }
                        .rfq-action-delete:hover {
                          background: #fecaca;
                          border-color: #f87171;
                          color: #991b1b;
                        }
                      `}</style>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          className="rfq-action-btn rfq-action-view" 
                          title="View Details" 
                          onClick={() => setViewRFQ(r)}
                        >
                          <MdVisibility size={18} />
                        </button>
                        <button 
                          className="rfq-action-btn rfq-action-edit" 
                          title="Edit RFQ" 
                          onClick={() => handleEditOpen(r)}
                        >
                          <MdEdit size={20} />
                        </button>
                        {/* Add Quote / Compare — main action */}
                        <button
                          title={r.quotations?.length > 0 ? `${r.quotations.length} quote(s) — Compare` : 'Add vendor quotation'}
                          onClick={() => { setAddQuoteRFQ(r); onCompare(r); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                            border: `1.5px solid ${r.quotations?.length > 0 ? '#bbf7d0' : '#fde68a'}`,
                            background: r.quotations?.length > 0 ? '#f0fdf4' : '#fffbeb',
                            color: r.quotations?.length > 0 ? '#15803d' : '#92400e',
                            fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                          }}
                        >
                          {r.quotations?.length > 0
                            ? <><MdCompareArrows size={14} /> {r.quotations.length} Quote{r.quotations.length > 1 ? 's' : ''}</>
                            : <><MdAdd size={14} /> Add Quote</>
                          }
                        </button>
                        <button 
                          className="rfq-action-btn rfq-action-delete" 
                          title="Delete RFQ"
                          onClick={() => setDeleteRFQ(r)}
                        >
                          <MdDeleteOutline size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rfqs.length > 0 && (
            <Pagination
              total={rfqs.length}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          )}
        </>
        )}
      </div>

      {/* View RFQ Modal */}
      {viewRFQ && (
        <Modal open={!!viewRFQ} onClose={() => setViewRFQ(null)} title={`RFQ Details: ${viewRFQ.rfqId}`} size="lg"
          footer={<button className="btn btn-primary" onClick={() => setViewRFQ(null)}>Close</button>}>
          
          <style>{`
            .rfq-section { margin-bottom: 28px; }
            .rfq-section:last-child { margin-bottom: 0; }
            .rfq-section-title { 
              font-size: 12px; 
              font-weight: 800; 
              color: #64748b; 
              text-transform: uppercase; 
              letter-spacing: 1px; 
              margin-bottom: 14px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .rfq-section-title::before {
              content: '';
              width: 3px;
              height: 16px;
              background: #ef4444;
              border-radius: 2px;
            }
            .rfq-info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
              margin-bottom: 24px;
              padding: 16px;
              background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
              border-radius: 12px;
              border: 1px solid #fee2e2;
            }
            .rfq-info-item {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .rfq-info-label {
              font-size: 10px;
              font-weight: 700;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .rfq-info-value {
              font-size: 14px;
              font-weight: 700;
              color: #1e293b;
            }
            .rfq-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 700;
              width: fit-content;
            }
            .rfq-badge.priority-critical { background: #fee2e2; color: #991b1b; }
            .rfq-badge.priority-urgent { background: #fef3c7; color: #92400e; }
            .rfq-badge.priority-normal { background: #f1f5f9; color: #475569; }
            .rfq-badge.status-sent { background: #dcfce7; color: #166534; }
            .rfq-badge.status-draft { background: #fef3c7; color: #92400e; }
            .rfq-badge.status-quoted { background: #dbeafe; color: #1e40af; }
            .rfq-badge.status-closed { background: #f1f5f9; color: #475569; }
            .rfq-vendor-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 10px;
            }
            .rfq-vendor-card {
              padding: 12px 14px;
              border-radius: 10px;
              border: 1.5px solid #e2e8f0;
              background: #f8fafc;
              font-size: 12px;
              font-weight: 600;
              color: #1e293b;
              display: flex;
              align-items: center;
              gap: 10px;
              transition: all 0.2s;
            }
            .rfq-vendor-card:hover {
              border-color: #ef4444;
              background: #fef2f2;
              box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
            }
            .rfq-vendor-dot {
              width: 8px;
              height: 8px;
              background: #ef4444;
              border-radius: 50%;
              flex-shrink: 0;
            }
            .rfq-items-table {
              width: 100%;
              border-collapse: collapse;
              background: #fff;
            }
            .rfq-items-table thead tr {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-bottom: 2px solid #e2e8f0;
            }
            .rfq-items-table th {
              padding: 12px 14px;
              text-align: left;
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .rfq-items-table th:nth-child(1) {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              color: #475569;
            }
            .rfq-items-table th:nth-child(5) {
              text-align: right;
              background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.04) 100%);
              color: #991b1b;
            }
            .rfq-items-table th:nth-child(7) {
              text-align: right;
              background: linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%);
              color: #1e40af;
            }
            .rfq-items-table th:nth-child(3),
            .rfq-items-table th:nth-child(5),
            .rfq-items-table th:nth-child(6),
            .rfq-items-table th:nth-child(7) {
              text-align: center;
            }
            .rfq-items-table td {
              padding: 12px 14px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 12px;
              color: #1e293b;
            }
            .rfq-items-table tbody tr:hover {
              background: #fef2f2;
            }
            .rfq-items-table td:nth-child(1) {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              color: #64748b;
              font-weight: 600;
              background: #f8fafc;
              letter-spacing: 0.5px;
            }
            .rfq-items-table td:nth-child(2) {
              font-weight: 600;
              color: #1e293b;
            }
            .rfq-items-table td:nth-child(3),
            .rfq-items-table td:nth-child(5),
            .rfq-items-table td:nth-child(6),
            .rfq-items-table td:nth-child(7) {
              text-align: center;
            }
            .rfq-items-table td:nth-child(5) {
              text-align: right;
              font-weight: 700;
              color: #ef4444;
              background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%);
            }
            .rfq-items-table td:nth-child(7) {
              text-align: right;
              font-weight: 700;
              color: #2563eb;
              background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%);
            }
            .rfq-terms-box {
              padding: 16px;
              background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
              border-radius: 10px;
              border: 1px solid #fde68a;
              font-size: 12px;
              color: #78350f;
              line-height: 1.8;
              white-space: pre-wrap;
              word-break: break-word;
              font-family: inherit;
            }
            .rfq-attachments-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 12px;
            }
            .rfq-attachment-card {
              padding: 14px 16px;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 12px;
              border: 1.5px solid #e2e8f0;
              font-size: 12px;
              color: #475569;
              display: flex;
              flex-direction: column;
              gap: 8px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              position: relative;
              overflow: hidden;
            }
            .rfq-attachment-card::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e);
              opacity: 0;
              transition: opacity 0.3s;
            }
            .rfq-attachment-card:hover {
              background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%);
              border-color: #ef4444;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
              transform: translateY(-2px);
            }
            .rfq-attachment-card:hover::before {
              opacity: 1;
            }
            .rfq-attachment-header {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .rfq-attachment-icon {
              font-size: 24px;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border-radius: 8px;
              border: 1px solid #fecaca;
            }
            .rfq-attachment-name {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-weight: 600;
              color: #1e293b;
              flex: 1;
            }
            .rfq-attachment-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 11px;
              color: #94a3b8;
            }
            .rfq-attachment-type {
              display: inline-block;
              padding: 2px 8px;
              background: #f1f5f9;
              border-radius: 4px;
              font-weight: 600;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }
            @media (max-width: 768px) {
              .rfq-attachments-grid { grid-template-columns: 1fr; }
            }
            @media (max-width: 768px) {
              .rfq-info-grid { grid-template-columns: repeat(2, 1fr); }
              .rfq-vendor-grid { grid-template-columns: 1fr; }
              .rfq-attachments-grid { grid-template-columns: 1fr; }
            }
          `}</style>

          {/* Header Info Grid */}
          <div className="rfq-info-grid">
            <div className="rfq-info-item">
              <span className="rfq-info-label">RFQ Title</span>
              <span className="rfq-info-value">{viewRFQ.title}</span>
            </div>
            <div className="rfq-info-item">
              <span className="rfq-info-label">Due Date</span>
              <span className="rfq-info-value">{viewRFQ.dueDate ? new Date(viewRFQ.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
            </div>
            <div className="rfq-info-item">
              <span className="rfq-info-label">Priority</span>
              <span className={`rfq-badge priority-${viewRFQ.priority?.toLowerCase()}`}>{viewRFQ.priority}</span>
            </div>
            <div className="rfq-info-item">
              <span className="rfq-info-label">Status</span>
              <span className={`rfq-badge status-${viewRFQ.status?.toLowerCase()}`}>{viewRFQ.status}</span>
            </div>
          </div>

          {/* Linked PR Section */}
          {viewRFQ.linkedPR && (
            <div className="rfq-section">
              <div className="rfq-section-title">Linked Purchase Requisition</div>
              <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #bbf7d0', fontSize: 13, fontWeight: 600, color: '#166534' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{viewRFQ.linkedPR.prId}</span> — {viewRFQ.linkedPR.department}
              </div>
            </div>
          )}

          {/* Vendors Section */}
          <div className="rfq-section">
            <div className="rfq-section-title">Selected Vendors ({viewRFQ.vendors?.length || 0})</div>
            <div className="rfq-vendor-grid">
              {viewRFQ.vendors?.map(v => (
                <div key={v._id} className="rfq-vendor-card">
                  <div className="rfq-vendor-dot"></div>
                  <span>{v.companyName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items Section */}
          <div className="rfq-section">
            <div className="rfq-section-title">RFQ Items ({viewRFQ.items?.length || 0})</div>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table className="rfq-items-table" style={{ minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>SKU</th>
                    <th style={{ width: '25%' }}>Item Name</th>
                    <th style={{ width: '10%' }}>Qty</th>
                    <th style={{ width: '10%' }}>Unit</th>
                    <th style={{ width: '15%' }}>Base Price</th>
                    <th style={{ width: '10%' }}>GST %</th>
                    <th style={{ width: '18%' }}>Last Price</th>
                  </tr>
                </thead>
                <tbody>
                  {viewRFQ.items && viewRFQ.items.length > 0 ? (
                    viewRFQ.items.map((item, idx) => (
                      <tr key={idx} style={{ cursor: 'pointer' }} onClick={() => setSelectedItem(item)}>
                        <td style={{ width: '12%' }}>{item.sku || '—'}</td>
                        <td style={{ width: '25%' }}>{item.name}</td>
                        <td style={{ width: '10%' }}>{item.qty}</td>
                        <td style={{ width: '10%' }}>{item.unit}</td>
                        <td style={{ width: '15%' }}>{item.basePrice ? `₹${parseFloat(item.basePrice).toFixed(2)}` : '—'}</td>
                        <td style={{ width: '10%' }}>{item.gst || 18}%</td>
                        <td style={{ width: '18%' }}>{item.lastPrice ? `₹${parseFloat(item.lastPrice).toFixed(2)}` : '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No items added</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms & Conditions Section */}
          {viewRFQ.termsConditions && (
            <div className="rfq-section">
              <div className="rfq-section-title">Terms & Conditions</div>
              <div className="rfq-terms-box">
                {viewRFQ.termsConditions}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          {viewRFQ.attachments && viewRFQ.attachments.length > 0 && (
            <div className="rfq-section">
              <div className="rfq-section-title">Attachments ({viewRFQ.attachments.length})</div>
              <div className="rfq-attachments-grid">
                {viewRFQ.attachments.map((att, idx) => {
                  // Extract file extension
                  const fileExt = att.split('.').pop()?.toUpperCase() || 'FILE';
                  const fileSize = Math.random() * 5 + 0.5; // Mock file size
                  
                  return (
                    <div key={idx} className="rfq-attachment-card">
                      <div className="rfq-attachment-header">
                        <div className="rfq-attachment-icon">
                          {fileExt === 'PDF' ? '📄' : fileExt === 'XLSX' || fileExt === 'XLS' ? '📊' : fileExt === 'DOCX' || fileExt === 'DOC' ? '📝' : fileExt === 'PNG' || fileExt === 'JPG' || fileExt === 'JPEG' ? '🖼️' : '📎'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="rfq-attachment-name" title={att}>{att}</div>
                          <div className="rfq-attachment-meta">
                            <span className="rfq-attachment-type">{fileExt}</span>
                            <span>•</span>
                            <span>{fileSize.toFixed(1)} MB</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteRFQ} onClose={() => setDeleteRFQ(null)} title="Delete RFQ"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteRFQ(null)} disabled={deleting}>Cancel</button>
            <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', padding: '6px 18px' }} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }>
        <p style={{ fontSize: 14, color: '#374151' }}>Are you sure you want to delete <strong>{deleteRFQ?.rfqId}</strong>? This action cannot be undone.</p>
      </Modal>

      {/* Edit RFQ Modal */}
      {editRFQ && (
        <Modal open={!!editRFQ} onClose={() => setEditRFQ(null)} title={`Edit RFQ: ${editRFQ.rfqId}`} size="lg"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setEditRFQ(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }>
          
          {loadingData ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading vendors and PRs...</div>
          ) : (
            <>
              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group">
                  <label className="form-label">RFQ Title *</label>
                  <input className="form-input" placeholder="e.g. Raw Material Supply Q3" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Link PR (optional)</label>
                  <select className="form-select" value={editForm.linkedPR} onChange={e => setEditForm({ ...editForm, linkedPR: e.target.value })}>
                    <option value="">— None —</option>
                    {prs.map(p => <option key={p._id} value={p._id}>{p.prId} — {p.department}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input type="date" className="form-input" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                    <option>Normal</option><option>Urgent</option><option>Critical</option>
                  </select>
                </div>
              </div>

              {/* Vendor Selection */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Select Vendors *</div>
                {vendors.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)' }}>
                    No active vendors found. Please add vendors first.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {vendors.map(v => (
                        <div key={v._id} onClick={() => toggleEditVendor(v._id)}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            border: `1.5px solid ${editVendors.includes(v._id) ? 'var(--primary)' : 'var(--border)'}`,
                            background: editVendors.includes(v._id) ? '#fdf5f5' : '#f8fafc',
                            color: editVendors.includes(v._id) ? 'var(--primary)' : 'var(--text)',
                            transition: 'all 0.2s',
                          }}>
                          {v.companyName}
                        </div>
                      ))}
                    </div>
                    {editVendors.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 6, fontWeight: 600 }}>
                        ✓ {editVendors.length} vendor(s) selected
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Items *</div>
                  <button className="btn btn-outline btn-sm" onClick={addEditItem}>+ Add Item</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowX: 'auto', marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr auto', gap: 8, minWidth: '1200px' }}>
                    {['SKU', 'ITEM NAME', 'QTY', 'UNIT', 'BASE PRICE', 'GST %', 'LAST PRICE', ''].map(h => (
                      <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</span>
                    ))}
                  </div>
                  {editItems.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr auto', gap: 8, alignItems: 'center', minWidth: '1200px' }}>
                      <input className="form-input" placeholder="SKU-001" value={item.sku} onChange={e => updateEditItem(i, 'sku', e.target.value)} style={{ fontSize: 12 }} />
                      <input className="form-input" placeholder="Item name" value={item.name} onChange={e => updateEditItem(i, 'name', e.target.value)} style={{ fontSize: 12 }} />
                      <input className="form-input" placeholder="0" type="number" value={item.qty} onChange={e => updateEditItem(i, 'qty', e.target.value)} style={{ fontSize: 12 }} />
                      <select className="form-select" value={item.unit} onChange={e => updateEditItem(i, 'unit', e.target.value)} style={{ fontSize: 12 }}>
                        <option>Nos</option><option>Kg</option><option>Grams</option><option>Litre</option><option>ML</option><option>Metre</option><option>CM</option><option>Set</option><option>Box</option><option>Carton</option><option>Pcs</option><option>Dozen</option>
                      </select>
                      <input className="form-input" placeholder="0.00" type="number" step="0.01" value={item.basePrice} onChange={e => updateEditItem(i, 'basePrice', e.target.value)} style={{ fontSize: 12 }} />
                      <input className="form-input" placeholder="18" type="number" value={item.gst} onChange={e => updateEditItem(i, 'gst', e.target.value)} style={{ fontSize: 12 }} />
                      <input className="form-input" placeholder="Last price" type="number" step="0.01" value={item.lastPrice} onChange={e => updateEditItem(i, 'lastPrice', e.target.value)} style={{ fontSize: 12 }} />
                      <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', whiteSpace: 'nowrap' }} onClick={() => removeEditItem(i)} disabled={editItems.length === 1}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms & Conditions */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-input" placeholder="Enter terms and conditions..." value={editForm.termsConditions} onChange={e => setEditForm({ ...editForm, termsConditions: e.target.value })} style={{ minHeight: 80, resize: 'vertical' }} />
              </div>

              {/* Attachments */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Attachments</label>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px dashed #e2e8f0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', transition: 'all 0.2s' }}>
                    <MdAttachFile size={16} />
                    <span>Add Files</span>
                    <input type="file" multiple onChange={handleEditAttachmentAdd} style={{ display: 'none' }} />
                  </label>
                </div>
                {editAttachments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {editAttachments.map((att, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                        <span>{att.name} {att.size ? `(${(att.size / 1024).toFixed(1)} KB)` : ''}</span>
                        <button className="btn btn-sm" style={{ background: 'transparent', color: '#ef4444', padding: '2px 6px' }} onClick={() => removeEditAttachment(i)}>
                          <MdClose size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* SKU Item Detail Modal */}
      {selectedItem && (
        <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} title="SKU Item Details" size="lg"
          footer={<button className="btn btn-primary" onClick={() => setSelectedItem(null)}>Close</button>}>
          
          <style>{`
            .sku-detail-container {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .sku-header-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .sku-code-box {
              padding: 24px;
              background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
              border-radius: 14px;
              border: 2.5px solid #fecaca;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 12px;
            }
            .sku-code-label {
              font-size: 10px;
              font-weight: 800;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1.2px;
            }
            .sku-code-value {
              font-size: 28px;
              font-weight: 900;
              color: #ef4444;
              font-family: 'Courier New', monospace;
              letter-spacing: 2px;
              word-break: break-all;
            }
            .sku-name-box {
              padding: 24px;
              background: linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%);
              border-radius: 14px;
              border: 2.5px solid #bbf7d0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 12px;
            }
            .sku-name-label {
              font-size: 10px;
              font-weight: 800;
              color: #166534;
              text-transform: uppercase;
              letter-spacing: 1.2px;
            }
            .sku-name-value {
              font-size: 18px;
              font-weight: 700;
              color: #15803d;
              text-align: center;
              line-height: 1.4;
            }
            .sku-pricing-section {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
            .sku-price-card {
              padding: 20px;
              background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
              border-radius: 12px;
              border: 2px solid #fecaca;
              display: flex;
              flex-direction: column;
              gap: 10px;
              text-align: center;
            }
            .sku-price-card.last-price {
              background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
              border-color: #7dd3fc;
            }
            .sku-price-card.last-price .sku-price-label {
              color: #0369a1;
            }
            .sku-price-card.last-price .sku-price-value {
              color: #0284c7;
            }
            .sku-price-label {
              font-size: 11px;
              font-weight: 800;
              color: #991b1b;
              text-transform: uppercase;
              letter-spacing: 0.8px;
            }
            .sku-price-value {
              font-size: 24px;
              font-weight: 900;
              color: #ef4444;
              font-family: 'Courier New', monospace;
            }
            .sku-specs-section {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 14px;
            }
            .sku-spec-card {
              padding: 16px;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 10px;
              border: 1.5px solid #e2e8f0;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .sku-spec-label {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            .sku-spec-value {
              font-size: 16px;
              font-weight: 700;
              color: #1e293b;
            }
            .sku-calculation-box {
              padding: 20px;
              background: linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%);
              border-radius: 12px;
              border: 2px solid #bbf7d0;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
            .sku-calc-item {
              display: flex;
              flex-direction: column;
              gap: 8px;
              text-align: center;
            }
            .sku-calc-label {
              font-size: 10px;
              font-weight: 800;
              color: #166534;
              text-transform: uppercase;
              letter-spacing: 0.6px;
            }
            .sku-calc-value {
              font-size: 20px;
              font-weight: 900;
              color: #15803d;
              font-family: 'Courier New', monospace;
            }
            .sku-attachments-section {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .sku-attachments-title {
              font-size: 12px;
              font-weight: 800;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .sku-attachments-title::before {
              content: '';
              width: 3px;
              height: 16px;
              background: #ef4444;
              border-radius: 2px;
            }
            .sku-attachments-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
              gap: 12px;
            }
            .sku-attachment-card {
              padding: 14px;
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border-radius: 10px;
              border: 1.5px solid #e2e8f0;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
              text-align: center;
              transition: all 0.3s;
              cursor: pointer;
            }
            .sku-attachment-card:hover {
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border-color: #fecaca;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
            }
            .sku-attachment-icon {
              font-size: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 48px;
              height: 48px;
              background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
              border-radius: 8px;
              border: 1px solid #fecaca;
            }
            .sku-attachment-name {
              font-size: 11px;
              font-weight: 600;
              color: #1e293b;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 100%;
            }
            .sku-attachment-type {
              font-size: 9px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              background: #f1f5f9;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .sku-no-attachments {
              padding: 20px;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
              background: #f8fafc;
              border-radius: 10px;
              border: 1.5px dashed #e2e8f0;
            }
            @media (max-width: 768px) {
              .sku-header-section { grid-template-columns: 1fr; }
              .sku-pricing-section { grid-template-columns: 1fr; }
              .sku-specs-section { grid-template-columns: 1fr; }
              .sku-calculation-box { grid-template-columns: 1fr; }
              .sku-attachments-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); }
            }
          `}</style>

          <div className="sku-detail-container">
            {/* SKU Code & Item Name */}
            <div className="sku-header-section">
              <div className="sku-code-box">
                <span className="sku-code-label">SKU Code</span>
                <div className="sku-code-value">{selectedItem.sku || 'N/A'}</div>
              </div>
              <div className="sku-name-box">
                <span className="sku-name-label">Item Name</span>
                <div className="sku-name-value">{selectedItem.name}</div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="sku-pricing-section">
              <div className="sku-price-card">
                <span className="sku-price-label">Base Price</span>
                <span className="sku-price-value">{selectedItem.basePrice ? `₹${parseFloat(selectedItem.basePrice).toFixed(2)}` : '—'}</span>
              </div>
              <div className="sku-price-card">
                <span className="sku-price-label">GST %</span>
                <span className="sku-price-value">{selectedItem.gst || 18}%</span>
              </div>
              <div className="sku-price-card last-price">
                <span className="sku-price-label">Last Price</span>
                <span className="sku-price-value">{selectedItem.lastPrice ? `₹${parseFloat(selectedItem.lastPrice).toFixed(2)}` : '—'}</span>
              </div>
            </div>

            {/* Specifications */}
            <div className="sku-specs-section">
              <div className="sku-spec-card">
                <span className="sku-spec-label">Quantity</span>
                <span className="sku-spec-value">{selectedItem.qty}</span>
              </div>
              <div className="sku-spec-card">
                <span className="sku-spec-label">Unit</span>
                <span className="sku-spec-value">{selectedItem.unit}</span>
              </div>
            </div>

            {/* Calculations */}
            {selectedItem.basePrice && (
              <div className="sku-calculation-box">
                <div className="sku-calc-item">
                  <span className="sku-calc-label">Total Base Value</span>
                  <span className="sku-calc-value">₹{(parseFloat(selectedItem.basePrice) * parseFloat(selectedItem.qty)).toFixed(2)}</span>
                </div>
                <div className="sku-calc-item">
                  <span className="sku-calc-label">GST Amount</span>
                  <span className="sku-calc-value">₹{((parseFloat(selectedItem.basePrice) * parseFloat(selectedItem.qty) * (selectedItem.gst || 18)) / 100).toFixed(2)}</span>
                </div>
                <div className="sku-calc-item">
                  <span className="sku-calc-label">Total with GST</span>
                  <span className="sku-calc-value">₹{(parseFloat(selectedItem.basePrice) * parseFloat(selectedItem.qty) * (1 + (selectedItem.gst || 18) / 100)).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Attachments Section */}
            <div className="sku-attachments-section">
              <div className="sku-attachments-title">Attachments</div>
              {viewRFQ?.attachments && viewRFQ.attachments.length > 0 ? (
                <div className="sku-attachments-grid">
                  {viewRFQ.attachments.map((att, idx) => {
                    const fileExt = att.split('.').pop()?.toUpperCase() || 'FILE';
                    const iconMap = {
                      'PDF': '📄',
                      'XLSX': '📊',
                      'XLS': '📊',
                      'DOCX': '📝',
                      'DOC': '📝',
                      'PNG': '🖼️',
                      'JPG': '🖼️',
                      'JPEG': '🖼️',
                      'ZIP': '📦',
                      'RAR': '📦',
                    };
                    return (
                      <div key={idx} className="sku-attachment-card" title={att}>
                        <div className="sku-attachment-icon">{iconMap[fileExt] || '📎'}</div>
                        <div className="sku-attachment-name">{att.split('/').pop()}</div>
                        <div className="sku-attachment-type">{fileExt}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="sku-no-attachments">No attachments available for this RFQ</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add Quote / Compare Quotes — triggered from row button */}
      <CompareQuotesModal
        open={!!addQuoteRFQ}
        onClose={() => setAddQuoteRFQ(null)}
        rfq={addQuoteRFQ}
        onRefresh={() => { setAddQuoteRFQ(null); fetchRFQs(); }}
      />
    </>
  );
}
