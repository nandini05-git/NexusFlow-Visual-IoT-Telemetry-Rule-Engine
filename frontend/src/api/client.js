import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios interceptor to attach Bearer token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexusflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API Calls
export const registerUser = async (userData) => {
  const response = await client.post('/api/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await client.post('/api/auth/login', credentials);
  return response.data;
};

export const getMeProfile = async () => {
  const response = await client.get('/api/auth/me');
  return response.data;
};

// System & Telemetry API Calls
export const checkHealth = async () => {
  const response = await client.get('/api/health');
  return response.data;
};

export const getTelemetry = async (deviceId = '', limit = 50) => {
  const params = {};
  if (deviceId) params.deviceId = deviceId;
  if (limit) params.limit = limit;
  const response = await client.get('/api/telemetry', { params });
  return response.data;
};

export const ingestReading = async (reading) => {
  const response = await client.post('/api/ingest', reading);
  return response.data;
};

export const ingestBatch = async (readings) => {
  const response = await client.post('/api/ingest/batch', readings);
  return response.data;
};

export default client;
