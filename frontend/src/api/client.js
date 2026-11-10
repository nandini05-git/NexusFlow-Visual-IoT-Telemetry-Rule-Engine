import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const client = axios.create({
  baseURL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
