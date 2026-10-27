import { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader, KpiStrip, PageCard } from '../../components/common/PageShell';
import StatusBadge from '../../components/common/StatusBadge';
import { qualityCheckApi } from '../../api/qualityCheckApi';
import { useAuth } from '../../auth/AuthContext';
import { MdVerifiedUser, MdCheckCircle, MdCancel, MdHourglassEmpty, MdSearch } from 'react-icons/md';
import { useDataEvent, dataEvents } from '../../utils/dataEvents';


const inp = {
  padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9,
  fontSize: 13, outline: 'none', background: '#f8fafc', color: '#1e293b',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
};

export default function QualityCheckPage() {
  const { user } = useAuth();
  const [qcs, setQcs]               = useState([]);
  const [stats, setStats]           = useState({ total: 0, passed: 0, partial: 0, pending: 0, rejected: 0 });
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [selectingId, setSelectingId] = useState(null); // tracks which row is loading
  const [search, setSearch]         = useState('');
  const [selectedQC, setSelectedQC] = useState(null);
  const [itemEdits, setItemEdits]   = useState({});
  const [batchRemarks, setBatchRemarks] = useState('');
  const panelRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [qcRes, statsRes] = await Promise.all([qualityCheckApi.getAll(), qualityCheckApi.getStats()]);
      setQcs(qcRes.data || []);
      setStats(statsRes.data || {});
      if (!selectedQC && qcRes.data?.length > 0) {
        // Fetch full detail for the first record so items are populated
        try {
          const firstRes = await qualityCheckApi.getById(qcRes.data[0]._id);
          setSelectedQC(firstRes.data);
        } catch {
          setSelectedQC(qcRes.data[0]);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useDataEvent('qc:changed', fetchAll);

  const selectQC = async (qc) => {
    if (selectingId === qc._id) return; // already loading this one
    setSelectingId(qc._id);
    setItemEdits({});
    setBatchRemarks('');
    try {
      const res = await qualityCheckApi.getById(qc._id);
      setSelectedQC(res.data);
      // Scroll the inspection panel into view
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setSelectedQC(qc); // fallback to list data
    } finally {
      setSelectingId(null);
    }
  };

  const handleSubmit = async (forceStatus) => {
    if (!selectedQC) return;
    setSaving(true);
    try {
      const items = selectedQC.items.map((it, i) => ({
        itemName:   it.itemName,
        receivedQty: it.receivedQty,
        passedQty:  parseInt(itemEdits[i]?.passedQty ?? it.passedQty) || 0,
        failedQty:  parseInt(itemEdits[i]?.failedQty ?? it.failedQty) || 0,
        remarks:    itemEdits[i]?.remarks ?? it.remarks ?? '',
      }));

      if (forceStatus === 'Rejected') {
        items.forEach(it => { it.failedQty = it.receivedQty; it.passedQty = 0; });
      }

      const res = await qualityCheckApi.submit(selectedQC._id, {
        items,
        inspectedBy: user?.name || user?.email || 'Inspector',
        remarks: batchRemarks,
      });
      setSelectedQC(res.data);
      dataEvents.emit('qc:changed');
      await fetchAll();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtered = qcs.filter(q =>
    !search ||
    q.qcId?.toLowerCase().includes(search.toLowerCase()) ||
    q.grnId?.grnId?.toLowerCase().includes(search.toLowerCase()) ||
    q.vendorId?.companyName?.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = [
    { label: 'Total Inspections', value: stats.total,   icon: <MdVerifiedUser size={18} />,   color: '#1e40af', color2: '#e74c3c', glow: 'rgba(192,57,43,0.25)' },
    { label: 'Passed',            value: stats.passed,  icon: <MdCheckCircle size={18} />,    color: '#16a34a', color2: '#22c55e', glow: 'rgba(22,163,74,0.25)' },
    { label: 'Partial / Rejected',value: (stats.partial || 0) + (stats.rejected || 0), icon: <MdCancel size={18} />, color: '#dc2626', color2: '#ef4444', glow: 'rgba(220,38,38,0.3)' },
    { label: 'Pending QC',        value: stats.pending, icon: <MdHourglassEmpty size={18} />, color: '#d97706', color2: '#f59e0b', glow: 'rgba(217,119,6,0.25)' },
  ];

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PageHeader title="Quality Check" breadcrumb="Procurement › Quality Check" />
      <KpiStrip kpis={kpis} />

      {/* GRN Queue */}
      <PageCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>GRN Inspection Queue</div>
          <div style={{ position: 'relative', width: 220 }}>
            <MdSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input style={{ ...inp, paddingLeft: 30 }} placeholder="Search GRN / Vendor..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #f1f5f9' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['QC ID', 'GRN Ref', 'PO Ref', 'Vendor', 'Items', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No QC records found. Create a GRN to start inspection.</td></tr>
                ) : filtered.map((q) => (
                  <tr key={q._id}
                    style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: selectedQC?._id === q._id ? '#fef2f2' : 'transparent', transition: 'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = selectedQC?._id === q._id ? '#fef2f2' : 'transparent'}
                    onClick={() => selectQC(q)}
                  >
                    <td style={{ padding: '11px 14px', fontFamily: 'monospace', fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{q.qcId}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#1e293b', fontFamily: 'monospace' }}>{q.grnId?.grnId || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#1e293b', fontFamily: 'monospace' }}>{q.poId?.poId || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#1e293b', fontWeight: 500 }}>{q.vendorId?.companyName || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#1e293b' }}>{q.items?.length || 0}</td>
                    <td style={{ padding: '11px 14px' }}><StatusBadge status={q.status} /></td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#64748b' }}>{new Date(q.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); selectQC(q); }}
                        disabled={selectingId === q._id}
                        style={{
                          padding: '5px 12px', fontSize: 12, borderRadius: 8,
                          background: selectingId === q._id ? '#f1f5f9' : q.status === 'Pending' ? '#fef2f2' : '#f1f5f9',
                          color: selectingId === q._id ? '#94a3b8' : q.status === 'Pending' ? '#ef4444' : '#64748b',
                          border: `1px solid ${q.status === 'Pending' ? '#fecaca' : '#e2e8f0'}`,
                          cursor: selectingId === q._id ? 'not-allowed' : 'pointer',
                          fontWeight: 600, fontFamily: 'inherit',
                          minWidth: 68, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}
                      >
                        {selectingId === q._id
                          ? <><span style={{ display:'inline-block', width:10, height:10, border:'2px solid #94a3b8', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .6s linear infinite' }} />Loading</>
                          : q.status === 'Pending' ? 'Inspect' : 'View'
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* Inspection Panel */}
      {selectedQC && (
        <div ref={panelRef}>
        <PageCard>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            Quality Inspection — {selectedQC.qcId}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            GRN: <strong style={{ color: '#ef4444' }}>{selectedQC.grnId?.grnId || '—'}</strong>
            {' · '}PO: <strong>{selectedQC.poId?.poId || '—'}</strong>
            {' · '}Vendor: <strong>{selectedQC.vendorId?.companyName || '—'}</strong>
            {' · '}Status: <strong>{selectedQC.status}</strong>
          </div>
          {selectedQC.inspectedBy && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
              Inspected by {selectedQC.inspectedBy} on {new Date(selectedQC.inspectedAt).toLocaleString('en-IN')}
            </div>
          )}

          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #f1f5f9', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Item', 'Received Qty', 'Pass Qty', 'Fail Qty', 'Result', 'Remarks'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedQC.items?.map((item, i) => {
                  const passVal = itemEdits[i]?.passedQty ?? item.passedQty;
                  const failVal = itemEdits[i]?.failedQty ?? item.failedQty;
                  const result  = failVal > 0 && passVal > 0 ? 'Partial' : failVal > 0 ? 'Failed' : passVal > 0 ? 'Passed' : '—';
                  const isDone  = selectedQC.status !== 'Pending';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{item.itemName}</td>
                      <td style={{ padding: '11px 14px', fontSize: 12.5, color: '#1e293b' }}>{item.receivedQty}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <input type="number" min={0} max={item.receivedQty} disabled={isDone}
                          style={{ ...inp, width: 70, background: isDone ? '#f1f5f9' : '#f0fdf4', borderColor: isDone ? '#e2e8f0' : '#bbf7d0', color: '#16a34a', fontWeight: 700 }}
                          value={passVal}
                          onChange={e => setItemEdits(prev => ({ ...prev, [i]: { ...prev[i], passedQty: e.target.value } }))} />
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <input type="number" min={0} max={item.receivedQty} disabled={isDone}
                          style={{ ...inp, width: 70, background: isDone ? '#f1f5f9' : '#fef2f2', borderColor: isDone ? '#e2e8f0' : '#fecaca', color: '#dc2626', fontWeight: 700 }}
                          value={failVal}
                          onChange={e => setItemEdits(prev => ({ ...prev, [i]: { ...prev[i], failedQty: e.target.value } }))} />
                      </td>
                      <td style={{ padding: '11px 14px' }}><StatusBadge status={result} /></td>
                      <td style={{ padding: '11px 14px' }}>
                        <input disabled={isDone} style={{ ...inp, width: 140 }} placeholder="Remarks..."
                          value={itemEdits[i]?.remarks ?? item.remarks ?? ''}
                          onChange={e => setItemEdits(prev => ({ ...prev, [i]: { ...prev[i], remarks: e.target.value } }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selectedQC.status === 'Pending' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Overall Remarks</label>
                <input style={inp} placeholder="Overall inspection remarks..." value={batchRemarks} onChange={e => setBatchRemarks(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button disabled={saving} onClick={() => handleSubmit('Rejected')} style={{
                  padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: '#fee2e2', color: '#dc2626', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                }}>✗ Reject Batch</button>
                <button disabled={saving} onClick={() => handleSubmit()} style={{
                  padding: '8px 18px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff',
                  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  boxShadow: '0 3px 10px rgba(22,163,74,0.3)',
                }}>{saving ? 'Submitting...' : '✓ Submit Inspection'}</button>
              </div>
            </>
          )}

          {selectedQC.status !== 'Pending' && (
            <div style={{ padding: '12px 16px', background: selectedQC.status === 'Passed' ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1px solid ${selectedQC.status === 'Passed' ? '#bbf7d0' : '#fecaca'}`, fontSize: 13, fontWeight: 600, color: selectedQC.status === 'Passed' ? '#16a34a' : '#dc2626' }}>
              {selectedQC.status === 'Passed' ? '✓ Inspection complete — Approval request has been raised automatically.' : selectedQC.status === 'Partial' ? '⚠ Partial pass — Approval request raised for review.' : '✗ Batch rejected.'}
            </div>
          )}
        </PageCard>
        </div>
      )}
    </div>
  );
}
