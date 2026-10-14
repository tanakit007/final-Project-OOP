import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginAPI = (data) => API.post('/auth/login', data);
export const registerAPI = (data) => API.post('/auth/register', data);

export const createHouseAPI = (data) => API.post('/houses/create', data);
export const joinHouseAPI = (data) => API.post('/houses/join', data);
export const getMyHouseAPI = () => API.get('/houses/my-house');

export const createExpenseAPI = (data) => API.post('/expenses', data);
export const getExpensesAPI = () => API.get('/expenses');
export const submitPaymentProofAPI = (expenseId, file) => {
  const data = new FormData();
  data.append('file', file);
  return API.post(`/expenses/${expenseId}/payment-proof`, data);
};
export const confirmPaymentAPI = (expenseId, memberId) => (
  API.post(`/expenses/${expenseId}/payment-proof/${memberId}/confirm`)
);
export const requestPaymentReplacementAPI = (expenseId, memberId, reason) => (
  API.post(`/expenses/${expenseId}/payment-proof/${memberId}/request-replacement`, { reason })
);
export const getPaymentProofAPI = (expenseId, memberId) => (
  API.get(`/expenses/${expenseId}/payment-proof/${memberId}`, { responseType: 'blob' })
);

// --- Duty APIs ---
export const createDutyAPI = (data) => API.post('/duties', data);
export const getDutiesAPI = () => API.get('/duties');
export const toggleDutyAPI = (dutyId) => API.patch(`/duties/${dutyId}/toggle`);

export default API;