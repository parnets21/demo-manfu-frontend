import { useState, useEffect } from 'react';
import inventoryApi from '../../api/inventoryApi';
import PageHeader from '../../components/common/PageHeader';
import PageShell from '../../components/common/PageShell';
import Pagination from '../../components/common/Pagination';

export default function BatchTrackingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [batches, setBatches] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    searchSKU: '',
    status: 'all',
    expiryDays: 30,
  });
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (activeTab === 0) fetchBatches();
    else if (activeTab === 1) fetchExpiringBatches();
  }, [activeTab, filters]);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.searchSKU) params.sku = filters.searchSKU;
      if (filters.status !== 'all') params.status = filters.status;

      const response = await inventoryApi.getAllBatches(params);
      setBatches(response.data);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringBatches = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getExpiringBatches(filters.expiryDays);
      setExpiringBatches(response.data);
    } catch (error) {
      console.error('Failed to fetch expiring batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (daysUntilExpiry) => {
    if (daysUntilExpiry < 0) return { status: 'Expired', color: '#dc2626', bg: '#fee2e2' };
    if (daysUntilExpiry <= 7) return { status: 'Critical', color: '#dc2626', bg: '#fee2e2' };
    if (daysUntilExpiry <= 30) return { status: 'Warning', color: '#ea580c', bg: '#fed7aa' };
    if (daysUntilExpiry <= 60) return { status: 'Caution', color: '#d97706', bg: '#fef3c7' };
    return { status: 'Good', color: '#16a34a', bg: '#dcfce7' };
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: { bg: '#dcfce7', color: '#166534' },
      inactive: { bg: '#f3f4f6', color: '#4b5563' },
      expired: { bg: '#fee2e2', color: '#991b1b' },
      damaged: { bg: '#fed7aa', color: '#92400e' },
    };
    return colors[status] || colors.inactive;
  };

  return (
    <PageShell>
      <PageHeader
        title="Batch & Expiry Tracking"
        subtitle="Monitor batch inventory and expiry dates"
        action={
          <button style={{
            padding: '8px 16px', borderRadius: 8, background: '#ef4444',
            color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            📊 Export Report
          </button>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {['All Batches', 'Expiring Soon', 'Batch Details'].map((tab, i) => (
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

      {/* All Batches Tab */}
      {activeTab === 0 && (
        <div>
          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Search SKU..."
              value={filters.searchSKU}
              onChange={(e) => setFilters({ ...filters, searchSKU: e.target.value })}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          {/* Batches Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Batch ID</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>SKU</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Item Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Quantity</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Mfg Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Expiry Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Days Left</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>GRN Reference</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No batches found</td>
                    </tr>
                  ) : (
                    batches.slice((page-1)*pageSize, page*pageSize).map((batch, i) => {
                      const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                      const expiryStatus = getExpiryStatus(daysLeft);
                      const statusBadge = getStatusBadge(batch.status);

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                            <button
                              onClick={() => {
                                setSelectedBatch(batch);
                                setShowModal(true);
                              }}
                              style={{
                                background: 'none', border: 'none', color: '#ef4444',
                                cursor: 'pointer', fontWeight: 600, textDecoration: 'underline',
                              }}
                            >
                              {batch.batchId}
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{batch.sku}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{batch.itemName}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{batch.quantity}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{new Date(batch.mfgDate).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: expiryStatus.color }}>
                            {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12 }}>
                            {batch.grnId ? (
                              <a href={`#/procurement/grn/${batch.grnId}`} style={{
                                color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace',
                                cursor: 'pointer', padding: '3px 8px', borderRadius: 6,
                                background: '#eff6ff', border: '1px solid #bfdbfe',
                                display: 'inline-block',
                              }}>
                                {batch.grnId}
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '4px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 600,
                              background: statusBadge.bg,
                              color: statusBadge.color,
                            }}>
                              {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button style={{
                              padding: '4px 8px', borderRadius: 4, background: '#f3f4f6',
                              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              color: '#4b5563',
                            }}>
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Soon Tab */}
      {activeTab === 1 && (
        <div>
          {/* Filter */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginRight: 12 }}>Expiring within:</label>
            <select
              value={filters.expiryDays}
              onChange={(e) => setFilters({ ...filters, expiryDays: parseInt(e.target.value) })}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          {/* Expiring Batches Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {expiringBatches.map((batch, i) => {
              const daysLeft = getDaysUntilExpiry(batch.expiryDate);
              const expiryStatus = getExpiryStatus(daysLeft);

              return (
                <div key={i} style={{
                  background: '#fff', borderRadius: 12, border: `2px solid ${expiryStatus.color}`,
                  padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'start',
                    marginBottom: 12,
                  }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Batch ID</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{batch.batchId}</p>
                    </div>
                    <span style={{
                      display: 'inline-block', padding: '4px 8px', borderRadius: 4,
                      fontSize: 11, fontWeight: 600,
                      background: expiryStatus.bg,
                      color: expiryStatus.color,
                    }}>
                      {expiryStatus.status}
                    </span>
                  </div>

                  <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>SKU / Item</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{batch.sku}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#4b5563' }}>{batch.itemName}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Quantity</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{batch.quantity}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Days Left</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 700, color: expiryStatus.color }}>
                        {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Mfg Date</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#4b5563' }}>{new Date(batch.mfgDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Expiry Date</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: 12, color: expiryStatus.color, fontWeight: 600 }}>
                        {new Date(batch.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{
                      flex: 1, padding: '8px 12px', borderRadius: 6, background: '#ef4444',
                      color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}>
                      🔄 Reorder
                    </button>
                    <button style={{
                      flex: 1, padding: '8px 12px', borderRadius: 6, background: '#f3f4f6',
                      color: '#4b5563', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}>
                      📋 Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {expiringBatches.length === 0 && !loading && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
              padding: 20, textAlign: 'center', color: '#22c55e',
            }}>
              ✓ No batches expiring soon
            </div>
          )}
        </div>
      )}

      {/* Batch Details Modal */}
      {showModal && selectedBatch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24,
            maxWidth: 600, width: '90%', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Batch Details</h2>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
              }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Batch ID</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{selectedBatch.batchId}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>SKU</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{selectedBatch.sku}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Item Name</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#4b5563' }}>{selectedBatch.itemName}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Quantity</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{selectedBatch.quantity}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Mfg Date</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, color: '#4b5563' }}>{new Date(selectedBatch.mfgDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Expiry Date</p>
                <p style={{ margin: '8px 0 0 0', fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                  {new Date(selectedBatch.expiryDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, background: '#ef4444',
                color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
              }}>
                🔄 Reorder
              </button>
              <button style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, background: '#f3f4f6',
                color: '#4b5563', border: 'none', cursor: 'pointer', fontWeight: 600,
              }}
              onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}