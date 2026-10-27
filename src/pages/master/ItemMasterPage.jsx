import { useState, useEffect, useCallback } from 'react';
import { itemMasterApi } from '../../api/itemMasterApi';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import { toast } from '../../components/common/Toast';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdDownload } from 'react-icons/md';
import * as XLSX from 'xlsx';
import Pagination from '../../components/common/Pagination';

const COLORS = {
  primary: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  danger: '#dc2626',
  text: '#0f172a',
  textMid: '#475569',
  textLight: '#94a3b8',
  border: '#e8edf2',
  bg: '#f8fafc'
};

export default function ItemMasterPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage]       = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unit: 'units',
    unitPrice: '',
    costPrice: '',
    sellingPrice: '',
    minQuantity: '',
    maxQuantity: '',
    reorderPoint: '',
    hsn: '',
    gst: '',
    barcode: '',
    tallySalesLedger: ''
  });

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await itemMasterApi.getAll({ status: statusFilter === 'All' ? '' : statusFilter });
      setItems(res.data || []);
    } catch (e) {
      toast(e.message || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Filter items
  const filteredItems = items.filter(item =>
    (search === '' ||
     item.sku.toLowerCase().includes(search.toLowerCase()) ||
     item.name.toLowerCase().includes(search.toLowerCase()) ||
     item.itemId.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => { setPage(1); }, [search, statusFilter]);
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!form.sku || !form.name || !form.unit) {
      toast('SKU, Name, and Unit are required', 'error');
      return;
    }

    try {
      if (editingItem) {
        await itemMasterApi.update(editingItem._id, form);
        toast('Item updated successfully');
      } else {
        await itemMasterApi.create(form);
        toast('Item created successfully');
      }
      setShowModal(false);
      setForm({
        sku: '', name: '', description: '', category: '', unit: 'units',
        unitPrice: '', costPrice: '', sellingPrice: '', minQuantity: '',
        maxQuantity: '', reorderPoint: '', hsn: '', gst: '', barcode: '',
        tallySalesLedger: ''
      });
      setEditingItem(null);
      loadItems();
    } catch (e) {
      toast(e.message || 'Failed to save item', 'error');
    }
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      sku: item.sku,
      name: item.name,
      description: item.description || '',
      category: item.category?._id || '',
      unit: item.unit,
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity,
      reorderPoint: item.reorderPoint,
      hsn: item.hsn || '',
      gst: item.gst || '',
      barcode: item.barcode || '',
      tallySalesLedger: item.tallySalesLedger || ''
    });
    setShowModal(true);
  };

  // Handle delete
  const handleDelete = async (id, sku) => {
    if (!window.confirm(`Delete ${sku}?`)) return;
    try {
      await itemMasterApi.delete(id);
      toast(`${sku} deleted successfully`);
      loadItems();
    } catch (e) {
      toast(e.message || 'Failed to delete item', 'error');
    }
  };

  // Handle export
  const handleExport = () => {
    if (filteredItems.length === 0) {
      toast('No items to export', 'warning');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredItems.map(item => ({
      'Item ID': item.itemId,
      'SKU': item.sku,
      'Name': item.name,
      'Unit': item.unit,
      'Unit Price': item.unitPrice,
      'Cost Price': item.costPrice,
      'Selling Price': item.sellingPrice,
      'Min Qty': item.minQuantity,
      'Max Qty': item.maxQuantity,
      'Reorder Point': item.reorderPoint,
      'Status': item.status,
      'GST %': item.gst
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'item-master.xlsx');
    toast('Items exported successfully');
  };

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .card { background: #fff; border: 1px solid ${COLORS.border}; border-radius: 16px; box-shadow: 0 2px 12px rgba(15,23,42,0.06); }
        .btn-primary { padding: '8px 16px'; border-radius: 10px; border: none; background: ${COLORS.primary}; color: #fff; fontSize: 13px; fontWeight: 600; cursor: pointer; fontFamily: inherit; display: flex; alignItems: center; gap: 6px; }
        .btn-primary:hover { background: #dc2626; }
        .input { width: 100%; padding: '8px 12px'; border: '1px solid ${COLORS.border}'; border-radius: 8px; fontSize: 13px; outline: none; fontFamily: inherit; }
        .input:focus { border-color: ${COLORS.primary}; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, margin: 0 }}>Item Master</h1>
          <p style={{ fontSize: 13, color: COLORS.textLight, margin: '4px 0 0 0' }}>Manage product catalog</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} style={{ ...{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 } }}>
            <MdDownload size={16} /> Export
          </button>
          <button onClick={() => { setEditingItem(null); setForm({ sku: '', name: '', description: '', category: '', unit: 'units', unitPrice: '', costPrice: '', sellingPrice: '', minQuantity: '', maxQuantity: '', reorderPoint: '', hsn: '', gst: '', barcode: '', tallySalesLedger: '' }); setShowModal(true); }} style={{ ...{ padding: '8px 16px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 } }}>
            <MdAdd size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <MdSearch size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: COLORS.textLight }} />
          <input
            placeholder="Search by SKU, Name, or Item ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Active', 'Inactive', 'Discontinued'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: statusFilter === status ? 'none' : `1px solid ${COLORS.border}`,
                background: statusFilter === status ? COLORS.primary : '#fff',
                color: statusFilter === status ? '#fff' : COLORS.textMid,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: COLORS.textLight }}>Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: COLORS.textLight }}>No items found</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: COLORS.bg }}>
                  {['Item ID', 'SKU', 'Name', 'Unit', 'Unit Price', 'Min Qty', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${COLORS.border}`, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item, i) => (
                  <tr key={item._id} style={{ background: i % 2 === 0 ? COLORS.bg : '#fff', borderBottom: `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontWeight: 700, color: COLORS.primary }}>{item.itemId}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 12, color: COLORS.textMid }}>{item.sku}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 600, color: COLORS.text }}>{item.name}</td>
                    <td style={{ padding: '11px 16px', color: COLORS.textMid }}>{item.unit}</td>
                    <td style={{ padding: '11px 16px', fontWeight: 600, color: COLORS.info }}>₹{item.unitPrice}</td>
                    <td style={{ padding: '11px 16px', color: COLORS.textMid }}>{item.minQuantity}</td>
                    <td style={{ padding: '11px 16px' }}><StatusBadge status={item.status} /></td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleEdit(item)} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${COLORS.info}`, color: COLORS.info, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MdEdit size={14} /> Edit
                        </button>
                        <button onClick={() => handleDelete(item._id, item.sku)} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: `1px solid ${COLORS.danger}`, color: COLORS.danger, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MdDelete size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredItems.length > 0 && (
          <Pagination
            total={filteredItems.length}
            page={page}
            pageSize={pageSize}
            onPage={p => setPage(p)}
            onPageSize={s => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingItem ? 'Edit Item' : 'Add New Item'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>SKU *</label>
            <input name="sku" value={form.sku} onChange={handleChange} placeholder="e.g., PROD-001" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Product name" className="input" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Product description" className="input" style={{ minHeight: 80, fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Unit *</label>
            <select name="unit" value={form.unit} onChange={handleChange} className="input">
              <option value="units">Units</option>
              <option value="kg">KG</option>
              <option value="liter">Liter</option>
              <option value="meter">Meter</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
              <option value="piece">Piece</option>
              <option value="dozen">Dozen</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Unit Price</label>
            <input name="unitPrice" type="number" value={form.unitPrice} onChange={handleChange} placeholder="0.00" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Cost Price</label>
            <input name="costPrice" type="number" value={form.costPrice} onChange={handleChange} placeholder="0.00" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Selling Price</label>
            <input name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleChange} placeholder="0.00" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Min Quantity</label>
            <input name="minQuantity" type="number" value={form.minQuantity} onChange={handleChange} placeholder="0" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Max Quantity</label>
            <input name="maxQuantity" type="number" value={form.maxQuantity} onChange={handleChange} placeholder="0" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>Reorder Point</label>
            <input name="reorderPoint" type="number" value={form.reorderPoint} onChange={handleChange} placeholder="0" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>HSN Code</label>
            <input name="hsn" value={form.hsn} onChange={handleChange} placeholder="HSN code" className="input" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>GST %</label>
            <input name="gst" type="number" value={form.gst} onChange={handleChange} placeholder="0" className="input" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 6 }}>
              Tally Sales Ledger
              <span style={{ fontSize: 11, fontWeight: 400, color: COLORS.textLight, marginLeft: 6 }}>
                (exact ledger name from Tally — needed for item name to show in Tally invoices)
              </span>
            </label>
            <input
              name="tallySalesLedger"
              value={form.tallySalesLedger}
              onChange={handleChange}
              placeholder="e.g. Neck Pillow Sales Local  or  Hydra Bottle Sales @18%"
              className="input"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.textMid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: COLORS.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
