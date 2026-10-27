import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { publicRfqApi } from '../../api/publicRfqApi';

export default function VendorQuotationPage() {
  const { rfqId } = useParams();
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('vendor');
  const token = searchParams.get('token');

  const [rfq, setRfq] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [validUntil, setValidUntil] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [rfqId, vendorId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch RFQ details using public API
      const rfqRes = await publicRfqApi.getById(rfqId);
      const rfqData = rfqRes.data;
      
      // Check if vendor is authorized for this RFQ
      const isAuthorized = rfqData.vendors.some(v => v._id === vendorId);
      if (!isAuthorized) {
        setError('आप इस RFQ के लिए authorized नहीं हैं।');
        return;
      }

      // Check if quotation already submitted
      const existingQuote = rfqData.quotations?.find(q => q.vendor._id === vendorId);
      if (existingQuote) {
        setError('आपने पहले से ही इस RFQ के लिए quotation submit कर दिया है।');
        return;
      }

      // Find vendor details from RFQ vendors list
      const vendorData = rfqData.vendors.find(v => v._id === vendorId);
      
      setRfq(rfqData);
      setVendor(vendorData);
      
      // Initialize items with RFQ items
      setItems(rfqData.items.map(item => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        unitPrice: '',
        deliveryDays: ''
      })));
      
    } catch (err) {
      setError(err.message || 'Data load करने में error हुई।');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (items.some(item => !item.unitPrice)) {
      setError('कृपया सभी items के लिए unit price भरें।');
      return;
    }

    if (!validUntil) {
      setError('कृपया quotation की validity date भरें।');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await publicRfqApi.addQuotation(rfqId, {
        vendor: vendorId,
        items: items.map(item => ({
          name: item.name,
          qty: parseFloat(item.qty),
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.qty) * parseFloat(item.unitPrice),
          deliveryDays: parseInt(item.deliveryDays) || 0
        })),
        totalAmount: calculateTotal(),
        validUntil,
        remarks: remarks.trim()
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Quotation submit करने में error हुई।');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '40px', 
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '40px', 
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <div style={{ fontSize: '18px', color: '#e74c3c', marginBottom: '10px' }}>Error</div>
          <div style={{ color: '#666' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '40px', 
          borderRadius: '12px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <div style={{ fontSize: '24px', color: '#27ae60', marginBottom: '10px', fontWeight: 'bold' }}>
            Quotation Submitted Successfully!
          </div>
          <div style={{ color: '#666', marginBottom: '20px' }}>
            आपका quotation successfully submit हो गया है। Manufacturing ERP team आपसे जल्दी contact करेगी।
          </div>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px',
            fontSize: '14px',
            color: '#666'
          }}>
            <strong>RFQ ID:</strong> {rfq?.rfqId}<br/>
            <strong>Company:</strong> {vendor?.companyName}<br/>
            <strong>Total Amount:</strong> ₹{calculateTotal().toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '1000px', 
        margin: '0 auto',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          color: '#fff',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
            Vendor Quotation Portal
          </h1>
          <div style={{ fontSize: '16px', opacity: 0.9 }}>
            Manufacturing ERP - Request for Quotation
          </div>
        </div>

        {/* RFQ Info */}
        <div style={{ 
          padding: '30px',
          borderBottom: '1px solid #eee'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                RFQ ID
              </label>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                {rfq?.rfqId}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                RFQ Title
              </label>
              <div style={{ fontSize: '16px', color: '#2c3e50' }}>
                {rfq?.title}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                Due Date
              </label>
              <div style={{ fontSize: '16px', color: '#e74c3c', fontWeight: 'bold' }}>
                {rfq?.dueDate ? new Date(rfq.dueDate).toLocaleDateString('en-IN') : '—'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                Your Company
              </label>
              <div style={{ fontSize: '16px', color: '#2c3e50' }}>
                {vendor?.companyName}
              </div>
            </div>
          </div>
        </div>

        {/* Quotation Form */}
        <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
          {error && (
            <div style={{ 
              background: '#fee2e2', 
              border: '1px solid #fecaca', 
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Items Table */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: '#2c3e50' }}>Items & Pricing</h3>
            <div style={{ 
              overflowX: 'auto',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '700px'
              }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                      Item Name
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                      Quantity
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                      Unit
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                      Unit Price (₹) *
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>
                      Delivery Days
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>
                      Total (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '12px', fontWeight: '600' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {item.qty}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {item.unit}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '14px'
                          }}
                          required
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          placeholder="7"
                          value={item.deliveryDays}
                          onChange={(e) => updateItem(index, 'deliveryDays', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            textAlign: 'center',
                            fontSize: '14px'
                          }}
                        />
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#2c3e50'
                      }}>
                        ₹{((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                    <td colSpan={5} style={{ 
                      padding: '15px', 
                      textAlign: 'right',
                      fontSize: '16px'
                    }}>
                      Total Amount:
                    </td>
                    <td style={{ 
                      padding: '15px', 
                      textAlign: 'right',
                      fontSize: '18px',
                      color: '#e74c3c',
                      fontWeight: 'bold'
                    }}>
                      ₹{calculateTotal().toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Additional Details */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#2c3e50'
              }}>
                Valid Until *
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#2c3e50'
              }}>
                Remarks / Terms
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Delivery terms, payment conditions, etc."
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? '#95a5a6' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: '#fff',
                border: 'none',
                padding: '15px 40px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}