import { useState, useEffect, useRef } from 'react';
import { inventoryApi } from '../../api/inventoryApi';
import PageHeader from '../../components/common/PageHeader';
import PageShell from '../../components/common/PageShell';

export default function AdvancedBarcodePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [scanInput, setScanInput] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [generatedBarcodes, setGeneratedBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const scanInputRef = useRef(null);

  const [generateForm, setGenerateForm] = useState({
    sku: '',
    batchId: '',
    quantity: 1,
  });

  const [scanHistory, setScanHistory] = useState([]);

  useEffect(() => {
    if (activeTab === 1) {
      scanInputRef.current?.focus();
    }
  }, [activeTab]);

  const handleGenerateBarcode = async () => {
    if (!generateForm.sku || !generateForm.batchId) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.generateBarcodes([
        {
          sku: generateForm.sku,
          batchId: generateForm.batchId,
          quantity: generateForm.quantity,
        },
      ]);

      setGeneratedBarcodes(response.data.barcodes || []);
      setSuccess(`Generated ${response.data.barcodes?.length || 0} barcodes`);
      setGenerateForm({ sku: '', batchId: '', quantity: 1 });

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate barcodes');
    } finally {
      setLoading(false);
    }
  };

  const handleScanBarcode = async (value) => {
    if (!value.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.lookupBarcode(value);
      const item = response.data;

      setScannedItem(item);
      setScanHistory([
        {
          barcode: value,
          sku: item.sku,
          itemName: item.itemName,
          location: item.location,
          quantity: item.quantity,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...scanHistory.slice(0, 9),
      ]);

      setSuccess(`✓ Found: ${item.itemName}`);
      setScanInput('');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Barcode not found or invalid');
      setScannedItem(null);
      setScanInput('');
    } finally {
      setLoading(false);
    }
  };

  const handleScanKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleScanBarcode(scanInput);
    }
  };

  const handleInwardAction = async () => {
    if (!scannedItem) return;
    setLoading(true);
    try {
      await inventoryApi.recordMovement({
        sku: scannedItem.sku,
        type: 'inward',
        quantity: scannedItem.quantity,
        location: scannedItem.location,
        reference: `SCAN-${Date.now()}`,
      });
      setSuccess('✓ Inward recorded');
      setScannedItem(null);
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to record inward');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Advanced Barcode Management"
        subtitle="Generate, scan, and track barcodes in real-time"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {['Generate', 'Scan', 'History'].map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '12px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === i ? '2px solid #ef4444' : 'none',
              color: activeTab === i ? '#ef4444' : '#6b7280',
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
          padding: 12, marginBottom: 16, color: '#dc2626', fontSize: 13,
        }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div style={{
          background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8,
          padding: 12, marginBottom: 16, color: '#16a34a', fontSize: 13,
        }}>
          {success}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>Generate Barcodes</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                SKU *
              </label>
              <input
                type="text"
                placeholder="e.g., SKU-1042"
                value={generateForm.sku}
                onChange={(e) => setGenerateForm({ ...generateForm, sku: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                Batch ID *
              </label>
              <input
                type="text"
                placeholder="e.g., B-2024-04"
                value={generateForm.batchId}
                onChange={(e) => setGenerateForm({ ...generateForm, batchId: e.target.value })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={generateForm.quantity}
                onChange={(e) => setGenerateForm({ ...generateForm, quantity: parseInt(e.target.value) })}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleGenerateBarcode}
              disabled={loading}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 8, background: '#ef4444',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Generating...' : '🔄 Generate'}
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>Generated Barcodes</h3>

            {generatedBarcodes.length === 0 ? (
              <div style={{
                background: '#f9fafb', borderRadius: 8, padding: 20, textAlign: 'center',
                color: '#94a3b8', fontSize: 13,
              }}>
                No barcodes generated yet
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {generatedBarcodes.map((barcode, i) => (
                  <div key={i} style={{
                    background: '#f9fafb', borderRadius: 8, padding: 12, textAlign: 'center',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{
                      background: '#fff', padding: 8, borderRadius: 4, marginBottom: 8,
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                      color: '#1f2937', wordBreak: 'break-all',
                    }}>
                      {barcode.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scan Tab */}
      {activeTab === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>Scan Barcode</h3>

            <div style={{ marginBottom: 16 }}>
              <input
                ref={scanInputRef}
                type="text"
                placeholder="Point camera or type barcode..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyPress}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  border: '2px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={() => handleScanBarcode(scanInput)}
              disabled={!scanInput || loading}
              style={{
                width: '100%', padding: '10px 16px', borderRadius: 8, background: '#ef4444',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
                opacity: !scanInput || loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Scanning...' : '🔍 Lookup'}
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700 }}>Item Details</h3>

            {scannedItem ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>SKU</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>
                    {scannedItem.sku}
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Item Name</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#4b5563' }}>
                    {scannedItem.itemName}
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Location</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: 14, color: '#4b5563' }}>
                    {scannedItem.location}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Quantity</p>
                  <p style={{ margin: '6px 0 0 0', fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
                    {scannedItem.quantity}
                  </p>
                </div>

                <button
                  onClick={handleInwardAction}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 6, background: '#22c55e',
                    color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12,
                    fontWeight: 600, opacity: loading ? 0.6 : 1,
                  }}
                >
                  📥 Inward
                </button>
              </>
            ) : (
              <div style={{
                background: '#f9fafb', borderRadius: 8, padding: 20, textAlign: 'center',
                color: '#94a3b8', fontSize: 13,
              }}>
                Scan a barcode to see item details
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 2 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>
                  Timestamp
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>
                  SKU
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>
                  Item Name
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              {scanHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                    No scan history
                  </td>
                </tr>
              ) : (
                scanHistory.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>{item.timestamp}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#1f2937' }}>
                      {item.sku}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#4b5563' }}>{item.itemName}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1f2937' }}>
                      {item.quantity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
