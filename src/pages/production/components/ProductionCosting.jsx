import { useState, useEffect } from 'react';
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md';

export default function ProductionCosting() {
  const [costingData, setCostingData] = useState([
    {
      id: 'WO001',
      product: 'Product A',
      quantity: 100,
      unit: 'Nos',
      materialCost: 50000,
      laborCost: 15000,
      overheadCost: 8000,
      totalCost: 73000,
      costPerUnit: 730,
      status: 'Completed',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'WO002',
      product: 'Product B',
      quantity: 250,
      unit: 'Nos',
      materialCost: 125000,
      laborCost: 35000,
      overheadCost: 18000,
      totalCost: 178000,
      costPerUnit: 712,
      status: 'In Progress',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'WO003',
      product: 'Product C',
      quantity: 150,
      unit: 'Nos',
      materialCost: 75000,
      laborCost: 22000,
      overheadCost: 12000,
      totalCost: 109000,
      costPerUnit: 727,
      status: 'Completed',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredData = filterStatus 
    ? costingData.filter(d => d.status === filterStatus)
    : costingData;

  const stats = {
    totalCost: costingData.reduce((sum, d) => sum + d.totalCost, 0),
    avgCostPerUnit: Math.round(costingData.reduce((sum, d) => sum + d.costPerUnit, 0) / costingData.length),
    totalMaterial: costingData.reduce((sum, d) => sum + d.materialCost, 0),
    totalLabor: costingData.reduce((sum, d) => sum + d.laborCost, 0),
    totalOverhead: costingData.reduce((sum, d) => sum + d.overheadCost, 0)
  };

  const getCostBreakdown = (order) => {
    const total = order.totalCost;
    return {
      material: Math.round((order.materialCost / total) * 100),
      labor: Math.round((order.laborCost / total) * 100),
      overhead: Math.round((order.overheadCost / total) * 100)
    };
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>TOTAL PRODUCTION COST</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>₹{Math.round(stats.totalCost).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{costingData.length} work orders</div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>AVG COST PER UNIT</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>₹{stats.avgCostPerUnit}</div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>MATERIAL COST</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>₹{Math.round(stats.totalMaterial).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {Math.round((stats.totalMaterial / stats.totalCost) * 100)}% of total
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>LABOR COST</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>₹{Math.round(stats.totalLabor).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {Math.round((stats.totalLabor / stats.totalCost) * 100)}% of total
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>OVERHEAD COST</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>₹{Math.round(stats.totalOverhead).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {Math.round((stats.totalOverhead / stats.totalCost) * 100)}% of total
          </div>
        </div>
      </div>

      {/* Filter */}
      <div>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Status</option>
          <option>In Progress</option>
          <option>Completed</option>
          <option>On Hold</option>
        </select>
      </div>

      {/* Cost Breakdown Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
          Production Cost Breakdown
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>WO ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>PRODUCT</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>QTY</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>MATERIAL</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>LABOR</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>OVERHEAD</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>TOTAL COST</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#64748b', fontSize: 11 }}>COST/UNIT</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(order)}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>{order.id}</td>
                  <td style={{ padding: '12px' }}>{order.product}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{order.quantity} {order.unit}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{order.materialCost.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{order.laborCost.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>₹{order.overheadCost.toLocaleString()}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                    ₹{order.totalCost.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{order.costPerUnit}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: order.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                      color: order.status === 'Completed' ? '#166534' : '#92400e',
                      fontSize: 11,
                      fontWeight: 600
                    }}>
                      {order.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Breakdown Chart */}
      {selectedOrder && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
            Cost Breakdown: {selectedOrder.id} - {selectedOrder.product}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Pie Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 200, height: 200, marginBottom: 16 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="30" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#2563eb" strokeWidth="30"
                    strokeDasharray={`${getCostBreakdown(selectedOrder).material * 2.83} 283`}
                    transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="30"
                    strokeDasharray={`${getCostBreakdown(selectedOrder).labor * 2.83} 283`}
                    strokeDashoffset={-getCostBreakdown(selectedOrder).material * 2.83}
                    transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#8b5cf6" strokeWidth="30"
                    strokeDasharray={`${getCostBreakdown(selectedOrder).overhead * 2.83} 283`}
                    strokeDashoffset={-(getCostBreakdown(selectedOrder).material + getCostBreakdown(selectedOrder).labor) * 2.83}
                    transform="rotate(-90 50 50)" />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>₹{selectedOrder.totalCost.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Total Cost</div>
                </div>
              </div>
            </div>

            {/* Cost Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: '#dbeafe', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#0c4a6e', fontWeight: 600, marginBottom: 4 }}>MATERIAL COST</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb', marginBottom: 4 }}>
                  ₹{selectedOrder.materialCost.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: '#0c4a6e' }}>
                  {getCostBreakdown(selectedOrder).material}% of total
                </div>
              </div>

              <div style={{ padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>LABOR COST</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                  ₹{selectedOrder.laborCost.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: '#92400e' }}>
                  {getCostBreakdown(selectedOrder).labor}% of total
                </div>
              </div>

              <div style={{ padding: 12, background: '#f3e8ff', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#6b21a8', fontWeight: 600, marginBottom: 4 }}>OVERHEAD COST</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#8b5cf6', marginBottom: 4 }}>
                  ₹{selectedOrder.overheadCost.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: '#6b21a8' }}>
                  {getCostBreakdown(selectedOrder).overhead}% of total
                </div>
              </div>

              <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 600, marginBottom: 4 }}>COST PER UNIT</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>
                  ₹{selectedOrder.costPerUnit}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
