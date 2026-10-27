import { useState, useEffect } from 'react';
import Modal from '../../../components/common/Modal';

const CATEGORIES = ['Machinery', 'Material Handling', 'Utilities', 'IT Equipment', 'Vehicles', 'Furniture', 'Other'];
const STATUSES   = ['Active', 'Maintenance', 'Inactive'];
const EMPTY = { name: '', category: 'Machinery', location: '', purchaseDate: '', purchaseValue: '', currentValue: '', status: 'Active', nextMaintDate: '', serialNumber: '', vendor: '', description: '' };

export default function AssetFormModal({ open, onClose, onSave, editAsset, saving }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editAsset) {
      setForm({
        name:          editAsset.name || '',
        category:      editAsset.category || 'Machinery',
        location:      editAsset.location || '',
        purchaseDate:  editAsset.purchaseDate ? editAsset.purchaseDate.slice(0, 10) : '',
        purchaseValue: editAsset.purchaseValue ?? '',
        currentValue:  editAsset.currentValue ?? '',
        status:        editAsset.status || 'Active',
        nextMaintDate: editAsset.nextMaintDate ? editAsset.nextMaintDate.slice(0, 10) : '',
        serialNumber:  editAsset.serialNumber || '',
        vendor:        editAsset.vendor || '',
        description:   editAsset.description || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [editAsset, open]);

  if (!open) return null;
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editAsset ? 'Edit Asset' : 'Add New Asset'}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? (editAsset ? 'Saving...' : 'Adding...') : (editAsset ? 'Save Changes' : 'Add Asset')}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-gray-600">Asset Name *</label>
          <input className="form-input" placeholder="e.g. CNC Machine M-300" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Category *</label>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Location *</label>
          <input className="form-input" placeholder="e.g. Plant A" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Purchase Date</label>
          <input type="date" className="form-input" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Purchase Value (₹)</label>
          <input type="number" className="form-input" placeholder="0" value={form.purchaseValue} onChange={e => set('purchaseValue', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Current Value (₹)</label>
          <input type="number" className="form-input" placeholder="0" value={form.currentValue} onChange={e => set('currentValue', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Next Maintenance Date</label>
          <input type="date" className="form-input" value={form.nextMaintDate} onChange={e => set('nextMaintDate', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Serial Number</label>
          <input className="form-input" placeholder="Optional" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Vendor / Supplier</label>
          <input className="form-input" placeholder="Optional" value={form.vendor} onChange={e => set('vendor', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea className="form-input" rows={2} placeholder="Optional notes..." value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>
    </Modal>
  );
}
