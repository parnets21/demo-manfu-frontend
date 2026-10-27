import { useState, useEffect } from 'react';
import inventoryApi from '../api/inventoryApi';

export const useInventoryData = () => {
  const [stockData, setStockData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [ageingData, setAgeingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth token from storage
  const getAuthToken = () => {
    return localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');
  };

  // Create axios instance with auth header
  const getAxiosConfig = () => {
    const token = getAuthToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  };

  // Fetch all data from backend
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const config = getAxiosConfig();
      const [stockRes, whRes, movRes, batchRes, ageRes] = await Promise.all([
        inventoryApi.getAllInventoryData(),
        inventoryApi.getAllWarehousesData(),
        inventoryApi.getAllMovementsData(),
        inventoryApi.getAllBatchesData(),
        inventoryApi.getAgeingStockData()
      ]);

      setStockData(stockRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      setMovements(movRes.data.data || []);
      setBatches(batchRes.data.data || []);
      setAgeingData(ageRes.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new inventory item and refresh data
  const addInventoryItem = async (data) => {
    try {
      await inventoryApi.createInventoryData(data);
      await fetchAllData(); // Refresh data
      return { success: true };
    } catch (err) {
      console.error('Error creating inventory:', err);
      return { success: false, error: err.message };
    }
  };

  // Create new warehouse and refresh data
  const addWarehouse = async (data) => {
    try {
      await inventoryApi.createWarehouseData(data);
      await fetchAllData(); // Refresh data
      return { success: true };
    } catch (err) {
      console.error('Error creating warehouse:', err);
      return { success: false, error: err.message };
    }
  };

  // Create new movement and refresh data
  const addMovement = async (data) => {
    try {
      await inventoryApi.createMovementData(data);
      await fetchAllData(); // Refresh data
      return { success: true };
    } catch (err) {
      console.error('Error creating movement:', err);
      return { success: false, error: err.message };
    }
  };

  // Create new batch and refresh data
  const addBatch = async (data) => {
    try {
      console.log('Sending batch data:', data);
      await inventoryApi.createBatchData(data);
      await fetchAllData(); // Refresh data
      return { success: true };
    } catch (err) {
      console.error('Error creating batch:', err);
      console.error('Error response:', err.response?.data);
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  return {
    stockData,
    warehouses,
    movements,
    batches,
    ageingData,
    loading,
    error,
    fetchAllData,
    addInventoryItem,
    addWarehouse,
    addMovement,
    addBatch
  };
};

export default useInventoryData;
