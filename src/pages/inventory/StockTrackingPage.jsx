import { useState, useEffect } from 'react';
import { inventoryApi } from '../../api/inventoryApi';
import PageHeader from '../../components/common/PageHeader';
import PageShell from '../../components/common/PageShell';

export default function StockTrackingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchSKU: '',
    stockType: 'all',
    warehouse: 'all',
    location: 'all',
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchStock();
    else if (activeTab === 1) fetchWarehouseView();
    else if (activeTab === 2) fetchLocationView();
  }, [activeTab, filters]);

  const fetchWarehouses = async () => {
    try {
      const response = await inventoryApi.getWarehouses();
      setWarehouses(response.data);
      if (response.data.length > 0) {
        setSelectedWarehouse(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.searchSKU) params.sku = filters.searchSKU;
      if (filters.stockType !== 'all') params.type = filters.stockType;
      if (filters.warehouse !== 'all') params.warehouse = filters.warehouse;

      const response = await inventoryApi.getAllStock(params);
      setStock(response.data);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouseView = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getStockByWarehouse(selectedWarehouse);
      setStock(response.data);
    } catch (error) {
      console.error('Failed to fetch warehouse stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationView = async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getLocationsByWarehouse(selectedWarehouse);
      setStock(response.data);
    } catch (error) {
      console.error('Failed to fetch location stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockTypeColor = (type) => {
    const colors = {
      available: '#22c55e',
      reserved: '#f59e0b',
      damaged: '#ef4444',
      expired: '#8b5cf6',
      transit: '#3b82f6',
    };
    return colors[type] || '#6b7280';
  };

  const getStockTypeLabel = (type) => {
    const labels = {
      available: '✓ Available',
      reserved: '⏳ Reserved',
      damaged: '✗ Damaged',
      expired: '⚠ Expired',
      transit: '→ In Transit',
    };
    return labels[type] || type;
  };

  return (
    <PageShell>
      <PageHeader
        title="Stock Tracking"
        subtitle="Real-time inventory across warehouses and locations"
        action={
          <button style={{
            padding: '8px 16px', borderRadius: 8, background: '#ef4444',
            color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600,
          }}>
            📊 Export Report
          </button>
        }
      />

      <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 16px', color:'#475569', marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Where stock comes from and where it is stored</div>
        <div style={{ fontSize:12.5, lineHeight:1.6 }}>
          Stock is created by inward movements such as purchase receipts, goods receipt notes, and supplier deliveries. Once received, inventory is recorded into the warehouse and, if used, into specific locations inside that warehouse.
          This page shows the current stock status by SKU, warehouse and location. Available stock is ready for sale, reserved stock is held for orders, and damaged or expired stock is not usable.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
        {['SKU View', 'Warehouse View', 'Location View'].map((tab, i) => (
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

      {/* SKU View */}
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
              value={filters.stockType}
              onChange={(e) => setFilters({ ...filters, stockType: e.target.value })}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              <option value="all">All Stock Types</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="damaged">Damaged</option>
              <option value="expired">Expired</option>
              <option value="transit">In Transit</option>
            </select>
            <select
              value={filters.warehouse}
              onChange={(e) => setFilters({ ...filters, warehouse: e.target.value })}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Stock Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>SKU</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Item Name</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Available</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Reserved</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Damaged</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Expired</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Total</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>GRN Reference</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td>
                    </tr>
                  ) : stock.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No stock found</td>
                    </tr>
                  ) : (
                    stock.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', hover: { background: '#f9fafb' } }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{item.sku}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{item.itemName}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#22c55e' }}>{item.available || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>{item.reserved || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#ef4444' }}>{item.damaged || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#8b5cf6' }}>{item.expired || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#1f2937' }}>{item.total || 0}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {item.grnId ? (
                            <a href={`#/procurement/grn/${item.grnId}`} style={{
                              color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontFamily: 'monospace',
                              cursor: 'pointer', padding: '3px 8px', borderRadius: 6,
                              background: '#eff6ff', border: '1px solid #bfdbfe',
                              display: 'inline-block',
                            }}>
                              {item.grnId}
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', padding: '4px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                            background: item.available > 0 ? '#dcfce7' : '#fee2e2',
                            color: item.available > 0 ? '#166534' : '#991b1b',
                          }}>
                            {item.available > 0 ? '✓ In Stock' : '✗ Out'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse View */}
      {activeTab === 1 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginRight: 12 }}>Select Warehouse:</label>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Warehouse Stock Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {stock.map((item, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>SKU</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 14, fontWeight: 700, color: '#1f2937' }}>{item.sku}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Item</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#4b5563' }}>{item.itemName}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: '#f0fdf4', padding: 8, borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#166534', fontWeight: 600 }}>Available</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 700, color: '#22c55e' }}>{item.available || 0}</p>
                  </div>
                  <div style={{ background: '#fef2f2', padding: 8, borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#991b1b', fontWeight: 600 }}>Reserved</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 700, color: '#ef4444' }}>{item.reserved || 0}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#fef3c7', padding: 8, borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#92400e', fontWeight: 600 }}>Damaged</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>{item.damaged || 0}</p>
                  </div>
                  <div style={{ background: '#f3e8ff', padding: 8, borderRadius: 6 }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b21a8', fontWeight: 600 }}>Expired</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 16, fontWeight: 700, color: '#8b5cf6' }}>{item.expired || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Location View */}
      {activeTab === 2 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginRight: 12 }}>Select Warehouse:</label>
            <select
              value={selectedWarehouse || ''}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              style={{
                padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb',
                fontSize: 14, fontFamily: 'inherit',
              }}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Location Stock Table */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Location</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Zone</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Total Items</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Capacity Used</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td>
                    </tr>
                  ) : stock.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No locations found</td>
                    </tr>
                  ) : (
                    stock.map((loc, i) => {
                      const capacityPercent = (loc.usedCapacity / loc.totalCapacity) * 100;
                      let statusColor = '#22c55e';
                      let statusText = 'Normal';
                      if (capacityPercent >= 90) {
                        statusColor = '#ef4444';
                        statusText = 'Critical';
                      } else if (capacityPercent >= 80) {
                        statusColor = '#f59e0b';
                        statusText = 'Warning';
                      }

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{loc.name}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#4b5563' }}>{loc.zone}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{loc.totalItems || 0}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                              <div style={{
                                width: 60, height: 6, background: '#e5e7eb', borderRadius: 3,
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${capacityPercent}%`, height: '100%',
                                  background: statusColor, transition: 'width 0.3s',
                                }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                                {capacityPercent.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '4px 8px', borderRadius: 4,
                              fontSize: 11, fontWeight: 600,
                              background: statusColor + '20',
                              color: statusColor,
                            }}>
                              {statusText}
                            </span>
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
    </PageShell>
  );
}