import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import Stepper from '../../../../components/common/Stepper';
import { prApi } from '../../../../api/prApi';
import { departmentApi } from '../../../../api/departmentApi';
import { useAuth } from '../../../../auth/AuthContext';
import { dataEvents } from '../../../../utils/dataEvents';

const steps = ['Details', 'Items', 'Review', 'Submit'];
const emptyItem = { name: '', qty: '', unit: 'Nos' };
const emptyForm = { department: '', requiredBy: '', priority: 'Normal', remarks: '' };

export default function CreatePRModal({ open, onClose, onSaved, editData }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (open) {
      departmentApi.getAll().then(res => setDepartments(res.data)).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (editData) {
      setForm({
        department: editData.department || '',
        requiredBy: editData.requiredBy ? editData.requiredBy.slice(0, 10) : '',
        priority: editData.priority || 'Normal',
        remarks: editData.remarks || '',
      });
      setItems(editData.items?.length ? editData.items : [{ ...emptyItem }]);
    } else {
      setForm(emptyForm);
      setItems([{ ...emptyItem }]);
    }
    setStep(0);
  }, [editData, open]);

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateItem = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleClose = () => { setStep(0); onClose(); };

  const handleSubmit = async () => {
    // Validate required fields
    if (!form.department) { alert('Please select a department.'); setStep(0); return; }
    const validItems = items.filter(it => it.name?.trim() && it.qty);
    if (validItems.length === 0) { alert('Add at least one item with a name and quantity.'); setStep(1); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        requiredBy: form.requiredBy || null,
        items: validItems.map(it => ({ ...it, qty: parseFloat(it.qty) || 0 })),
        requestedBy: user?.name || user?.email || 'Unknown',
      };
      if (editData) await prApi.update(editData._id, payload);
      else await prApi.create(payload);
      dataEvents.emit('pr:changed');
      onSaved?.();
      handleClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editData ? 'Edit Purchase Requisition' : 'Create Purchase Requisition'}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => step === 0 ? handleClose() : setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          {step < steps.length - 1
            ? <button className="btn btn-primary" onClick={() => {
                if (step === 0 && !form.department) { alert('Please select a department.'); return; }
                if (step === 1 && !items.some(it => it.name?.trim() && it.qty)) { alert('Add at least one item with name and quantity.'); return; }
                setStep(s => s + 1);
              }}>Next →</button>
            : <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Submitting...' : editData ? 'Update PR' : 'Submit PR'}
              </button>
          }
        </div>
      }
    >
      <style>{`
        .pr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media(max-width: 520px) { .pr-form-grid { grid-template-columns: 1fr; } }
        .pr-form-span { grid-column: span 2; }
        @media(max-width: 520px) { .pr-form-span { grid-column: span 1; } }
        .pr-review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        @media(max-width: 480px) { .pr-review-grid { grid-template-columns: 1fr; } }
        .pr-item-row { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; align-items: center; }
        .pr-item-header { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; }
        @media(max-width: 520px) {
          .pr-item-row { grid-template-columns: 1fr 1fr; gap: 8px; }
          .pr-item-header { display: none; }
          .pr-item-name { grid-column: span 2; }
          .pr-item-remove { grid-column: span 2; display: flex; justify-content: flex-end; }
        }
      `}</style>

      <Stepper steps={steps} current={step} />

      {/* Step 0 — Details */}
      {step === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Department *</label>
            <select className="form-select" value={form.department} onChange={e => updateForm('department', e.target.value)}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Required By *</label>
            <input type="date" className="form-input" value={form.requiredBy} onChange={e => updateForm('requiredBy', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => updateForm('priority', e.target.value)}>
              <option>Normal</option><option>Urgent</option><option>Critical</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <label className="form-label">Remarks</label>
            <textarea className="form-input" rows={2} placeholder="Reason for requisition..." value={form.remarks} onChange={e => updateForm('remarks', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 1 — Items */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Add Items</div>
            <button className="btn btn-outline btn-sm" onClick={addItem}>+ Add Row</button>
          </div>

          {/* Desktop header */}
          <div className="pr-item-header" style={{ marginBottom: 6 }}>
            {['ITEM NAME', 'QTY', 'UNIT', ''].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{h}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => (
              <div key={i} className="pr-item-row" style={{ background: '#f8fafc', borderRadius: 8, padding: '8px', border: '1px solid #e2e8f0' }}>
                <div className="pr-item-name">
                  <input className="form-input" placeholder="Item name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} style={{ width: '100%' }} />
                </div>
                <input className="form-input" type="number" placeholder="Qty" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                <select className="form-select" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                  <option>Nos</option><option>Kg</option><option>Set</option><option>Litre</option><option>Metre</option>
                </select>
                <div className="pr-item-remove">
                  <button
                    className="btn btn-sm"
                    style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Review */}
      {step === 2 && (
        <div>
          <div className="pr-review-grid">
            {[
              ['Department', form.department], 
              ['Required By', form.requiredBy || '—'],
              ['Priority', form.priority],
              ['Remarks', form.remarks || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{k}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Items ({items.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 360, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Item', 'Qty', 'Unit'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.name || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{it.qty || 0}</td>
                    <td style={{ padding: '8px 10px' }}>{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 3 — Submit */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Ready to Submit</div>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 18 }}>
            This PR will be sent for multi-level approval:<br />
            <strong>L1 Manager → L2 HOD → L3 Finance</strong>
          </div>
          <div style={{
            background: '#f8fafc', borderRadius: 10, padding: 16,
            display: 'inline-block', textAlign: 'left',
            minWidth: 220, maxWidth: '100%', boxSizing: 'border-box',
          }}>
            {[
              ['Department', form.department],
              ['Items', `${items.length} item(s)`],
            ].map(([k, v], i) => (
              <div key={k} style={{ marginBottom: i < 2 ? 10 : 0 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{k}</div>
                <div style={{ fontWeight: i === 2 ? 800 : 700, fontSize: i === 2 ? 16 : 14, color: i === 2 ? 'var(--primary)' : '#1a202c' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
