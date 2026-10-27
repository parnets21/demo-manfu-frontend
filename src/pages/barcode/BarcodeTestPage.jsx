import { useState } from 'react';
import barcodeActions from '../../utils/barcodeActions';
import PageHeader from '../../components/common/PageHeader';
import PageShell from '../../components/common/PageShell';

export default function BarcodeTestPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Test data
  const testData = {
    sku: 'SKU-1042',
    batchId: 'B-2024-04',
    quantity: 10,
    barcodeValue: 'BC-SKU1042-001',
    location: 'WH-01/Rack-A3',
    toLocation: 'WH-02/Rack-B1',
  };

  const handleTest = async (testName, testFn) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await testFn();
      setResult({
        name: testName,
        success: response.success,
        message: response.message,
        data: response.success ? response : response.error,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Barcode Actions Test"
        subtitle="Test all barcode functionality"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {['Generate', 'Scan', 'Movements', 'Print'].map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === i ? '2px solid #ef4444' : 'none',
              color: activeTab === i ? '#ef4444' : '#6b7280',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          color: '#dc2626',
          fontSize: 13,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Result Alert */}
      {result && (
        <div style={{
          background: result.success ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${result.success ? '#86efac' : '#fecaca'}`,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          color: result.success ? '#16a34a' : '#dc2626',
          fontSize: 13,
        }}>
          {result.success ? '✓' : '✗'} {result.message}
          {result.data && (
            <pre style={{ marginTop: 8, fontSize: 12, overflow: 'auto' }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div style={{ background: '#f9fafb', borderRadius: 8, padding: 24 }}>
        {activeTab === 0 && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Generate Barcode</h3>
            <button
              onClick={() => handleTest('Generate', () => barcodeActions.generate(testData))}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Testing...' : 'Test Generate'}
            </button>
          </div>
        )}
        {activeTab === 1 && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Scan Barcode</h3>
            <button
              onClick={() => handleTest('Scan', () => barcodeActions.scan(testData.barcodeValue))}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Testing...' : 'Test Scan'}
            </button>
          </div>
        )}
        {activeTab === 2 && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Track Movements</h3>
            <button
              onClick={() => handleTest('Movements', () => barcodeActions.trackMovements(testData.barcodeValue))}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Testing...' : 'Test Movements'}
            </button>
          </div>
        )}
        {activeTab === 3 && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Print Barcode</h3>
            <button
              onClick={() => handleTest('Print', () => barcodeActions.print(testData.barcodeValue))}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Testing...' : 'Test Print'}
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
