import { useState } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../../components/common/Modal';
import { MdUploadFile, MdCheckCircle, MdError, MdDownload } from 'react-icons/md';
import { poApi } from '../../../api/poApi';

const REQUIRED_COLS = ['vendor', 'item_name', 'qty', 'unit', 'base_price', 'gst', 'delivery_date'];

export default function BulkPOUpload({ onSuccess }) {
  const [showModal, setShowModal]     = useState(false);
  const [file, setFile]               = useState(null);
  const [parseError, setParseError]   = useState('');
  const [uploading, setUploading]     = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [preview, setPreview]         = useState([]);

  // ── Parse file using SheetJS (handles both CSV and XLSX) ──
  const parseFile = (selectedFile) => {
    setParseError('');
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of objects (header row → keys)
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          setParseError('File is empty or has no data rows.');
          return;
        }

        // Normalise keys to lowercase with underscores
        const normalised = rows.map(row => {
          const obj = {};
          Object.entries(row).forEach(([k, v]) => {
            obj[k.toLowerCase().replace(/\s+/g, '_')] = v;
          });
          return obj;
        });

        setPreview(normalised.slice(0, 5));
      } catch (err) {
        setParseError('Could not parse file. Make sure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile); // works for both CSV and XLSX
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      alert('Please upload a CSV or Excel (.xlsx / .xls) file');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) { alert('Please select a valid file'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await poApi.bulkUpload(formData);
      setUploadResult({
        success: res.data?.successful || 0,
        failed:  res.data?.failed    || 0,
        errors:  res.data?.errors    || [],
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseError(''); setUploadResult(null);
    setShowModal(false);
    onSuccess?.();
  };

  // ── Download sample template ──
  const downloadTemplate = () => {
    const sample = [
      { vendor: 'Vendor Name', item_name: 'Steel Rod', qty: 100, unit: 'Kg', base_price: 85, gst: 18, delivery_date: '2026-06-01' },
      { vendor: 'Vendor Name', item_name: 'Bolt M10',  qty: 500, unit: 'Nos', base_price: 2,  gst: 18, delivery_date: '2026-06-01' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO Template');
    XLSX.writeFile(wb, 'PO_Bulk_Upload_Template.xlsx');
  };

  return (
    <>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => setShowModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <MdUploadFile size={16} /> Bulk Upload
      </button>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Bulk Upload Purchase Orders"
        size="lg"
        footer={
          uploadResult ? (
            <button className="btn btn-primary" onClick={handleReset}>Done</button>
          ) : (
            <>
              <button className="btn btn-outline" onClick={() => setShowModal(false)} disabled={uploading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </>
          )
        }
      >
        {uploadResult ? (
          /* ── Result screen ── */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {uploadResult.failed === 0
              ? <MdCheckCircle size={48} style={{ color: '#16a34a', margin: '0 auto' }} />
              : <MdError size={48} style={{ color: '#dc2626', margin: '0 auto' }} />}
            <div style={{ fontSize: 16, fontWeight: 700, margin: '12px 0 6px' }}>
              {uploadResult.failed === 0 ? 'Upload Successful!' : 'Upload Completed with Errors'}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              <div>✓ {uploadResult.success} POs created successfully</div>
              {uploadResult.failed > 0 && <div>✗ {uploadResult.failed} POs failed</div>}
            </div>
            {uploadResult.errors.length > 0 && (
              <div style={{ background: '#fee2e2', padding: 12, borderRadius: 8, textAlign: 'left', maxHeight: 200, overflowY: 'auto' }}>
                <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 8, fontSize: 12 }}>Errors:</div>
                {uploadResult.errors.map((err, idx) => (
                  <div key={idx} style={{ fontSize: 11, color: '#991b1b', marginBottom: 4 }}>Row {err.row}: {err.message}</div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Drop zone ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 13 }}>Select CSV or Excel File</label>
                <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  <MdDownload size={14} /> Download Template
                </button>
              </div>

              <label
                htmlFor="bulk-po-file"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '28px 20px',
                  border: `2px dashed ${file ? '#22c55e' : '#cbd5e1'}`,
                  borderRadius: 10, background: file ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer', transition: 'all .2s',
                }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#ef4444'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = file ? '#22c55e' : '#cbd5e1'; }}
                onDrop={e => { e.preventDefault(); handleFileSelect({ target: { files: e.dataTransfer.files } }); }}
              >
                <input type="file" id="bulk-po-file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
                <MdUploadFile size={32} style={{ color: file ? '#22c55e' : '#94a3b8' }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: file ? '#15803d' : '#475569' }}>
                  {file ? file.name : 'Click to upload or drag & drop'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>CSV, XLSX or XLS files only</div>
              </label>
            </div>

            {/* ── Parse error ── */}
            {parseError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626', fontWeight: 600, marginBottom: 14 }}>
                ⚠ {parseError}
              </div>
            )}

            {/* ── Required columns hint ── */}
            <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#166534', border: '1px solid #bbf7d0' }}>
              <strong>Required columns:</strong> {REQUIRED_COLS.join(', ')}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
