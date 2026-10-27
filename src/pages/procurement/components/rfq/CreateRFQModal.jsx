import { useState, useEffect } from 'react';
import Modal from '../../../../components/common/Modal';
import { vendorApi } from '../../../../api/vendorApi';
import { prApi } from '../../../../api/prApi';
import { rfqApi } from '../../../../api/rfqApi';
import { useAuth } from '../../../../auth/AuthContext';
import { MdAdd, MdDelete, MdAttachFile, MdClose } from 'react-icons/md';

const UNITS = ['Nos', 'Kg', 'Grams', 'Litre', 'ML', 'Metre', 'CM', 'Set', 'Box', 'Carton', 'Pcs', 'Dozen'];
const emptyItem = { sku: '', name: '', qty: '', unit: 'Nos', spec: '', requiredDate: '' };

const inp = { width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: '#1e293b' };
const lbl = { fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 };

export default function CreateRFQModal({ open, onClose, onSaved }) {
  const { user } = useAuth();

  const [vendors, setVendors]               = useState([]);
  const [prs, setPrs]                       = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');

  const [selectedVendors, setSelectedVendors] = useState([]);
  const [items, setItems]                   = useState([{ ...emptyItem }]);
  const [attachments, setAttachments]       = useState([]);

  const [form, setForm] = useState({
    title: '',
    linkedPR: '',
    date: new Date().toISOString().slice(0, 10),
    deadline: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadData();
      // reset
      setSelectedVendors([]);
      setItems([{ ...emptyItem }]);
      setAttachments([]);
      setError('');
      setForm({ title: '', linkedPR: '', date: new Date().toISOString().slice(0, 10), deadline: '', notes: '' });
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        vendorApi.getAll({ status: 'Active' }),
        prApi.getAll({ status: 'Approved' }), // Only approved PRs can be linked to RFQ
      ]);
      setVendors(vRes.data || []);
      setPrs(pRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleVendor = (id) =>
    setSelectedVendors(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

  // ── When PR is selected, auto-populate items from that PR ──────────────────
  const handlePRChange = async (prId) => {
    const pr = prs.find(p => p._id === prId);
    setForm(f => ({
      ...f,
      linkedPR: prId,
      title: f.title || (pr ? `RFQ for ${pr.prId} — ${pr.department}` : ''),
    }));

    if (!prId) {
      setItems([{ ...emptyItem }]);
      return;
    }

    try {
      const res = await prApi.getById(prId);
      const prData = res.data;
      if (prData?.items?.length) {
        setItems(prData.items.map(it => ({
          sku: '',
          name: it.name || '',
          qty: it.qty ? String(it.qty) : '',
          unit: it.unit || 'Nos',
          spec: '',
          requiredDate: prData.requiredBy ? new Date(prData.requiredBy).toISOString().slice(0, 10) : '',
        })));
      }
    } catch (e) {
      console.error('Failed to load PR items:', e);
    }
  };

  const updateItem = (i, field, val) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));

  const addItem    = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (asDraft = false) => {
    setError('');
    if (selectedVendors.length === 0) { setError('Select at least one vendor.'); return; }
    if (!form.deadline) { setError('Deadline is required.'); return; }
    if (!form.title.trim()) { setError('RFQ Title is required.'); return; }
    if (items.some(it => !it.name.trim() || !it.qty)) { setError('Fill item name and quantity for all rows.'); return; }

    setSaving(true);
    try {
      await rfqApi.create({
        title: form.title.trim() || (form.linkedPR
          ? `RFQ for PR-${prs.find(p => p._id === form.linkedPR)?.prId || ''}`
          : `RFQ — ${new Date().toLocaleDateString('en-IN')}`),
        linkedPR: form.linkedPR || null,
        vendors: selectedVendors,
        dueDate: form.deadline,
        items: items.map(it => ({
          sku: it.sku.trim() || undefined,
          name: it.name.trim(),
          qty: parseFloat(it.qty),
          unit: it.unit,
          spec: it.spec.trim() || undefined,
          requiredDate: it.requiredDate || undefined,
        })),
        remarks: form.notes.trim() || '',
        attachments: attachments.map(a => a.name),
        createdBy: user?.name || user?.email || 'Unknown',
        status: asDraft ? 'Draft' : 'Sent',
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create RFQ" size="xl"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-outline" onClick={() => handleSubmit(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? 'Sending...' : 'Send RFQ'}
          </button>
        </div>
      }
    >
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {error && (
            <div style={{ padding: '9px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* ── RFQ Header ── */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: '#1e40af', borderRadius: 2 }} />
              RFQ Header
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>RFQ No</label>
                <input style={{ ...inp, background: '#f8fafc', color: '#94a3b8' }} value="Auto-generated" readOnly />
              </div>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={lbl}>Deadline *</label>
                <input type="date" style={inp} value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={lbl}>PR Reference (Approved PRs only)</label>
                <select style={inp} value={form.linkedPR} onChange={e => handlePRChange(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                  <option value="">— None —</option>
                  {prs.map(p => (
                    <option key={p._id} value={p._id}>{p.prId} — {p.department} ({p.items?.length || 0} items)</option>
                  ))}
                </select>
                {form.linkedPR && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                    ✓ Items auto-populated from PR
                  </div>
                )}
              </div>
              <div style={{ gridColumn: 'span 3' }}>
                <label style={lbl}>RFQ Title *</label>
                <input style={inp} placeholder="e.g. Raw Material Supply Q3 — Vendor A" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>
          </section>

          {/* ── Vendor Selection ── */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: '#1e40af', borderRadius: 2 }} />
              Vendor Selection *
            </div>
            {vendors.length === 0 ? (
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                No active vendors found. Add vendors first.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {vendors.map(v => {
                    const selected = selectedVendors.includes(v._id);
                    return (
                      <button key={v._id} onClick={() => toggleVendor(v._id)} style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${selected ? '#1e40af' : '#e2e8f0'}`,
                        background: selected ? '#fef2f2' : '#f8fafc',
                        color: selected ? '#1e40af' : '#475569',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}>
                        {selected ? '✓ ' : ''}{v.companyName}
                      </button>
                    );
                  })}
                </div>
                {selectedVendors.length > 0 && (
                  <div style={{ fontSize: 11, color: '#1e40af', marginTop: 8, fontWeight: 600 }}>
                    {selectedVendors.length} vendor{selectedVendors.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Item Table ── */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 14, background: '#1e40af', borderRadius: 2 }} />
                Items *
              </div>
              <button onClick={addItem} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 12px', borderRadius: 7, border: '1.5px solid #1e40af',
                background: '#fef2f2', color: '#1e40af', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <MdAdd size={14} /> Add Row
              </button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['SKU', 'Item Name *', 'Qty *', 'Unit', 'Specification', 'Required Date', ''].map((h, i) => (
                      <th key={i} style={{ padding: '9px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', width: 90 }}>
                        <input style={inp} placeholder="SKU-001" value={item.sku}
                          onChange={e => updateItem(i, 'sku', e.target.value)}
                          onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </td>
                      <td style={{ padding: '6px 8px', minWidth: 160 }}>
                        <input style={inp} placeholder="Item name" value={item.name}
                          onChange={e => updateItem(i, 'name', e.target.value)}
                          onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 80 }}>
                        <input style={inp} type="number" placeholder="0" value={item.qty}
                          onChange={e => updateItem(i, 'qty', e.target.value)}
                          onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 90 }}>
                        <select style={inp} value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px', minWidth: 160 }}>
                        <input style={inp} placeholder="Grade, size, brand..." value={item.spec}
                          onChange={e => updateItem(i, 'spec', e.target.value)}
                          onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 130 }}>
                        <input style={inp} type="date" value={item.requiredDate}
                          onChange={e => updateItem(i, 'requiredDate', e.target.value)}
                          onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                      </td>
                      <td style={{ padding: '6px 8px', width: 40, textAlign: 'center' }}>
                        <button onClick={() => removeItem(i)} disabled={items.length === 1}
                          style={{ background: 'none', border: 'none', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: items.length === 1 ? '#cbd5e1' : '#ef4444', display: 'flex', alignItems: 'center', padding: 4 }}>
                          <MdDelete size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Notes / Attachments ── */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: '#1e40af', borderRadius: 2 }} />
              Notes &amp; Attachments
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Notes / Terms</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} placeholder="Any special instructions, terms, or conditions..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#1e40af'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
              <div>
                <label style={lbl}>Attachments</label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  border: '1.5px dashed #e2e8f0', borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 8,
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1e40af'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <MdAttachFile size={16} style={{ color: '#1e40af' }} />
                  Click to attach files
                  <input type="file" multiple style={{ display: 'none' }}
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setAttachments(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size }))]);
                    }} />
                </label>
                {attachments.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#f8fafc', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#475569' }}>{a.name} <span style={{ color: '#94a3b8' }}>({(a.size / 1024).toFixed(1)} KB)</span></span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 2 }}>
                      <MdClose size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      )}
    </Modal>
  );
}
