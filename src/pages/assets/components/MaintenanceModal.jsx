import { useState } from 'react';
import Modal from '../../../components/common/Modal';

const TYPES    = ['Preventive', 'Corrective', 'Emergency'];
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const EMPTY = { type: 'Preventive', technician: '', description: '', cost: '', date: '', status: 'Scheduled', nextMaintDate: '' };

export default function MaintenanceModal({ open, onClose, onSave, saving, assetName }) {
  const [form, setForm] = useState(EMPTY);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (!open) return null;

  const handleSave = () => {
    onSave(form);
    setForm(EMPTY);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assetName ? `Schedule Maintenance — ${assetName}` : 'Schedule Maintenance'}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Scheduling...' : 'Schedule'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Maintenance Type</label>
          <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Technician</label>
          <input className="form-input" placeholder="Name" value={form.technician} onChange={e => set('technician', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Cost (₹)</label>
          <input type="number" className="form-input" placeholder="0" value={form.cost} onChange={e => set('cost', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Date</label>
          <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600">Next Maintenance Date</label>
          <input type="date" className="form-input" value={form.nextMaintDate} onChange={e => set('nextMaintDate', e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5 col-span-2">
          <label className="text-xs font-semibold text-gray-600">Description</label>
          <textarea className="form-input" rows={2} placeholder="Work to be done..." value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>
    </Modal>
  );
}
