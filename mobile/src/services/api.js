import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
  // fallback: local dev IP when no .env is set, production Railway URL otherwise
  (__DEV__ ? 'http://192.168.2.27:3000/api' : 'https://champ-backend.up.railway.app/api');

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  updatePushToken: (expo_push_token) => api.patch('/auth/push-token', { expo_push_token }),
};

// Users
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  shifts: (id) => api.get(`/users/${id}/shifts`),
  pending: () => api.get('/users/pending'),
  approve: (id) => api.patch(`/users/${id}/approve`),
  reject: (id) => api.patch(`/users/${id}/reject`),
};

// Clients
export const clientsAPI = {
  list: () => api.get('/clients'),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  rates: (id) => api.get(`/clients/${id}/rates`),
  updateRates: (id, rates) => api.put(`/clients/${id}/rates`, { rates }),
  invoices: (id) => api.get(`/clients/${id}/invoices`),
};

// Shifts
export const shiftsAPI = {
  list: (params) => api.get('/shifts', { params }),
  get: (id) => api.get(`/shifts/${id}`),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  bulkApprove: (shift_ids) => api.post('/shifts/bulk-approve', { shift_ids }),
  confirm: (id) => api.patch(`/shifts/${id}/confirm`),
  available: () => api.get('/shifts/available'),
  claim: (id) => api.post(`/shifts/${id}/claim`),
};

// Availability
export const availabilityAPI = {
  get: (employee_id, week_start) => api.get('/availability', { params: { employee_id, week_start } }),
  set: (data) => api.post('/availability', data),
};

// Pay Periods
export const payPeriodsAPI = {
  list: () => api.get('/pay-periods'),
  current: () => api.get('/pay-periods/current'),
  get: (id) => api.get(`/pay-periods/${id}`),
  create: (data) => api.post('/pay-periods', data),
  close: (id) => api.patch(`/pay-periods/${id}/close`),
};

// Payroll
export const payrollAPI = {
  list: (pay_period_id) => api.get('/payroll', { params: { pay_period_id } }),
  calculate: (pay_period_id) => api.get(`/payroll/calculate/${pay_period_id}`),
  save: (data) => api.post('/payroll', data),
  generatePaystubs: (pay_period_id) => api.post(`/payroll/generate-paystubs/${pay_period_id}`),
  myPaystubs: () => api.get('/payroll/my-paystubs'),
  exportSummary: (pay_period_id) => api.get(`/payroll/export/${pay_period_id}`),
};

// Invoices
export const invoicesAPI = {
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  preview: (week_start) => api.get(`/invoices/preview/${week_start}`),
  generate: (client_id, week_start) => api.post('/invoices/generate', { client_id, week_start }),
  generateAll: (week_start) => api.post('/invoices/generate-all', { week_start }),
  updateStatus: (id, status) => api.patch(`/invoices/${id}/status`, { status }),
};

// Dashboard
export const dashboardAPI = {
  admin: () => api.get('/dashboard/admin'),
  employee: () => api.get('/dashboard/employee'),
  client: () => api.get('/dashboard/client'),
};

export default api;
