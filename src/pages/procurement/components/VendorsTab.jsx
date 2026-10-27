import { useState, useEffect, useCallback } from 'react';
import StatusBadge from '../../../components/common/StatusBadge';
import Modal from '../../../components/common/Modal';
import Pagination from '../../../components/common/Pagination';
import { vendorApi } from '../../../api/vendorApi';
import { rfqApi } from '../../../api/rfqApi';
import { poApi } from '../../../api/poApi';
import VendorPriceMapping from './VendorPriceMapping';
import { MdVisibility, MdEdit, MdAdd, MdSearch, MdFilterList, MdBusiness, MdPhone, MdEmail, MdLocationOn, MdStar, MdDelete, MdPrint, MdAssignment, MdShoppingCart } from 'react-icons/md';
import { dataEvents } from '../../../utils/dataEvents';

const EMPTY_FORM = {
  companyName: '', category: '', contactPerson: '', phone: '',
  email: '', city: '', state: '', address: '', pincode: '',
  gstNumber: '', paymentTerms: 'Net 30', status: 'Active', remarks: '',
};

const inp = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 9, fontSize: 13, outline: 'none', background: '#fff',
  color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color .15s',
};

const lbl = { fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 5, display: 'block' };

export default function VendorsTab({
  categories = [], categoriesRaw = [],
  showVendorModal, setShowVendorModal,
  showCategoryModal, setShowCategoryModal,
  newCategory, setNewCategory,
  onAddCategory, onDeleteCategory,
  onStatsChange,
}) {
  const [vendors, setVendors]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [viewVendor, setViewVendor] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [showPriceMapping, setShowPriceMapping] = useState(false);
  const [vendorRFQs, setVendorRFQs] = useState([]);
  const [vendorPOs, setVendorPOs]   = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchVendors = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCategory) params.category = filterCategory;
      const res = await vendorApi.getAll(params);
      setVendors(res.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, filterStatus, filterCategory]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);
  useEffect(() => { const t = setTimeout(fetchVendors, 400); return () => clearTimeout(t); }, [search]);

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setShowVendorModal(true); };
  const openEdit = (v) => {
    setForm({
      companyName: v.companyName || '', category: v.category || '',
      contactPerson: v.contactPerson || '', phone: v.phone || '',
      email: v.email || '', city: v.city || '', state: v.state || '',
      address: v.address || '', pincode: v.pincode || '',
      gstNumber: v.gstNumber || '', paymentTerms: v.paymentTerms || 'Net 30',
      status: v.status || 'Active', remarks: v.remarks || '',
    });
    setEditId(v._id);
    setViewVendor(null);
    setShowVendorModal(true);
  };

  // Load linked RFQs and POs when viewing a vendor
  const openView = async (v) => {
    setViewVendor(v);
    setVendorRFQs([]);
    setVendorPOs([]);
    try {
      const [rfqRes, poRes] = await Promise.all([
        rfqApi.getAll(),
        poApi.getAll({ vendor: v._id }),
      ]);
      const rfqs = (rfqRes.data || []).filter(r =>
        r.vendors?.some(vv => (vv._id || vv) === v._id)
      );
      setVendorRFQs(rfqs);
      setVendorPOs(poRes.data || []);
    } catch (_) {}
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    setFormErrors({});
    setSuccessMsg('');
    try {
      // Clean data before sending
      const cleanData = {
        ...form,
        phone: form.phone.replace(/\D/g, ''),
        pincode: form.pincode.replace(/\D/g, ''),
        gstNumber: form.gstNumber.toUpperCase().trim(),
      };
      editId ? await vendorApi.update(editId, cleanData) : await vendorApi.create(cleanData);
      setShowVendorModal(false);
      setForm(EMPTY_FORM);
      setSuccessMsg(editId ? '✓ Vendor updated successfully!' : '✓ Vendor created successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      dataEvents.emit('vendor:changed');
      fetchVendors();
      onStatsChange?.();
    } catch (e) {
      setFormErrors({ _general: e.message || 'Failed to save vendor' });
    }
    finally { setSaving(false); }
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validateForm = () => {
    const errors = {};
    if (!form.companyName.trim()) errors.companyName = 'Company name is required';
    if (!form.category) errors.category = 'Category is required';
    if (!form.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!form.phone) errors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) errors.phone = 'Phone must be 10 digits';
    if (!form.email) errors.email = 'Email is required';
    else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(form.email)) errors.email = 'Invalid email format';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.state.trim()) errors.state = 'State is required';
    if (!form.pincode) errors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(form.pincode.replace(/\D/g, ''))) errors.pincode = 'Pincode must be 6 digits';
    if (!form.address.trim()) errors.address = 'Address is required';
    if (form.gstNumber) {
      const gstClean = form.gstNumber.toUpperCase().replace(/\s/g, '');
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstClean))
        errors.gstNumber = 'Invalid GST format (e.g. 27AABCC1234D1Z5)';
    }
    return errors;
  };

  const statusColor = (s) => s === 'Active' ? '#22c55e' : s === 'Inactive' ? '#94a3b8' : '#ef4444';

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
    try {
      await vendorApi.delete(id);
      setSuccessMsg('✓ Vendor deleted successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      dataEvents.emit('vendor:changed');
      fetchVendors();
      onStatsChange?.();
    } catch (e) {
      alert(`❌ Error: ${e.message}`);
    }
  };

  // Calculate paginated vendors
  const startIndex = (page - 1) * pageSize;
  const paginatedVendors = vendors.slice(startIndex, startIndex + pageSize);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCategory]);

  const handlePrint = (vendor) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vendor Details - ${vendor.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 15px; }
          .header h1 { margin: 0; color: #1e40af; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; font-weight: bold; color: #fff; background: #1e40af; padding: 8px 12px; margin-bottom: 12px; border-radius: 4px; }
          .row { display: flex; margin-bottom: 10px; }
          .col { flex: 1; }
          .label { font-weight: bold; color: #475569; font-size: 12px; }
          .value { color: #1e293b; margin-top: 3px; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .status-active { background: #ecfdf5; color: #047857; }
          .status-inactive { background: #f3f4f6; color: #6b7280; }
          .status-blacklisted { background: #fef2f2; color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${vendor.companyName}</h1>
          <p>Vendor ID: <strong>${vendor.vendorId}</strong></p>
          <p><span class="status-badge status-${vendor.status.toLowerCase()}">${vendor.status}</span></p>
        </div>

        <div class="section">
          <div class="section-title">Contact Information</div>
          <div class="row">
            <div class="col">
              <div class="label">Contact Person</div>
              <div class="value">${vendor.contactPerson}</div>
            </div>
            <div class="col">
              <div class="label">Designation</div>
              <div class="value">${vendor.designation || 'N/A'}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Phone</div>
              <div class="value">${vendor.phone}</div>
            </div>
            <div class="col">
              <div class="label">Alternate Phone</div>
              <div class="value">${vendor.alternatePhone || 'N/A'}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Email</div>
              <div class="value">${vendor.email}</div>
            </div>
            <div class="col">
              <div class="label">Alternate Email</div>
              <div class="value">${vendor.alternateEmail || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Address Information</div>
          <div class="row">
            <div class="col">
              <div class="label">Address</div>
              <div class="value">${vendor.address}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">City</div>
              <div class="value">${vendor.city}</div>
            </div>
            <div class="col">
              <div class="label">State</div>
              <div class="value">${vendor.state}</div>
            </div>
            <div class="col">
              <div class="label">Pincode</div>
              <div class="value">${vendor.pincode}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Financial & Business Terms</div>
          <div class="row">
            <div class="col">
              <div class="label">GST Number</div>
              <div class="value">${vendor.gstNumber}</div>
            </div>
            <div class="col">
              <div class="label">PAN Number</div>
              <div class="value">${vendor.panNumber || 'N/A'}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Payment Terms</div>
              <div class="value">${vendor.paymentTerms}</div>
            </div>
            <div class="col">
              <div class="label">Lead Time (Days)</div>
              <div class="value">${vendor.leadTimeDays}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Category</div>
              <div class="value">${vendor.category}</div>
            </div>
            <div class="col">
              <div class="label">Rating</div>
              <div class="value">${vendor.rating}/5.0</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a system-generated document</p>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <>
      <style>{`
        /* ── Toolbar ── */
        .vt-toolbar {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .vt-search-wrap {
          position: relative; flex: 1; min-width: 160px;
        }
        .vt-search {
          width: 100%; padding: 9px 12px 9px 34px;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          background: #f8fafc; font-size: 13px; color: #1e293b;
          outline: none; font-family: inherit; transition: all .2s;
          box-sizing: border-box;
        }
        .vt-search:focus { border-color: #ef4444; background: #fff; box-shadow: 0 0 0 3px rgba(239,68,68,0.08); }
        .vt-search::placeholder { color: #94a3b8; }
        .vt-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex; }
        .vt-select {
          padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          background: #f8fafc; font-size: 13px; color: #1e293b;
          outline: none; font-family: inherit; cursor: pointer; min-width: 130px;
        }
        .vt-add-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 10px;
          background: linear-gradient(135deg,#3b82f6,#1e40af);
          color: #fff; border: none; cursor: pointer;
          font-size: 13px; font-weight: 600; font-family: inherit;
          box-shadow: 0 3px 10px rgba(185,28,28,0.3);
          white-space: nowrap; flex-shrink: 0;
          transition: all .15s;
        }
        .vt-add-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(185,28,28,0.4); }

        /* ── Desktop table ── */
        .vt-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #f1f5f9; }
        .vt-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .vt-table thead tr { background: #f8fafc; }
        .vt-table th {
          padding: 10px 14px; text-align: left; font-size: 10.5px;
          font-weight: 700; color: #94a3b8; text-transform: uppercase;
          letter-spacing: .7px; border-bottom: 1px solid #f1f5f9; white-space: nowrap;
        }
        .vt-table td { padding: 11px 14px; font-size: 12.5px; color: #1e293b; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
        .vt-table tbody tr { transition: background .1s; cursor: default; }
        .vt-table tbody tr:hover { background: #fef2f2; }
        .vt-table tbody tr:last-child td { border-bottom: none; }

        /* ── Mobile cards (hidden on desktop) ── */
        .vt-cards { display: none; flex-direction: column; gap: 10px; }

        /* ── Responsive breakpoint ── */
        @media (max-width: 640px) {
          .vt-table-wrap { display: none; }
          .vt-cards { display: flex; }
          .vt-toolbar { gap: 8px; }
          .vt-select { min-width: 0; flex: 1; }
          .vt-add-btn span.vt-add-label { display: none; }
          .vt-add-btn { padding: 9px 12px; }
        }

        /* ── Vendor card (mobile) ── */
        .vt-card {
          background: #fff; border-radius: 14px;
          border: 1px solid #e8edf2;
          box-shadow: 0 2px 8px rgba(15,23,42,0.05);
          padding: 14px 16px;
        }
        .vt-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
        .vt-card-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .vt-card-id { font-size: 11px; color: #94a3b8; margin-top: 2px; font-family: monospace; }
        .vt-card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin-bottom: 12px; }
        .vt-card-meta-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #475569; }
        .vt-card-actions { display: flex; gap: 8px; }
        .vt-card-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
          padding: 8px 0; border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: all .15s;
        }
        .vt-card-btn-edit { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        .vt-card-btn-view { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        .vt-card-btn-edit:hover { background: #ef4444; color: #fff; }
        .vt-card-btn-view:hover { background: #475569; color: #fff; }

        /* ── Form grid ── */
        .vt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 540px) { .vt-form-grid { grid-template-columns: 1fr; } }
        .vt-span2 { grid-column: span 2; }
        @media (max-width: 540px) { .vt-span2 { grid-column: span 1; } }

        /* ── View detail grid ── */
        .vt-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
        @media (max-width: 480px) { .vt-detail-grid { grid-template-columns: 1fr; } }
        .vt-detail-span2 { grid-column: span 2; }
        @media (max-width: 480px) { .vt-detail-span2 { grid-column: span 1; } }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="vt-toolbar">
        <div className="vt-search-wrap">
          <span className="vt-search-icon"><MdSearch size={15} /></span>
          <input className="vt-search" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="vt-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Blacklisted</option>
        </select>
        <select className="vt-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Error / Loading ── */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
          ❌ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#047857', fontSize: 13, marginBottom: 12 }}>
          ✓ {successMsg}
        </div>
      )}
      {loading && (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading vendors…</div>
      )}

      {/* ── Desktop Table View ── */}
      {!loading && vendors.length > 0 && (
        <div className="vt-table-wrap" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
          <table className="vt-table">
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Company Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>City</th>
                <th>State</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVendors.map(v => (
                <tr key={v._id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#64748b' }}>{v.vendorId}</td>
                  <td style={{ fontWeight: 500 }}>{v.companyName}</td>
                  <td>{v.contactPerson}</td>
                  <td>{v.phone}</td>
                  <td>{v.city}</td>
                  <td>{v.state}</td>
                  <td><span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: v.status === 'Active' ? '#ecfdf5' : v.status === 'Inactive' ? '#f3f4f6' : '#fef2f2', color: v.status === 'Active' ? '#047857' : v.status === 'Inactive' ? '#6b7280' : '#dc2626' }}>{v.status}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openView(v)} style={{ padding: '4px 10px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>View</button>
                    <button onClick={() => openEdit(v)} style={{ padding: '4px 10px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>Edit</button>
                    <button onClick={() => handleDelete(v._id, v.companyName)} style={{ padding: '4px 10px', borderRadius: 6, background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && vendors.length > 0 && (
        <Pagination
          total={vendors.length}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      )}

      {/* ── Mobile Card View ── */}
      {!loading && vendors.length > 0 && (
        <div className="vt-cards">
          {paginatedVendors.map(v => (
            <div key={v._id} className="vt-card">
              <div className="vt-card-top">
                <div>
                  <div className="vt-card-name">{v.companyName}</div>
                  <div className="vt-card-id">{v.vendorId}</div>
                </div>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: v.status === 'Active' ? '#ecfdf5' : v.status === 'Inactive' ? '#f3f4f6' : '#fef2f2', color: v.status === 'Active' ? '#047857' : v.status === 'Inactive' ? '#6b7280' : '#dc2626' }}>{v.status}</span>
              </div>
              <div className="vt-card-meta">
                <div className="vt-card-meta-item"><MdPhone size={14} /> {v.phone}</div>
                <div className="vt-card-meta-item"><MdLocationOn size={14} /> {v.city}</div>
                <div className="vt-card-meta-item"><MdBusiness size={14} /> {v.category}</div>
                <div className="vt-card-meta-item"><MdEmail size={14} /> {v.email}</div>
              </div>
              <div className="vt-card-actions">
                <button onClick={() => openView(v)} className="vt-card-btn vt-card-btn-view"><MdVisibility size={14} /> View</button>
                <button onClick={() => openEdit(v)} className="vt-card-btn vt-card-btn-edit"><MdEdit size={14} /> Edit</button>
                <button onClick={() => handleDelete(v._id, v.companyName)} className="vt-card-btn" style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}><MdDelete size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && vendors.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #e2e8f0' }}>
          <MdBusiness size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 4 }}>No vendors found</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Add your first vendor to get started</div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      <Modal open={showVendorModal} onClose={() => setShowVendorModal(false)} title={editId ? 'Edit Vendor' : 'Add New Vendor'}
        footer={
          <>
            <button onClick={() => setShowVendorModal(false)} style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #1e40af', color: '#1e40af', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 18px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save Vendor'}</button>
          </>
        }>
        <div className="vt-form-grid">
          {formErrors._general && (
            <div style={{ gridColumn: 'span 2', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
              ❌ {formErrors._general}
            </div>
          )}
          <div><label style={lbl}>Vendor Name *</label><input style={{...inp, borderColor: formErrors.companyName ? '#ef4444' : '#e2e8f0'}} placeholder="Company name" value={form.companyName} onChange={f('companyName')} />{formErrors.companyName && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.companyName}</div>}</div>
          <div><label style={lbl}>Category *</label>
            <select style={{...inp, borderColor: formErrors.category ? '#ef4444' : '#e2e8f0'}} value={form.category} onChange={f('category')}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            {formErrors.category && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.category}</div>}
          </div>
          <div><label style={lbl}>Contact Person *</label><input style={{...inp, borderColor: formErrors.contactPerson ? '#ef4444' : '#e2e8f0'}} placeholder="Name" value={form.contactPerson} onChange={f('contactPerson')} />{formErrors.contactPerson && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.contactPerson}</div>}</div>
          <div><label style={lbl}>Phone *</label><input style={{...inp, borderColor: formErrors.phone ? '#ef4444' : '#e2e8f0'}} placeholder="10-digit number" value={form.phone} maxLength={10} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setForm(p => ({...p, phone: v})); }} />{formErrors.phone && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.phone}</div>}</div>
          <div><label style={lbl}>Email *</label><input style={{...inp, borderColor: formErrors.email ? '#ef4444' : '#e2e8f0'}} type="email" placeholder="email@company.com" value={form.email} onChange={f('email')} />{formErrors.email && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.email}</div>}</div>
          <div><label style={lbl}>City *</label><input style={{...inp, borderColor: formErrors.city ? '#ef4444' : '#e2e8f0'}} placeholder="City" value={form.city} onChange={f('city')} />{formErrors.city && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.city}</div>}</div>
          <div><label style={lbl}>State *</label><input style={{...inp, borderColor: formErrors.state ? '#ef4444' : '#e2e8f0'}} placeholder="State" value={form.state} onChange={f('state')} />{formErrors.state && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.state}</div>}</div>
          <div><label style={lbl}>Pincode *</label><input style={{...inp, borderColor: formErrors.pincode ? '#ef4444' : '#e2e8f0'}} placeholder="6-digit pincode" value={form.pincode} onChange={f('pincode')} />{formErrors.pincode && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.pincode}</div>}</div>
          <div className="vt-span2"><label style={lbl}>Address *</label><input style={{...inp, borderColor: formErrors.address ? '#ef4444' : '#e2e8f0'}} placeholder="Full address" value={form.address} onChange={f('address')} />{formErrors.address && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.address}</div>}</div>
          <div><label style={lbl}>GST Number</label><input style={{...inp, borderColor: formErrors.gstNumber ? '#ef4444' : '#e2e8f0'}} placeholder="GSTIN (optional)" value={form.gstNumber} onChange={f('gstNumber')} />{formErrors.gstNumber && <div style={{fontSize: 11, color: '#ef4444', marginTop: 3}}>⚠ {formErrors.gstNumber}</div>}</div>
          <div><label style={lbl}>Payment Terms</label>
            <select style={inp} value={form.paymentTerms} onChange={f('paymentTerms')}>
              {['Net 30','Net 45','Net 60','Net 90','Advance Payment','COD'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Status</label>
            <select style={inp} value={form.status} onChange={f('status')}>
              <option>Active</option><option>Inactive</option><option>Blacklisted</option>
            </select>
          </div>
          <div className="vt-span2"><label style={lbl}>Remarks</label><input style={inp} placeholder="Optional notes" value={form.remarks} onChange={f('remarks')} /></div>
        </div>
      </Modal>

      {/* ── View Vendor Modal ── */}
      {viewVendor && (
        <Modal open={!!viewVendor} onClose={() => setViewVendor(null)} title={viewVendor.companyName} size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748B' }}>Vendor ID: <span style={{ fontWeight: 600, color: '#1E293B' }}>{viewVendor.vendorId}</span></div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={() => setShowPriceMapping(!showPriceMapping)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#16a34a', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }} onMouseEnter={(e) => { e.target.style.background = '#dcfce7'; e.target.style.borderColor = '#86efac'; }} onMouseLeave={(e) => { e.target.style.background = '#f0fdf4'; e.target.style.borderColor = '#bbf7d0'; }}>💰 {showPriceMapping ? 'Hide' : 'Show'} Prices</button>
                <button onClick={() => handlePrint(viewVendor)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1.5px solid #bfdbfe', color: '#1e40af', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }} onMouseEnter={(e) => { e.target.style.background = '#e0f2fe'; e.target.style.borderColor = '#7dd3fc'; }} onMouseLeave={(e) => { e.target.style.background = '#f0f9ff'; e.target.style.borderColor = '#bfdbfe'; }}><MdPrint size={16} /> Print</button>
                <button onClick={() => openEdit(viewVendor)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#ef4444', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }} onMouseEnter={(e) => { e.target.style.background = '#fee2e2'; e.target.style.borderColor = '#fca5a5'; }} onMouseLeave={(e) => { e.target.style.background = '#fef2f2'; e.target.style.borderColor = '#fecaca'; }}><MdEdit size={16} /> Edit</button>
                <button onClick={() => setViewVendor(null)} style={{ background: 'transparent', border: '1.5px solid #cbd5e1', color: '#475569', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }} onMouseEnter={(e) => { e.target.style.background = '#f1f5f9'; }} onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}>Close</button>
              </div>
            </div>
          }>

          <style>{`
            .vendor-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 20px; }
            .section-full-width { grid-column: span 3; }
            .section-half-width { grid-column: span 2; }
            .field-group { display: flex; flex-direction: column; gap: 3px; }
            .field-label { font-size: 11px; font-weight: 500; color: #64748B; text-transform: uppercase; letter-spacing: 0.3px; }
            .field-value { font-size: 14px; font-weight: 400; color: #1E293B; }
            .field-value.copyable { cursor: pointer; font-family: monospace; background: #F8FAFC; padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }
            .field-value.copyable:hover { background: #E2E8F0; }
            .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 40px; font-size: 12px; font-weight: 500; }
            .status-badge.active { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
            .status-badge.active::before { content: ""; width: 6px; height: 6px; background: #12B76A; border-radius: 50%; box-shadow: 0 0 0 2px rgba(18,183,106,0.2); }
            .status-badge.inactive { background: #F3F4F6; color: #6B7280; border: 1px solid #D1D5DB; }
            .status-badge.inactive::before { content: ""; width: 6px; height: 6px; background: #9CA3AF; border-radius: 50%; }
            .status-badge.blacklisted { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
            .status-badge.blacklisted::before { content: ""; width: 6px; height: 6px; background: #EF4444; border-radius: 50%; }
            .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E4E7EC; }
            .section-header h3 { font-size: 13px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.3px; margin: 0; }
            .section-icon { width: 16px; height: 16px; color: #1e40af; }
            .rating-container { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .rating-value { font-size: 16px; font-weight: 700; color: #0F172A; }
            .rating-max { font-size: 12px; color: #64748B; }
            .rating-bar { width: 80px; height: 5px; background: #E2E8F0; border-radius: 3px; overflow: hidden; }
            .rating-bar-fill { height: 100%; background: linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%); transition: width 0.3s; }
            .rating-stars { color: #F59E0B; font-size: 14px; letter-spacing: 1px; }
            .category-badge { display: inline-flex; padding: 4px 10px; background: #EFF6FF; color: #1E40AF; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #DBEAFE; }
            @media (max-width: 768px) {
              .vendor-details { grid-template-columns: 1fr; }
              .section-full-width, .section-half-width { grid-column: span 1; }
            }
          `}</style>

          {/* Top Info Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <div className="category-badge">{viewVendor.category}</div>
            <div className={`status-badge ${viewVendor.status.toLowerCase()}`}>{viewVendor.status}</div>
          </div>

          {/* Contact Information Section */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3>Contact Information</h3>
            </div>
            <div className="vendor-details">
              <div className="field-group">
                <div className="field-label">Contact Person</div>
                <div className="field-value">{viewVendor.contactPerson}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Phone Number</div>
                <div className="field-value">{viewVendor.phone}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Email Address</div>
                <div className="field-value" style={{ color: '#2563EB' }}>{viewVendor.email}</div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-header">
              <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3>Address Details</h3>
            </div>
            <div className="vendor-details">
              <div className="field-group">
                <div className="field-label">City</div>
                <div className="field-value">{viewVendor.city}</div>
              </div>
              <div className="field-group">
                <div className="field-label">State</div>
                <div className="field-value">{viewVendor.state}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Pincode</div>
                <div className="field-value">{viewVendor.pincode}</div>
              </div>
              <div className="field-group section-full-width">
                <div className="field-label">Full Address</div>
                <div className="field-value">{viewVendor.address}</div>
              </div>
            </div>
          </div>

          {/* Financial & Business Terms */}
          <div style={{ marginBottom: viewVendor.remarks ? 20 : 0 }}>
            <div className="section-header">
              <svg className="section-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3>Financial & Business Terms</h3>
            </div>
            <div className="vendor-details">
              <div className="field-group">
                <div className="field-label">GST Number</div>
                <div className="field-value copyable" title="Click to copy" onClick={() => navigator.clipboard.writeText(viewVendor.gstNumber)}>{viewVendor.gstNumber}</div>
              </div>
              <div className="field-group">
                <div className="field-label">Payment Terms</div>
                <div className="field-value">{viewVendor.paymentTerms}</div>
              </div>
            </div>
          </div>

          {/* Remarks Section */}
          {viewVendor.remarks && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: 6,
              padding: '12px 16px',
              marginTop: 20
            }}>
              <div className="field-label" style={{ color: '#92400E', marginBottom: 4 }}>Additional Remarks</div>
              <div className="field-value" style={{ color: '#78350F', fontSize: 13 }}>{viewVendor.remarks}</div>
            </div>
          )}

          {/* Price Mapping Section */}
          {showPriceMapping && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
              <VendorPriceMapping 
                vendorId={viewVendor._id} 
                vendorName={viewVendor.companyName}
                onClose={() => setShowPriceMapping(false)}
              />
            </div>
          )}
        </Modal>
      )}

      {/* ── Manage Categories Modal ── */}
      <Modal
        open={!!showCategoryModal}
        onClose={() => setShowCategoryModal?.(false)}
        title="Manage Vendor Categories"
        footer={
          <button onClick={() => setShowCategoryModal?.(false)} style={{
            padding: '8px 18px', borderRadius: 9,
            background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
          }}>Done</button>
        }
      >
        {/* Add new category */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            style={{
              flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0',
              borderRadius: 9, fontSize: 13, outline: 'none',
              background: '#fff', color: '#1e293b', fontFamily: 'inherit',
            }}
            placeholder="New category name..."
            value={newCategory || ''}
            onChange={e => setNewCategory?.(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onAddCategory?.(newCategory); }}
          />
          <button
            onClick={() => onAddCategory?.(newCategory)}
            style={{
              padding: '9px 16px', borderRadius: 9,
              background: 'linear-gradient(135deg,#3b82f6,#1e40af)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
            }}
          >+</button>
        </div>

        {/* Category list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categoriesRaw.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>
              No categories yet. Add one above.
            </div>
          ) : categoriesRaw.map((cat, i) => (
            <div key={cat._id || i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', background: '#f8fafc',
              borderRadius: 9, border: '1px solid #e2e8f0',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
                {cat.name || cat}
              </span>
              <button
                onClick={() => onDeleteCategory?.(cat)}
                style={{
                  padding: '3px 10px', borderRadius: 7,
                  background: '#fef2f2', color: '#ef4444',
                  border: '1px solid #fecaca', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                }}
              >✕ Remove</button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
