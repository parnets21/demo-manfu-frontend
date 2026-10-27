                gap: 8,
                }}
              >
                <MdDelete size={16} />
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <MdEdit size={16} />
                Edit Warehouse
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  ...btnOutline,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
  etterSpacing: '0.05em', marginBottom: 6 }}>
                Active SKUs
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: TEXT_DARK }}>
                {selectedWarehouse.skus ?? 0}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleEdit}
                style={{
                  flex: 1,
                  ...btnPrimary,
                  display: ity) * 100) > 70 ? AMBER : GREEN) : TEXT_LIGHT,
                      borderRadius: 5,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* SKUs count */}
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: RADIUS_SM, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', lkground: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${selectedWarehouse.capacity > 0 ? Math.round((selectedWarehouse.used / selectedWarehouse.capacity) * 100) : 0}%`,
                      background: selectedWarehouse.capacity > 0 ? (Math.round((selectedWarehouse.used / selectedWarehouse.capacity) * 100) > 85 ? RED_LIGHT : Math.round((selectedWarehouse.used / selectedWarehouse.capac     color: selectedWarehouse.capacity > 0 ? (Math.round((selectedWarehouse.used / selectedWarehouse.capacity) * 100) > 85 ? RED_LIGHT : Math.round((selectedWarehouse.used / selectedWarehouse.capacity) * 100) > 70 ? AMBER : GREEN) : TEXT_LIGHT,
                    }}
                  >
                    {selectedWarehouse.capacity > 0 ? Math.round((selectedWarehouse.used / selectedWarehouse.capacity) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 10, bac       </div>
                  <div style={{ fontSize: 10, color: TEXT_LIGHT, marginTop: 2 }}>units</div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11.5, color: TEXT_MID, fontWeight: 600 }}>Usage</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                           {(selectedWarehouse.capacity || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_LIGHT, marginTop: 2 }}>units</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, marginBottom: 4 }}>Currently Used</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK }}>
                    {(selectedWarehouse.used || 0).toLocaleString()}
           ing: 16, borderRadius: RADIUS_SM, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_DARK, marginBottom: 12 }}>Capacity Status</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, marginBottom: 4 }}>Total Capacity</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: TEXT_DARK }}>
          nBottom: 20 }}>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Address
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK, lineHeight: 1.5 }}>
                  {selectedWarehouse.address}
                </div>
              </div>
            )}

            {/* Capacity section */}
            <div style={{ background: '#f8fafc', paddTEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Phone
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>
                  {selectedWarehouse.phone || '—'}
                </div>
              </div>
            </div>

            {/* Address */}
            {selectedWarehouse.address && (
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: RADIUS_SM, margi           <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Type
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>
                  {selectedWarehouse.type || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: RADIUS_SM }}>
                <div style={{ fontSize: 11, color: dding: 14, borderRadius: RADIUS_SM }}>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Manager
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>
                  {selectedWarehouse.manager || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: RADIUS_SM }}>
           <div style={{ background: '#f8fafc', padding: 14, borderRadius: RADIUS_SM }}>
                <div style={{ fontSize: 11, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  Location
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>
                  {selectedWarehouse.location || '—'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', pa2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                }}
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        iv>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  background: '#f1f5f9',
                  color: TEXT_MID,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.             alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                  }}
                >
                  <MdWarehouse size={28} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK }}>{selectedWarehouse.name}</div>
                  <div style={{ fontSize: 12, color: TEXT_LIGHT, marginTop: 2 }}>{selectedWarehouse.warehouseId || selectedWarehouse.id}</div>
                </ddth: 500 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: GRADIENTS[selectedWarehouse.index % GRADIENTS.length],
                    display: 'flex',
                   <div style={{ fontSize: 10.5, color: TEXT_LIGHT, fontWeight: 500 }}>
                      {(wh.used || 0).toLocaleString()} / {(wh.capacity || 0).toLocaleString()} units
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for warehouse details */}
      {showModal && selectedWarehouse && (
        <Modal onClose={() => setShowModal(false)}>
          <div style={{ width: '100%', maxWi       </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: barColor,
                          borderRadius: 3,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
        arginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: TEXT_MID, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Capacity
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: barColor }}>
                        {pct}%
                      </span>
                 <div>
                      <div style={{ fontSize: 10.5, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        Status
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: statusColor }}>
                        {statusText}
                      </div>
                    </div>
                  </div>

                  {/* Capacity section */}
                  <div style={{ mottom: 14, paddingBottom: 14, borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        SKUs
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_DARK }}>
                        {wh.skus ?? 0}
                      </div>
                    </div>
                ze: 10.5, color: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        Manager
                      </div>
                      <div style={{ fontSize: 12.5, color: TEXT_DARK, fontWeight: 600 }}>
                        {wh.manager}
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBcolor: TEXT_LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      Location
                    </div>
                    <div style={{ fontSize: 12.5, color: TEXT_DARK, fontWeight: 600 }}>
                      {wh.location || '—'}
                    </div>
                  </div>

                  {/* Manager */}
                  {wh.manager && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSidiv style={{ fontSize: 14, fontWeight: 800, color: TEXT_DARK, lineHeight: 1.3 }}>
                        {wh.name}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT_LIGHT, marginTop: 3, fontWeight: 500 }}>
                        {wh.warehouseId || wh.id}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5,       borderRadius: 10,
                        flexShrink: 0,
                        background: GRADIENTS[i % GRADIENTS.length],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                      }}
                    >
                      <MdWarehouse size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <                width: '100%',
                  }}
                />

                {/* Content */}
                <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Header with icon and name */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                  )';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#e8edf2';
                }}
              >
                {/* Top colored bar */}
                <div
                  style={{
                    height: 4,
                    background: barColor,
     border: '1px solid #e8edf2',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,23,42,0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px* 100) : 0;
            const barColor = pct > 85 ? RED_LIGHT : pct > 70 ? AMBER : GREEN;
            const statusText = pct > 85 ? 'Critical' : pct > 70 ? 'Warning' : 'Healthy';
            const statusColor = pct > 85 ? RED_LIGHT : pct > 70 ? AMBER : GREEN;

            return (
              <div
                key={wh._id || i}
                onClick={() => handleCardClick(wh, i)}
                style={{
                  background: '#fff',
                  borderRadius: RADIUS_SM + 4,
                 RK }}>All Warehouses Overview</div>
          <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', fontSize: 11.5, fontWeight: 700, color: TEXT_MID }}>
            {warehouseList.length} locations
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12, background: '#fafbfc', padding: 12 }}>
          {warehouseList.map((wh, i) => {
            const pct = wh.capacity > 0 ? Math.round((wh.used / wh.capacity) iew</div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: TEXT_LIGHT, fontSize: 13 }}>
          No warehouses yet. Click '+ Add Warehouse' to create one.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ ...card(), overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DAdow.confirm(`Delete warehouse ${selectedWarehouse.name}?`)) {
      onDeleteWarehouse?.(selectedWarehouse._id);
      setShowModal(false);
    }
  };

  const handleEdit = () => {
    onEditWarehouse?.(selectedWarehouse);
    setShowModal(false);
  };

  if (warehouseList.length === 0) {
    return (
      <div style={{ ...card(), overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: BORDER }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_DARK }}>All Warehouses OvervLIGHT, background: 'transparent', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };

