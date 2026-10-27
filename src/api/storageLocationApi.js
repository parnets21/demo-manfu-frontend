const BASE = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://demo-manfu-backened.onrender.com/api');

const getToken = () =>
  localStorage.getItem('chakra_token') || sessionStorage.getItem('chakra_token');

export const getStorageLocations = async () => {
  const res = await fetch(`${BASE}/inventory-data/storage`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch storage locations');
  return data;
};
