import client from './client';

/**
 * Graph Persistence & Compiler API Service
 * Handles CRUD operations and server-side compilation validation.
 */

// Fetch all saved rule graphs for the authenticated user
export const fetchUserGraphs = async () => {
  const res = await client.get('/api/graphs');
  return res.data;
};

// Fetch single graph by ID
export const fetchGraphById = async (graphId) => {
  const res = await client.get(`/api/graphs/${graphId}`);
  return res.data;
};

// Create a new rule graph
export const createRuleGraph = async (payload) => {
  const res = await client.post('/api/graphs', payload);
  return res.data;
};

// Update an existing rule graph
export const updateRuleGraph = async (graphId, payload) => {
  const res = await client.put(`/api/graphs/${graphId}`, payload);
  return res.data;
};

// Delete a rule graph
export const deleteRuleGraph = async (graphId) => {
  const res = await client.delete(`/api/graphs/${graphId}`);
  return res.data;
};

// Dry-run compile a saved graph by ID
export const compileSavedGraph = async (graphId) => {
  const res = await client.post(`/api/graphs/${graphId}/compile`);
  return res.data;
};

// Dry-run compile current canvas graph state directly (ad-hoc)
export const compileAdHocGraph = async (payload) => {
  const res = await client.post('/api/graphs/compile', payload);
  return res.data;
};

// Activate a saved graph (POST /api/graphs/:id/activate)
export const activateGraph = async (graphId) => {
  const res = await client.post(`/api/graphs/${graphId}/activate`);
  return res.data;
};

// Deactivate a running graph (POST /api/graphs/:id/deactivate)
export const deactivateGraph = async (graphId) => {
  const res = await client.post(`/api/graphs/${graphId}/deactivate`);
  return res.data;
};

// Fetch currently active graphs for the user (GET /api/graphs/active)
export const fetchActiveGraphs = async () => {
  const res = await client.get('/api/graphs/active');
  return res.data;
};

// Fetch triggered alerts log (GET /api/alerts?graphId=&limit=)
export const fetchAlerts = async (params = {}) => {
  const res = await client.get('/api/alerts', { params });
  return res.data;
};

// Fetch outbound delivery history (GET /api/deliveries?graphId=&status=&limit=)
export const fetchDeliveries = async (params = {}) => {
  const res = await client.get('/api/deliveries', { params });
  return res.data;
};

// Test an action dispatch on-demand (POST /api/actions/test)
export const testActionDispatch = async (payload) => {
  const res = await client.post('/api/actions/test', payload);
  return res.data;
};
