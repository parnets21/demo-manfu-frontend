import { useState, useCallback } from 'react';
import {
  createWorkOrderFromOEM,
  getWorkOrders,
  getWorkOrderById,
  validateInventory,
  reserveMaterials,
  approveWorkOrder,
  startProduction,
  updateProducedQty,
  completeWorkOrder,
  holdWorkOrder,
  cancelWorkOrder,
  consumeMaterials,
  getWorkOrderSummary
} from '../api/workOrderApi';

export const useWorkOrder = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  // Fetch all work orders
  const fetchWorkOrders = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWorkOrders(filters);
      setWorkOrders(response.data || []);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error fetching work orders');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single work order
  const fetchWorkOrderById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWorkOrderById(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error fetching work order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create work order from OEM
  const createFromOEM = useCallback(async (oemOrderId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await createWorkOrderFromOEM(oemOrderId);
      await fetchWorkOrders();
      return response.data;
    } catch (err) {
      setError(err.message || 'Error creating work order');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchWorkOrders]);

  // Validate inventory
  const validate = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await validateInventory(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error validating inventory');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reserve materials
  const reserve = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await reserveMaterials(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error reserving materials');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve work order
  const approve = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await approveWorkOrder(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error approving work order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start production
  const start = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await startProduction(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error starting production');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update produced quantity
  const updateProduced = useCallback(async (id, produced) => {
    try {
      setLoading(true);
      setError(null);
      const response = await updateProducedQty(id, produced);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error updating production');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Complete work order
  const complete = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await completeWorkOrder(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error completing work order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Hold work order
  const hold = useCallback(async (id, remarks) => {
    try {
      setLoading(true);
      setError(null);
      const response = await holdWorkOrder(id, remarks);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error holding work order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel work order
  const cancel = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await cancelWorkOrder(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error cancelling work order');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Consume materials
  const consume = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await consumeMaterials(id);
      setSelectedWorkOrder(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error consuming materials');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get summary
  const getSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWorkOrderSummary();
      setSummary(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'Error fetching summary');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    workOrders,
    selectedWorkOrder,
    loading,
    error,
    summary,
    fetchWorkOrders,
    fetchWorkOrderById,
    createFromOEM,
    validate,
    reserve,
    approve,
    start,
    updateProduced,
    complete,
    hold,
    cancel,
    consume,
    getSummary,
    setSelectedWorkOrder
  };
};
