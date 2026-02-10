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
export const getContainerAdditionals = (id) => api.get(`/containers/${id}/additionals`);
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

// Planning
export const getHistoricalData = () => api.get('/planning/historical');
export const getPlanningForecast = (doors = 8) => api.get(`/planning/forecast?doors=${doors}`);

// Inventory
export const getInventory = () => api.get('/inventory');
export const getContainersByProduct = () => api.get('/inventory/containers');
export const getRestockPlan = (doors = 8) => api.get(`/inventory/restock-plan?doors=${doors}`);
export const updateMinStock = (sku, minStock) => api.put(`/inventory/${sku}/min-stock`, { min_stock: minStock });
export const getProductPositions = (sku) => api.get(`/inventory/${sku}/positions`);
export const getAllProducts = () => api.get('/inventory/products');
export const createProduct = (data) => api.post('/inventory/products', data);

// Warehouse
export const getWarehouseZones = () => api.get('/warehouse/zones');
export const getWarehouseMap = () => api.get('/warehouse/map');

// Transit Planning & Restock Predictions
export const getTransitRoutes = () => api.get('/planning/transit-routes');
export const getRestockPredictions = () => api.get('/planning/restock-predictions');
export const getRestockTimeline = (days = 30) => api.get(`/planning/restock-timeline?days=${days}`);

// Supply Chain Planning (Integrated: Origin → CEDIS → End Client)
export const getSupplyChainPlan = () => api.get('/planning/supply-chain');
export const getSkuSupplyChainPlan = (sku) => api.get(`/planning/supply-chain/${encodeURIComponent(sku)}`);
export const getDistributionOrders = () => api.get('/planning/distribution-orders');
export const getActionItems = () => api.get('/planning/action-items');

// End Client Inventory (Walmart, Costco, etc.)
export const getEndClientsList = () => api.get('/inventory/end-clients');
export const getEndClientInventory = (clientName) => api.get(`/inventory/end-clients/${encodeURIComponent(clientName)}`);
export const getEndClientSummary = (clientName) => api.get(`/inventory/end-clients/${encodeURIComponent(clientName)}/summary`);
export const getEndClientsOverview = () => api.get('/inventory/end-clients-overview');

// Appointments
export const getAppointments = (date, status) => {
  let url = '/appointments';
  const params = [];
  if (date) params.push(`date=${date}`);
  if (status) params.push(`status=${status}`);
  if (params.length) url += '?' + params.join('&');
  return api.get(url);
};
export const createAppointment = (data) => {
  const params = new URLSearchParams(data).toString();
  return api.post(`/appointments?${params}`);
};
export const updateAppointmentStatus = (id, status) => api.put(`/appointments/${id}/status?new_status=${status}`);
export const getDoorRecommendation = (appointmentId) => api.get(`/appointments/${appointmentId}/door-recommendation`);

export default api;
