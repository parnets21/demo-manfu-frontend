import { useState } from 'react';
import Modal from '../../../components/common/Modal';
import { MdCamera, MdCheckCircle, MdDelete, MdAdd } from 'react-icons/md';

export default function PODCapture() {
  const [deliveries, setDeliveries] = useState([
    {
      id: 'DEL001',
      orderId: 'ORD-2024-001',
      customer: 'ABC Corporation',
      address: '123 Business Park, Bangalore',
      status: 'Delivered',
      deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      podStatus: 'Captured',
      signature: true,
      photos: 2
    },
    {
      id: 'DEL002',
      orderId: 'ORD-2024-002',
      customer: 'XYZ Industries',
      address: '456 Industrial Area, Bangalore',
      status: 'Pending',
      deliveryDate: null,
      podStatus: 'Pending',
      signature: false,
      photos: 0
    }
  ]);

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showPODModal, setShowPODModal] = useState(false);
  const [podData, setPodData] = useState({
    signature: null,
    photos: [],
    notes: '',
    recipientName: '',
    recipientPhone: ''
  });
  const [capturing, setCapturing] = useState(false);

  const handleCapturePOD = (delivery) => {
    setSelectedDelivery(delivery);
    setPodData({
      signature: null,
      photos: [],
      notes: '',
      recipientName: '',
      recipientPhone: ''
    });
    setShowPODModal(true);
  };

  const handleAddPhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPodData(prev => ({
          ...prev,
          photos: [...prev.photos, { id: Date.now(), src: event.target?.result, name: file.name }]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (photoId) => {
    setPodData(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId)
    }));
  };

  const handleSavePOD = async () => {
    if (!podData.recipientName.trim()) {
      alert('Please enter recipient name');
      return;
    }
    if (!podData.signature && podData.photos.length === 0) {
      alert('Please capture signature or at least one photo');
      return;
    }

    setCapturing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      setDeliveries(prev => prev.map(d => 
        d.id === selectedDelivery.id 
          ? { ...d, status: 'Delivered', podStatus: 'Captured', signature: !!podData.signature, photos: podData.photos.length }
          : d
      ));

      setShowPODModal(false);
      alert('POD captured successfully!');
    } catch (e) {
      alert(e.message);
    } finally {
      setCapturing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered': return { bg: '#dcfce7', color: '#166534' };
      case 'Pending': return { bg: '#fef3c7', color: '#92400e' };
      case 'Failed': return { bg: '#fee2e2', color: '#991b1b' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getPODStatusColor = (status) => {
    switch (status) {
      case 'Captured': return { bg: '#dcfce7', color: '#166534' };
      case 'Pending': return { bg: '#fef3c7', color: '#92400e' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>TOTAL DELIVERIES</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{deliveries.length}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>POD CAPTURED</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
            {deliveries.filter(d => d.podStatus === 'Captured').length}
          </div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>PENDING POD</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>
            {deliveries.filter(d => d.podStatus === 'Pending').length}
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
          Delivery POD Status
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>DELIVERY ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>ORDER ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>CUSTOMER</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>STATUS</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#64748b', fontSize: 11 }}>POD STATUS</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>SIGNATURE</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>PHOTOS</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#64748b', fontSize: 11 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => {
                const statusColor = getStatusColor(delivery.status);
                const podStatusColor = getPODStatusColor(delivery.podStatus);
                return (
                  <tr key={delivery.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>{delivery.id}</td>
                    <td style={{ padding: '12px' }}>{delivery.orderId}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{delivery.customer}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{delivery.address}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: statusColor.bg,
                        color: statusColor.color,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {delivery.status}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: podStatusColor.bg,
                        color: podStatusColor.color,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {delivery.podStatus}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {delivery.signature ? (
                        <MdCheckCircle size={18} style={{ color: '#16a34a' }} />
                      ) : (
                        <div style={{ color: '#94a3b8' }}>—</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                      {delivery.photos > 0 ? (
                        <div style={{ color: 'var(--primary)' }}>{delivery.photos}</div>
                      ) : (
                        <div style={{ color: '#94a3b8' }}>—</div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {delivery.podStatus === 'Pending' ? (
                        <button className="btn btn-sm btn-primary" onClick={() => handleCapturePOD(delivery)} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }}>
                          <MdCamera size={14} /> Capture
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline" onClick={() => handleCapturePOD(delivery)}>
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POD Capture Modal */}
      <Modal open={showPODModal} onClose={() => setShowPODModal(false)} title="Capture Proof of Delivery" size="lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowPODModal(false)} disabled={capturing}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSavePOD} disabled={capturing}>
              {capturing ? 'Saving...' : 'Save POD'}
            </button>
          </>
        }>
        {selectedDelivery && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Delivery Info */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>DELIVERY ID</div>
                  <div style={{ fontWeight: 600 }}>{selectedDelivery.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>ORDER ID</div>
                  <div style={{ fontWeight: 600 }}>{selectedDelivery.orderId}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>CUSTOMER</div>
                  <div style={{ fontWeight: 600 }}>{selectedDelivery.customer}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selectedDelivery.address}</div>
                </div>
              </div>
            </div>

            {/* Recipient Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Recipient Name *</label>
                <input type="text" className="form-input" value={podData.recipientName}
                  onChange={e => setPodData({ ...podData, recipientName: e.target.value })}
                  placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Recipient Phone</label>
                <input type="tel" className="form-input" value={podData.recipientPhone}
                  onChange={e => setPodData({ ...podData, recipientPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  placeholder="10-digit number" />
              </div>
            </div>

            {/* Signature Capture */}
            <div className="form-group">
              <label className="form-label">Signature *</label>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 8,
                padding: 24,
                textAlign: 'center',
                background: '#f8fafc',
                minHeight: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {podData.signature ? (
                  <div style={{ textAlign: 'center' }}>
                    <img src={podData.signature} alt="Signature" style={{ maxHeight: 120, marginBottom: 8 }} />
                    <button className="btn btn-sm btn-outline" onClick={() => setPodData({ ...podData, signature: null })}>
                      Clear
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Signature Pad</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                      (Signature capture would be implemented with a canvas library)
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => setPodData({ ...podData, signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' })}>
                      Capture Signature
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Photo Upload */}
            <div className="form-group">
              <label className="form-label">Photos</label>
              <div style={{
                border: '2px dashed #cbd5e1',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                background: '#f8fafc',
                cursor: 'pointer'
              }}>
                <input type="file" accept="image/*" onChange={handleAddPhoto} style={{ display: 'none' }} id="photo-input" />
                <label htmlFor="photo-input" style={{ cursor: 'pointer', display: 'block' }}>
                  <MdCamera size={24} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Click to upload photo</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>or drag and drop</div>
                </label>
              </div>

              {podData.photos.length > 0 && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                  {podData.photos.map(photo => (
                    <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#f1f5f9' }}>
                      <img src={photo.src} alt="POD" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      <button className="btn btn-sm" style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        background: '#dc2626',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 4
                      }} onClick={() => handleRemovePhoto(photo.id)}>
                        <MdDelete size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Delivery Notes</label>
              <textarea className="form-input" rows={3} value={podData.notes}
                onChange={e => setPodData({ ...podData, notes: e.target.value })}
                placeholder="Any special notes about the delivery..." />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
