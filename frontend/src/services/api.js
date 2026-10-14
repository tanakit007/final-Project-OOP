import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// ใส่ JWT Token อัตโนมัติทุกครั้งที่มีการร้องขอ API
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

export default API;