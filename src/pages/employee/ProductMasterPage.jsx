import { useState, useEffect, useCallback, Component } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import api from '../../api/axiosConfig';
import {
  MdSearch, MdVisibility, MdDelete, MdInventory2, MdCheckCircle,
  MdCategory, MdRefresh, MdWarning,
} from 'react-icons/md';

// ── Helpers ───────────────────────────────────────────────────────────────────
const API_BASE     = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');
const MEDIA_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const imgUrl  = p  => { if (!p) return ''; if (p.startsWith('http')) return p; return `${MEDIA_ORIGIN}${p.startsWith('/') ? p : `/${p}`}`; };
const fmtDate = v  => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleDateString('en-GB'); };
const fmtRs   = n  => { const x = Number(n); return x > 0 ? `₹${x.toLocaleString('en-IN')}` : '—'; };

// ── Style tokens ──────────────────────────────────────────────────────────────
const TH = {
  padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px',
  borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', background: '#f8fafc',
};
const TD = { padding: '9px 12px', fontSize: 12, color: '#1e293b', verticalAlign: 'middle' };

// ── Tile — read-only info card inside view modal ──────────────────────────────
function Tile({ label, value, accent }) {
  if (!value || value === '—' || value === '0%' || value === '₹0') return null;
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: accent || '#0f172a', lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

function SecHead({ title, icon }) {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 }}>
      {icon && <span style={{ fontSize: 16, color: '#1e40af' }}>{icon}</span>}
      <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', letterSpacing: '.4px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,#fee2e2,transparent)', borderRadius: 2 }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function ProductMasterPage() {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [brandFilter,  setBrandFilter]  = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy,       setSortBy]       = useState('latest');
  const [viewProd,     setViewProd]     = useState(null);
  const [delProd,      setDelProd]      = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim())       params.set('productName', search.trim());
      if (catFilter.trim())    params.set('category',    catFilter.trim());
      if (brandFilter.trim())  params.set('brand',       brandFilter.trim());
      if (statusFilter.trim()) params.set('status',      statusFilter.trim());

      const qs  = params.toString();
      const res = await api.get(`/employees/admin/products${qs ? `?${qs}` : ''}`);
      let list  = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      // Client-side sort (backend doesn't support sortBy on this endpoint)
      list = [...list].sort((a, b) => {
        if (sortBy === 'name')         return (a.productName || '').localeCompare(b.productName || '');
        if (sortBy === 'mrp')          return (b.mrp || 0) - (a.mrp || 0);
        if (sortBy === 'billingPrice') return (b.billingPrice || 0) - (a.billingPrice || 0);
        if (sortBy === 'stock')        return (b.availableStock || 0) - (a.availableStock || 0);
        return new Date(b.createdAt) - new Date(a.createdAt); // latest
      });

      setProducts(list);
    } catch (e) { toast(e.message || 'Failed to load products', 'error'); }
    finally { setLoading(false); }
  }, [search, catFilter, brandFilter, statusFilter, sortBy]);

  useEffect(() => { load(); }, [load]);

  // ── Admin delete ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!delProd) return;
    setDeleting(true);
    try {
      await api.delete(`/employees/admin/products/${delProd._id}`);
      toast('Product deleted', 'success');
      setDelProd(null);
      load();
    } catch (e) { toast(e.message || 'Failed to delete product', 'error'); }
    finally { setDeleting(false); }
  };

  // ── Derived filter lists ──────────────────────────────────────────────────
  const allCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const allBrands     = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total    = products.length;
  const active   = products.filter(p => p?.status === 'Active').length;
  const pending  = products.filter(p => p?.status === 'Pending').length;
  const outStock = products.filter(p => (p?.availableStock ?? 0) === 0).length;

  const kpis = [
    { label: 'Total Products', value: total,    icon: <MdInventory2 size={18}/>, color: '#2563eb', color2: '#3b82f6', glow: 'rgba(37,99,235,0.2)' },
    { label: 'Active',         value: active,   icon: <MdCheckCircle size={18}/>, color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.2)' },
    { label: 'Pending Review', value: pending,  icon: <MdWarning size={18}/>,    color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.2)' },
    { label: 'Out of Stock',   value: outStock, icon: <MdCategory size={18}/>,   color: '#dc2626', color2: '#ef4444', glow: 'rgba(220,38,38,0.2)' },
  ];

  const selStyle = {
    padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 12.5, fontFamily: 'inherit', color: '#334155',
    background: '#fff', outline: 'none', cursor: 'pointer',
  };

  // Status badge colour
  const statusBg = s => ({
    Active:       { bg: '#dcfce7', txt: '#16a34a' },
    Inactive:     { bg: '#fee2e2', txt: '#dc2626' },
    Pending:      { bg: '#fff7ed', txt: '#c2410c' },
    'Under Review':{ bg: '#eff6ff', txt: '#1d4ed8' },
    Approved:     { bg: '#dcfce7', txt: '#16a34a' },
    Rejected:     { bg: '#fee2e2', txt: '#dc2626' },
  }[s] || { bg: '#f1f5f9', txt: '#475569' });

  return (
    <div>
      <PageHeader title="Product Master" breadcrumb="Employee Management › Product Master" />
      <KpiStrip kpis={kpis} />

      <PageCard>
        {/* ── Single filter row ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <MdSearch size={15} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              className="form-input"
              placeholder="Search name, SKU, brand…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              style={{ paddingLeft: 30, fontSize: 12.5 }}
            />
          </div>

          {/* Category */}
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={selStyle}>
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c}>{c}</option>)}
          </select>

          {/* Brand */}
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={selStyle}>
            <option value="">All Brands</option>
            {allBrands.map(b => <option key={b}>{b}</option>)}
          </select>

          {/* Status — includes employee product statuses */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
            <option value="latest">Latest First</option>
            <option value="name">Name A–Z</option>
            <option value="mrp">MRP ↓</option>
            <option value="billingPrice">Billing Price ↓</option>
            <option value="stock">Stock ↓</option>
          </select>

          {/* Refresh */}
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}>
            <MdRefresh size={14} /> Refresh
          </button>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1020 }}>
              <thead>
                <tr>
                  {['Image','Product Name','Category','Brand','SKU','Unit','MRP','Billing Price','Stock','Status','Created','Updated','Action'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      No products found. Products added from the Employee App will appear here automatically.
                    </td>
                  </tr>
                ) : products.map(p => {
                  const sc = statusBg(p.status);
                  const thumbSrc = p.productImage ? imgUrl(p.productImage) : (p.productImageUrl || '');
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      {/* Image */}
                      <td style={TD}>
                        {thumbSrc ? (
                          <img src={thumbSrc} alt={p.productName}
                            style={{ width: 38, height: 38, borderRadius: 7, objectFit: 'cover', border: '1px solid #e2e8f0', display: 'block' }} />
                        ) : (
                          <div style={{ width: 38, height: 38, borderRadius: 7, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MdInventory2 size={17} color="#94a3b8" />
                          </div>
                        )}
                      </td>

                      {/* Product Name */}
                      <td style={{ ...TD, fontWeight: 700, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.productName}
                      </td>

                      {/* Category */}
                      <td style={{ ...TD, fontSize: 11.5 }}>{p.category || '—'}</td>

                      {/* Brand */}
                      <td style={{ ...TD, fontSize: 11.5 }}>{p.brand || '—'}</td>

                      {/* SKU */}
                      <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 600, color: '#3b82f6', fontSize: 11 }}>{p.sku || '—'}</td>

                      {/* Unit */}
                      <td style={{ ...TD, fontSize: 11.5 }}>{p.unit || '—'}</td>

                      {/* MRP */}
                      <td style={{ ...TD, fontWeight: 700, fontSize: 12 }}>{fmtRs(p.mrp)}</td>

                      {/* Billing Price */}
                      <td style={{ ...TD, fontWeight: 700, color: '#16a34a', fontSize: 12 }}>{fmtRs(p.billingPrice)}</td>

                      {/* Stock */}
                      <td style={TD}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: (p.availableStock ?? 0) === 0 ? '#dc2626' : '#16a34a' }}>
                          {p.availableStock ?? 0} {p.unit || ''}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={TD}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: sc.bg, color: sc.txt }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          {p.status || 'Pending'}
                        </span>
                      </td>

                      {/* Created */}
                      <td style={{ ...TD, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(p.createdAt)}</td>

                      {/* Updated */}
                      <td style={{ ...TD, fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(p.updatedAt)}</td>

                      {/* Action */}
                      <td style={TD}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <button onClick={() => setViewProd(p)} title="View Details"
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MdVisibility size={15} />
                          </button>
                          <button onClick={() => setDelProd(p)} title="Delete Product"
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fecaca', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MdDelete size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* ══════════ DELETE CONFIRM MODAL ══════════ */}
      <Modal
        open={!!delProd}
        onClose={() => !deleting && setDelProd(null)}
        title="Delete Product"
        size="md"
        footer={
          <>
            <button
              onClick={() => setDelProd(null)}
              disabled={deleting}
              style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: '#f8fafc', color: '#475569', cursor: deleting ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: deleting ? 0.6 : 1,
              }}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '8px 20px', borderRadius: 8, border: 'none',
                background: deleting ? '#fca5a5' : 'linear-gradient(135deg,#3b82f6,#1e40af)',
                color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              }}>
              {deleting ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </>
        }
      >
        {delProd && (
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Delete &ldquo;{delProd.productName}&rdquo;?
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              This action is permanent and cannot be undone. The product and its image will be removed.
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════ VIEW MODAL ══════════ */}
      <Modal open={!!viewProd} onClose={() => setViewProd(null)} title="Product Details" size="xl">
        {viewProd && (() => {
          const p = viewProd;
          const imgSrc = p.productImage ? imgUrl(p.productImage) : (p.productImageUrl || '');
          const sc = statusBg(p.status);
          return (
            <div>
              {/* Image(s) */}
              {imgSrc && (
                <div style={{ marginBottom: 16 }}>
                  <img src={imgSrc} alt={p.productName}
                    style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }} />
                </div>
              )}

              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{p.productName}</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: sc.bg, color: sc.txt }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                  {p.status || 'Pending'}
                </span>
              </div>

              {/* ── Basic Info ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 4 }}>
                <SecHead title="Basic Product Information" />
                <Tile label="Product Name"       value={p.productName} />
                <Tile label="Category"           value={p.category} />
                <Tile label="Brand / Company"    value={p.brand} />
                <Tile label="SKU / Product Code" value={p.sku} />
                <Tile label="Unit"               value={p.unit} />
                <Tile label="MRP"                value={fmtRs(p.mrp)} />
                <Tile label="Billing Price"      value={fmtRs(p.billingPrice)} />
                <Tile label="Available Stock"    value={`${p.availableStock ?? 0} ${p.unit || ''}`} />
                <Tile label="Selling Price"      value={fmtRs(p.sellingPrice)} />
                <Tile label="Purchase Price"     value={fmtRs(p.purchasePrice)} />
                <Tile label="Created Date"       value={fmtDate(p.createdAt)} />
                <Tile label="Updated Date"       value={fmtDate(p.updatedAt)} />
              </div>

              {(p.description || p.remark) && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '9px 12px', marginBottom: 8 }}>
                  <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Product Description</div>
                  <div style={{ fontSize: 13, color: '#1e293b', marginTop: 3 }}>{p.description || p.remark}</div>
                </div>
              )}

              {/* ── Specifications ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 4 }}>
                <SecHead title="Product Specifications" />
                <Tile label="Model Number"      value={p.modelNumber} />
                <Tile label="Color"             value={p.color} />
                <Tile label="Weight"            value={p.weight} />
                <Tile label="Dimensions"        value={p.dimensions} />
                <Tile label="Capacity"          value={p.capacity} />
                <Tile label="Power Consumption" value={p.powerConsumption} />
                <Tile label="Voltage"           value={p.voltage} />
                <Tile label="Warranty"          value={p.warranty} />
                <Tile label="Energy Rating"     value={p.energyRating} />
                <Tile label="Material / Body"   value={p.material} />
              </div>

              {/* ── Inventory ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                <SecHead title="Inventory Information" />
                <Tile label="GST %"             value={p.gst != null && p.gst > 0 ? `${p.gst}%` : undefined} />
                <Tile label="HSN Code"          value={p.hsnCode} />
                <Tile label="Barcode / QR"      value={p.barcode} />
                <Tile label="Min Stock"         value={p.minStock > 0 ? String(p.minStock) : undefined} />
                <Tile label="Max Stock"         value={p.maxStock > 0 ? String(p.maxStock) : undefined} />
                <Tile label="Reorder Level"     value={p.reorderLevel > 0 ? String(p.reorderLevel) : undefined} />
                <Tile label="Supplier / Vendor" value={p.supplier} />
                <Tile label="Manufacturer"      value={p.manufacturer} />
                <Tile label="Country of Origin" value={p.countryOfOrigin} />
                <Tile label="Batch Number"      value={p.batchNumber} />
                <Tile label="Serial Number"     value={p.serialNumber} />
                <Tile label="Manufacturing Date" value={fmtDate(p.manufacturingDate)} />
                <Tile label="Expiry Date"       value={fmtDate(p.expiryDate)} />
                <Tile label="Expected Delivery" value={fmtDate(p.expectedDeliveryDate)} />
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, i) { console.error('[ProductMasterPage]', e, i); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'inherit' }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>{this.state.error?.message}</div>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '9px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const WrappedProductMasterPage = props => (
  <ErrorBoundary><ProductMasterPage {...props} /></ErrorBoundary>
);

export { ProductMasterPage };
export default WrappedProductMasterPage;
