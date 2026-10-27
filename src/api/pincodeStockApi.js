const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'http://localhost:5000/api');

const getToken = () =>
  localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

export const getPincodeStock = async () => {
  try {
    const res = await fetch(`${BASE}/inventory-data/pincode`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.status === 401) {
      console.warn('Unauthorized: Token invalid or expired. Redirecting to login...');
      localStorage.removeItem('chakra_token');
      sessionStorage.removeItem('chakra_token');
      window.location.href = '/login?expired=true';
      return { success: false, data: [], message: 'Session expired' };
    }

    const data = await res.json();
    console.log('Raw API response:', data);
    return {
      success: data.success === true,
      data: Array.isArray(data.data) ? data.data : [],
      message: data.message || ''
    };
  } catch (error) {
    console.error('Error fetching pincode stock:', error);
    return { success: false, data: [] };
  }
};
