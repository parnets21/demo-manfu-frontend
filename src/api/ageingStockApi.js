import { api } from './axiosConfig';

export const getAgeingStock = async () => {
  try {
    // api.get() directly returns the parsed JSON body: { success, data: [...] }
    const response = await api.get('/inventory-data/ageing');
    return response;
  } catch (error) {
    console.error('Error fetching ageing stock:', error);
    return { success: false, data: [] };
  }
};