export default function WarehouseOverviewCard({ warehouseList = [], onSelectWarehouse, onDeleteWarehouse, onEditWarehouse }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const handleCardClick = (wh, index) => {
    setSelectedWarehouse({ ...wh, index });
    setShowModal(true);
  };

  const handleDelete = () => {
    if (win35deg,#b45309,#f59e0b)',
];

const card = (x = {}) => ({ background: BG_CARD, border: BORDER, borderRadius: RADIUS_LG, boxShadow: SHADOW, ...x });
const btnPrimary = { padding: '8px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#1e40af)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(185,28,28,0.3)' };
const btnOutline = { padding: '8px 18px', borderRadius: 10, border: `1.5px solid ${RED_LIGHT}`, color: RED_st BORDER = '1px solid #e8edf2';
const RADIUS_LG = 18;
const RADIUS_SM = 8;
const SHADOW = '0 2px 12px rgba(15,23,42,0.06)';
const RED_LIGHT = '#ef4444';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';
const TEXT_DARK = '#0f172a';
const TEXT_MID = '#475569';
const TEXT_LIGHT = '#94a3b8';

const GRADIENTS = [
  'linear-gradient(135deg,#1e40af,#e74c3c)',
  'linear-gradient(135deg,#7c3aed,#a855f7)',
  'linear-gradient(135deg,#0369a1,#3b82f6)',
  'linear-gradient(135deg,#047857,#10b981)',
  'linear-gradient(1Delete, MdClose } from 'react-icons/md';
import Modal from '../common/Modal';

const BG_CARD = '#ffffff';
conehouse, MdEdit, Mdimport { useState } from 'react';
import { MdWar