import { useState, useEffect } from 'react';
import inventoryApi from '../../api/inventoryApi';

const StockMovementHistory = ({ sku, onClose }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMovementHistory();
  }, [sku, filter]);

  const fetchMovementHistory = async () => {
    try {
      setLoading(true);
      // Fetch all movements from backend
      const res = await inventoryApi.getAllMovementsData();
      let data = res.data.data || [];
      
      // Filter by SKU if provided
      if (sku) {
        data = data.filter(m => m.sku === sku);
      }
      
      // Filter by type if not 'all'
      if (filter !== 'all') {
        data = data.filter(m => m.type?.toLowerCase() === filter.toLowerCase());
      }
      
      setMovements(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching movement history:', err);
      setError('Failed to load movement history');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'inward': return '📥';
      case 'outward': return '📤';
      case 'transfer': return '⇄';
      case 'adjustment': return '🔧';
      case 'return': return '↩️';
      default: return '📦';
    }
  };

  const getMovementColor = (type) => {
    switch (type) {
      case 'inward': return '#22c55e';
      case 'outward': return '#ef4444';
      case 'transfer': return '#3b82f6';
      case 'adjustment': return '#f59e0b';
      case 'return': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}>
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24,
          maxWidth: 600, width: '90%', textAlign: 'center',
        }}>
          <div style={{ color: '#94a3b8' }}>Loading movement history...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      overflowY: 'auto',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        maxWidth: 700, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        margin: '20px auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Stock Movement History</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* SKU info */}
        <div style={{
          background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 20,
          fontSize: 12, color: '#475569', fontFamily: 'monospace',
        }}>
          SKU: {sku}
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'inward', 'outward', 'transfer', 'adjustment'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: filter === f ? 'none' : '1px solid #e2e8f0',
                background: filter === f ? '#3b82f6' : '#fff',
                color: filter === f ? '#fff' : '#475569',
                cursor: 'pointer',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: 12, marginBottom: 20,
            fontSize: 12, color: '#dc2626',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Movements list */}
        {movements.length === 0 ? (
          <div style={{
            background: '#f0fdf4', border: '1px solid #86efac',
            borderRadius: 8, padding: 20, textAlign: 'center',
            fontSize: 13, color: '#22c55e',
          }}>
            No movements found
          </div>
        ) : (
          <div style={{
            border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 400,
            overflowY: 'auto', background: '#f8fafc',
          }}>
            {movements.map((movement, i) => {
              const color = getMovementColor(movement.type);
              return (
                <div key={i} style={{
                  padding: '14px 16px', borderBottom: i < movements.length - 1 ? '1px solid #e2e8f0' : 'none',
                  borderLeft: `4px solid ${color}`,
                  background: i % 2 === 0 ? '#fff' : '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>
                      {getMovementIcon(movement.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <strong style={{ color: '#1f2937', textTransform: 'capitalize' }}>
                          {movement.type}
                        </strong>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {new Date(movement.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                        Qty: <strong>{movement.quantity}</strong> | Location: <strong>{movement.location}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Ref: {movement.reference}
                      </div>
                      {movement.grnId && (
                        <div style={{ fontSize: 11 }}>
                          <a href={`#/procurement/grn/${movement.grnId}`} style={{
                            color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace',
                            cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            display: 'inline-block',
                          }}>
                            GRN: {movement.grnId}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockMovementHistory;
              