import React, { useState, useEffect } from 'react';
import { corporateClientApi } from '../../api/corporateClientApi';

const DataFlowTestPage = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [testClient, setTestClient] = useState(null);

  const testClientData = {
    name: "Test Integration Company Pvt Ltd",
    contact: "Test Manager",
    phone: "9999999999",
    email: "test@integration.com",
    tier: "Gold",
    creditLimit: 100000,
    gstNumber: "27AABCT1234H1Z5",
    panNumber: "AABCT1234H",
    paymentTerms: "Net 30",
    discountPercentage: 5,
    status: "Active",
    address: {
      street: "Test Street 123",
      area: "Test Area",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      country: "India"
    },
    billingAddress: {
      street: "Test Street 123",
      area: "Test Area", 
      city: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      country: "India"
    },
    shippingAddress: {
      street: "Test Street 123",
      area: "Test Area",
      city: "Pune", 
      state: "Maharashtra",
      pincode: "411001",
      country: "India"
    }
  };

  const runIntegrationTest = async () => {
    setLoading(true);
    setTestResults({});

    try {
      // Step 1: Create Corporate Client
      console.log('Step 1: Creating corporate client...');
      const createResponse = await corporateClientApi.create(testClientData);
      
      if (!createResponse.success) {
        throw new Error('Failed to create corporate client');
      }

      setTestClient(createResponse.data);
      setTestResults(prev => ({
        ...prev,
        corporateClient: {
          success: true,
          message: 'Corporate client created successfully',
          data: createResponse.data
        }
      }));

      // Step 2: Check Integration Status
      console.log('Step 2: Checking integration status...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for integration

      const integrationResponse = await corporateClientApi.getIntegrationStatus(createResponse.data._id);
      
      setTestResults(prev => ({
        ...prev,
        integration: {
          success: integrationResponse.success,
          message: integrationResponse.success ? 'Integration status retrieved' : 'Failed to get integration status',
          data: integrationResponse
        }
      }));

      // Step 3: Test Quotation Module
      console.log('Step 3: Testing quotation module...');
      try {
        const quotationResponse = await fetch(`${import.meta.env.VITE_API_URL}/quotation-clients/corporate/${createResponse.data._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token')}`
          }
        });
        const quotationData = await quotationResponse.json();
        
        setTestResults(prev => ({
          ...prev,
          quotation: {
            success: quotationData.success,
            message: quotationData.success ? 'Quotation client found' : 'Quotation client not found',
            data: quotationData.data
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          quotation: {
            success: false,
            message: 'Quotation module test failed: ' + error.message
          }
        }));
      }

      // Step 4: Test Invoice Module
      console.log('Step 4: Testing invoice module...');
      try {
        const invoiceResponse = await fetch(`${import.meta.env.VITE_API_URL}/invoice-clients/corporate/${createResponse.data._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token')}`
          }
        });
        const invoiceData = await invoiceResponse.json();
        
        setTestResults(prev => ({
          ...prev,
          invoice: {
            success: invoiceData.success,
            message: invoiceData.success ? 'Invoice client found' : 'Invoice client not found',
            data: invoiceData.data
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          invoice: {
            success: false,
            message: 'Invoice module test failed: ' + error.message
          }
        }));
      }

      // Step 5: Test Accounts Module
      console.log('Step 5: Testing accounts module...');
      try {
        const accountsResponse = await fetch(`${import.meta.env.VITE_API_URL}/accounts-ledgers/corporate/${createResponse.data._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token')}`
          }
        });
        const accountsData = await accountsResponse.json();
        
        setTestResults(prev => ({
          ...prev,
          accounts: {
            success: accountsData.success,
            message: accountsData.success ? 'Accounts ledger found' : 'Accounts ledger not found',
            data: accountsData.data
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          accounts: {
            success: false,
            message: 'Accounts module test failed: ' + error.message
          }
        }));
      }

      // Step 6: Test Dispatch Module
      console.log('Step 6: Testing dispatch module...');
      try {
        const dispatchResponse = await fetch(`${import.meta.env.VITE_API_URL}/dispatch-clients/corporate/${createResponse.data._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token')}`
          }
        });
        const dispatchData = await dispatchResponse.json();
        
        setTestResults(prev => ({
          ...prev,
          dispatch: {
            success: dispatchData.success,
            message: dispatchData.success ? 'Dispatch client found' : 'Dispatch client not found',
            data: dispatchData.data
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          dispatch: {
            success: false,
            message: 'Dispatch module test failed: ' + error.message
          }
        }));
      }

      // Step 7: Test Tally Sync
      console.log('Step 7: Testing Tally sync...');
      try {
        const tallyResponse = await corporateClientApi.syncWithTally(createResponse.data._id);
        
        setTestResults(prev => ({
          ...prev,
          tally: {
            success: tallyResponse.success,
            message: tallyResponse.success ? 'Tally sync completed' : 'Tally sync failed',
            data: tallyResponse.data
          }
        }));
      } catch (error) {
        setTestResults(prev => ({
          ...prev,
          tally: {
            success: false,
            message: 'Tally sync test failed: ' + error.message
          }
        }));
      }

    } catch (error) {
      console.error('Integration test failed:', error);
      setTestResults(prev => ({
        ...prev,
        error: {
          success: false,
          message: 'Integration test failed: ' + error.message
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const cleanupTestData = async () => {
    if (!testClient) return;
    
    try {
      await corporateClientApi.delete(testClient._id);
      setTestClient(null);
      setTestResults({});
      alert('Test data cleaned up successfully');
    } catch (error) {
      alert('Failed to cleanup test data: ' + error.message);
    }
  };

  const getStatusIcon = (success) => {
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dynamic Data Flow Integration Test</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This test verifies that corporate client data flows properly to all integrated modules:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Corporate Client Creation</li>
            <li>Quotation Module Integration</li>
            <li>Invoice Module Integration (GST Compliance)</li>
            <li>Accounts Ledger Creation</li>
            <li>Dispatch Client Setup</li>
            <li>Tally Sync Integration</li>
          </ul>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={runIntegrationTest}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running Test...' : 'Run Integration Test'}
          </button>
          
          {testClient && (
            <button
              onClick={cleanupTestData}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Cleanup Test Data
            </button>
          )}
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
            
            {/* Corporate Client */}
            {testResults.corporateClient && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.corporateClient.success)}</span>
                  <h3 className="font-semibold">Corporate Client Creation</h3>
                </div>
                <p className={getStatusColor(testResults.corporateClient.success)}>
                  {testResults.corporateClient.message}
                </p>
                {testResults.corporateClient.data && (
                  <div className="mt-2 text-sm text-gray-600">
                    Client ID: {testResults.corporateClient.data.clientId} | 
                    Name: {testResults.corporateClient.data.name}
                  </div>
                )}
              </div>
            )}

            {/* Integration Status */}
            {testResults.integration && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.integration.success)}</span>
                  <h3 className="font-semibold">Integration Status Check</h3>
                </div>
                <p className={getStatusColor(testResults.integration.success)}>
                  {testResults.integration.message}
                </p>
                {testResults.integration.data?.integrationStatus && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(testResults.integration.data.integrationStatus).map(([module, status]) => (
                      <span
                        key={module}
                        className={`px-2 py-1 text-xs rounded-full ${
                          status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {module}: {status ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quotation Module */}
            {testResults.quotation && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.quotation.success)}</span>
                  <h3 className="font-semibold">Quotation Module</h3>
                </div>
                <p className={getStatusColor(testResults.quotation.success)}>
                  {testResults.quotation.message}
                </p>
                {testResults.quotation.data && (
                  <div className="mt-2 text-sm text-gray-600">
                    Client Code: {testResults.quotation.data.clientCode} | 
                    GST: {testResults.quotation.data.gstNumber} |
                    Tax Type: {testResults.quotation.data.taxType}
                  </div>
                )}
              </div>
            )}

            {/* Invoice Module */}
            {testResults.invoice && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.invoice.success)}</span>
                  <h3 className="font-semibold">Invoice Module (GST Billing)</h3>
                </div>
                <p className={getStatusColor(testResults.invoice.success)}>
                  {testResults.invoice.message}
                </p>
                {testResults.invoice.data && (
                  <div className="mt-2 text-sm text-gray-600">
                    GST Compliant: {testResults.invoice.data.gstCompliant ? 'Yes' : 'No'} | 
                    State Code: {testResults.invoice.data.billingAddress?.stateCode} |
                    PAN: {testResults.invoice.data.panNumber}
                  </div>
                )}
              </div>
            )}

            {/* Accounts Module */}
            {testResults.accounts && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.accounts.success)}</span>
                  <h3 className="font-semibold">Accounts Ledger</h3>
                </div>
                <p className={getStatusColor(testResults.accounts.success)}>
                  {testResults.accounts.message}
                </p>
                {testResults.accounts.data && (
                  <div className="mt-2 text-sm text-gray-600">
                    Ledger Code: {testResults.accounts.data.ledgerCode} | 
                    Type: {testResults.accounts.data.ledgerType} |
                    Tally ID: {testResults.accounts.data.tallyLedgerId}
                  </div>
                )}
              </div>
            )}

            {/* Dispatch Module */}
            {testResults.dispatch && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.dispatch.success)}</span>
                  <h3 className="font-semibold">Dispatch Module</h3>
                </div>
                <p className={getStatusColor(testResults.dispatch.success)}>
                  {testResults.dispatch.message}
                </p>
                {testResults.dispatch.data && (
                  <div className="mt-2 text-sm text-gray-600">
                    Delivery Address: {testResults.dispatch.data.deliveryAddress?.city}, {testResults.dispatch.data.deliveryAddress?.pincode} | 
                    Service Type: {testResults.dispatch.data.logisticsInfo?.serviceType}
                  </div>
                )}
              </div>
            )}

            {/* Tally Sync */}
            {testResults.tally && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getStatusIcon(testResults.tally.success)}</span>
                  <h3 className="font-semibold">Tally Sync</h3>
                </div>
                <p className={getStatusColor(testResults.tally.success)}>
                  {testResults.tally.message}
                </p>
              </div>
            )}

            {/* Error */}
            {testResults.error && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">❌</span>
                  <h3 className="font-semibold text-red-800">Test Error</h3>
                </div>
                <p className="text-red-600">{testResults.error.message}</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Running integration test...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataFlowTestPage;