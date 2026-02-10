import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('transmodal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('transmodal_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboard = () => api.get('/dashboard');

// Containers
export const getContainers = () => api.get('/containers');
export const getContainer = (id) => api.get(`/containers/${id}`);
export const getContainerTracking = (id) => api.get(`/containers/${id}/tracking`);
export const getContainerLocations = () => api.get('/containers/locations/all');

// Orders
export const getOrders = () => api.get('/orders');
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post('/orders', data);
export const uploadDocument = (orderId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/orders/${orderId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Additionals
export const getAdditionals = () => api.get('/additionals');
export const approveAdditional = (id) => api.put(`/additionals/${id}/approve`);
export const rejectAdditional = (id) => api.put(`/additionals/${id}/reject`);

// Account Statement
export const getAccountStatement = () => api.get('/account-statement');

export default api;
