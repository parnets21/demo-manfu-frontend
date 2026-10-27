import React, { useState, useEffect } from 'react';
import { corporateClientApi } from '../../api/corporateClientApi';

const CorporateClientForm = ({ client = null, onSave, onCancel, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: '',
    gstNumber: '',
    panNumber: '',
    tier: 'Silver',
    creditLimit: 0,
    paymentTerms: 'Net 30',
    discountPercentage: 0,
    status: 'Active',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    billingAddress: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    shippingAddress: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState(null);

  useEffect(() => {
    if (client) {
      setFormData({
        ...client,
        address: client.address || formData.address,
        billingAddress: client.billingAddress || client.address || formData.billingAddress,
        shippingAddress: client.shippingAddress || client.address || formData.shippingAddress
      });
      
      // Load integration status for existing clients
      if (mode === 'edit') {
        loadIntegrationStatus(client._id);
      }
    }
  }, [client, mode]);

  const loadIntegrationStatus = async (clientId) => {
    try {
      const response = await corporateClientApi.getIntegrationStatus(clientId);
      if (response.success) {
        setIntegrationStatus(response);
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name?.trim()) newErrors.name = 'Company name is required';
    if (!formData.contact?.trim()) newErrors.contact = 'Contact person is required';
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.tier) newErrors.tier = 'Tier is required';

    // Phone validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // GST validation
    if (formData.gstNumber && !corporateClientApi.validateGST(formData.gstNumber)) {
      newErrors.gstNumber = 'Invalid GST number format';
    }

    // PAN validation
    if (formData.panNumber && !corporateClientApi.validatePAN(formData.panNumber)) {
      newErrors.panNumber = 'Invalid PAN number format';
    }

    // Credit limit validation
    if (formData.creditLimit < 0) {
      newErrors.creditLimit = 'Credit limit cannot be negative';
    }

    // Discount validation
    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      newErrors.discountPercentage = 'Discount must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleAddressChange = (addressType, field, value) => {
    setFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }));
  };

  const handleSameAsBillingChange = (checked) => {
    setSameAsBilling(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: { ...prev.billingAddress }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const clientData = corporateClientApi.formatClientData(formData);
      
      let response;
      if (mode === 'create') {
        response = await corporateClientApi.create(clientData);
      } else {
        response = await corporateClientApi.update(client._id, clientData);
      }

      if (response.success) {
        onSave(response.data, response.dataFlow);
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithTally = async () => {
    if (!client?._id) return;
    
    setLoading(true);
    try {
      const response = await corporateClientApi.syncWithTally(client._id);
      if (response.success) {
        await loadIntegrationStatus(client._id);
        alert('Sync with Tally completed successfully!');
      }
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const errorClass = "text-red-500 text-sm mt-1";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Create Corporate Client' : 'Edit Corporate Client'}
        </h2>
        {integrationStatus && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Integration Status:</span>
            <div className="flex gap-1">
              {Object.entries(integrationStatus.integrationStatus || {}).map(([key, status]) => (
                <span
                  key={key}
                  className={`px-2 py-1 text-xs rounded ${
                    status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Company Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={inputClass}
              placeholder="Enter company name"
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          <div>
            <label className={labelClass}>Contact Person *</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              className={inputClass}
              placeholder="Enter contact person name"
            />
            {errors.contact && <p className={errorClass}>{errors.contact}</p>}
          </div>

          <div>
            <label className={labelClass}>Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={inputClass}
              placeholder="Enter 10-digit phone number"
            />
            {errors.phone && <p className={errorClass}>{errors.phone}</p>}
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={inputClass}
              placeholder="Enter email address"
            />
            {errors.email && <p className={errorClass}>{errors.email}</p>}
          </div>

          <div>
            <label className={labelClass}>GST Number</label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
              className={inputClass}
              placeholder="Enter GST number"
              maxLength={15}
            />
            {errors.gstNumber && <p className={errorClass}>{errors.gstNumber}</p>}
          </div>

          <div>
            <label className={labelClass}>PAN Number</label>
            <input
              type="text"
              value={formData.panNumber}
              onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
              className={inputClass}
              placeholder="Enter PAN number"
              maxLength={10}
            />
            {errors.panNumber && <p className={errorClass}>{errors.panNumber}</p>}
          </div>

          <div>
            <label className={labelClass}>Tier *</label>
            <select
              value={formData.tier}
              onChange={(e) => handleInputChange('tier', e.target.value)}
              className={inputClass}
            >
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
            {errors.tier && <p className={errorClass}>{errors.tier}</p>}
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className={inputClass}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
              <option value="Blacklisted">Blacklisted</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Credit Limit (₹)</label>
            <input
              type="number"
              value={formData.creditLimit}
              onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="Enter credit limit"
              min="0"
            />
            {errors.creditLimit && <p className={errorClass}>{errors.creditLimit}</p>}
          </div>

          <div>
            <label className={labelClass}>Payment Terms</label>
            <select
              value={formData.paymentTerms}
              onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
              className={inputClass}
            >
              <option value="Immediate">Immediate</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Discount Percentage (%)</label>
            <input
              type="number"
              value={formData.discountPercentage}
              onChange={(e) => handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="Enter discount percentage"
              min="0"
              max="100"
              step="0.1"
            />
            {errors.discountPercentage && <p className={errorClass}>{errors.discountPercentage}</p>}
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
          
          {/* Billing Address */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Billing Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Street</label>
                <input
                  type="text"
                  value={formData.billingAddress.street}
                  onChange={(e) => handleAddressChange('billingAddress', 'street', e.target.value)}
                  className={inputClass}
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className={labelClass}>Area</label>
                <input
                  type="text"
                  value={formData.billingAddress.area}
                  onChange={(e) => handleAddressChange('billingAddress', 'area', e.target.value)}
                  className={inputClass}
                  placeholder="Enter area"
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={formData.billingAddress.city}
                  onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                  className={inputClass}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={formData.billingAddress.state}
                  onChange={(e) => handleAddressChange('billingAddress', 'state', e.target.value)}
                  className={inputClass}
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input
                  type="text"
                  value={formData.billingAddress.pincode}
                  onChange={(e) => handleAddressChange('billingAddress', 'pincode', e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  value={formData.billingAddress.country}
                  onChange={(e) => handleAddressChange('billingAddress', 'country', e.target.value)}
                  className={inputClass}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-medium text-gray-700">Shipping Address</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => handleSameAsBillingChange(e.target.checked)}
                  className="mr-2"
                />
                Same as billing address
              </label>
            </div>
            
            {!sameAsBilling && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Street</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.street}
                    onChange={(e) => handleAddressChange('shippingAddress', 'street', e.target.value)}
                    className={inputClass}
                    placeholder="Enter street address"
                  />
                </div>
                <div>
                  <label className={labelClass}>Area</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.area}
                    onChange={(e) => handleAddressChange('shippingAddress', 'area', e.target.value)}
                    className={inputClass}
                    placeholder="Enter area"
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.city}
                    onChange={(e) => handleAddressChange('shippingAddress', 'city', e.target.value)}
                    className={inputClass}
                    placeholder="Enter city"
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.state}
                    onChange={(e) => handleAddressChange('shippingAddress', 'state', e.target.value)}
                    className={inputClass}
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <label className={labelClass}>Pincode</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.pincode}
                    onChange={(e) => handleAddressChange('shippingAddress', 'pincode', e.target.value.replace(/\D/g, ''))}
                    className={inputClass}
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    type="text"
                    value={formData.shippingAddress.country}
                    onChange={(e) => handleAddressChange('shippingAddress', 'country', e.target.value)}
                    className={inputClass}
                    placeholder="Enter country"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="flex gap-2">
            {mode === 'edit' && client && (
              <button
                type="button"
                onClick={handleSyncWithTally}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Sync with Tally
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create Client' : 'Update Client'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CorporateClientForm;