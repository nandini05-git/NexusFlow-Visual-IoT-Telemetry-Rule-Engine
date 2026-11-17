/**
 * Week 2 Day 1 - Logic Compiler & Graph API Integration Test
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const runTests = async () => {
  console.log('========================================================');
  console.log('   NexusFlow Week 2 Day 1 - Compiler & Graph API Tests');
  console.log(`   Target Server: ${BASE_URL}`);
  console.log('========================================================\n');

  const testEmail = `compiler_dev_${Date.now()}@nexusflow.io`;
  const testPassword = 'Password123!';
  const testName = 'Ada Rule Engineer';
  let authToken = null;
  let createdGraphId = null;

  const callAPI = async (endpoint, options = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
    const status = res.status;
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status, data };
  };

  // 1. Health check
  console.log('[Test 1] Health Check');
  const healthRes = await callAPI('/api/health');
  console.log(` -> Status: ${healthRes.status}, DB: ${healthRes.data?.database}`);
  if (healthRes.status !== 200) throw new Error('Backend not healthy');

  // 2. Register & Auth
  console.log(`\n[Test 2] Register User (${testEmail})`);
  const regRes = await callAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
  });
  console.log(` -> Status: ${regRes.status}`);
  if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  authToken = regRes.data.token;
  console.log(' -> Auth token acquired');

  // 3. Reject invalid graph (cycle)
  console.log('\n[Test 3] Attempt to save Cyclic Graph (Expect 400 rejection)');
  const cyclicPayload = {
    name: 'Cyclic Graph',
    graph: {
      nodes: [
        { id: 'src-1', type: 'dataSource', data: { deviceId: 'turbine-01', sensorType: 'temperature' } },
        { id: 'math-1', type: 'mathOperation', data: { operation: 'threshold', operator: '>', thresholdValue: 50 } },
        { id: 'math-2', type: 'mathOperation', data: { operation: 'threshold', operator: '>', thresholdValue: 60 } },
        { id: 'act-1', type: 'actionTrigger', data: { actionType: 'sms_alert', target: '+1234567890' } },
      ],
      edges: [
        { id: 'e1', source: 'src-1', target: 'math-1' },
        { id: 'e2', source: 'math-1', target: 'math-2' },
        { id: 'e3', source: 'math-2', target: 'math-1' }, // cycle!
        { id: 'e4', source: 'math-2', target: 'act-1' },
      ],
    },
  };
  const cycleRes = await callAPI('/api/graphs', {
    method: 'POST',
    body: JSON.stringify(cyclicPayload),
  });
  console.log(` -> Status: ${cycleRes.status} (Expected 400)`);
  console.log(` -> Error Message: ${cycleRes.data?.message}`);
  if (cycleRes.status !== 400 || !cycleRes.data?.message.toLowerCase().includes('cycle')) {
    throw new Error('Cyclic graph was not rejected properly');
  }

  // 4. Reject orphan node
  console.log('\n[Test 4] Attempt to save Graph with Orphan Node (Expect 400 rejection)');
  const orphanPayload = {
    name: 'Orphan Graph',
    graph: {
      nodes: [
        { id: 'src-1', type: 'dataSource', data: { deviceId: 'turbine-01', sensorType: 'temperature' } },
        { id: 'act-1', type: 'actionTrigger', data: { actionType: 'sms_alert', target: '+1234567890' } },
        { id: 'math-lost', type: 'mathOperation', data: { operation: 'sum', windowSize: 5 } },
      ],
      edges: [
        { id: 'e1', source: 'src-1', target: 'act-1' },
      ],
    },
  };
  const orphanRes = await callAPI('/api/graphs', {
    method: 'POST',
    body: JSON.stringify(orphanPayload),
  });
  console.log(` -> Status: ${orphanRes.status} (Expected 400)`);
  console.log(` -> Error Message: ${orphanRes.data?.message}`);
  if (orphanRes.status !== 400) {
    throw new Error('Orphan graph was not rejected properly');
  }

  // 5. Create valid rule graph
  console.log('\n[Test 5] Save Valid Rule Graph (POST /api/graphs)');
  const validGraph = {
    name: 'Turbine Thermal Sentinel',
    description: 'Triggers emergency cooling when turbine temp > 85°C',
    graph: {
      version: '1.0.0',
      nodes: [
        {
          id: 'src-turb',
          type: 'dataSource',
          data: { label: 'Turbine-01 Temp', deviceId: 'turbine-01', sensorType: 'temperature' },
        },
        {
          id: 'math-thresh',
          type: 'mathOperation',
          data: { label: 'Overheat > 85', operation: 'threshold', operator: '>', thresholdValue: 85 },
        },
        {
          id: 'act-sms',
          type: 'actionTrigger',
          data: { label: 'Dispatch Alert', actionType: 'sms_alert', target: '+1 (555) 999-0000' },
        },
      ],
      edges: [
        { id: 'e1', source: 'src-turb', target: 'math-thresh' },
        { id: 'e2', source: 'math-thresh', target: 'act-sms' },
      ],
    },
  };

  const createRes = await callAPI('/api/graphs', {
    method: 'POST',
    body: JSON.stringify(validGraph),
  });
  console.log(` -> Status: ${createRes.status} (Expected 201)`);
  console.log(` -> Created Graph ID: ${createRes.data?.data?._id}`);
  if (createRes.status !== 201 || !createRes.data?.data?._id) {
    throw new Error('Failed to create valid rule graph');
  }
  createdGraphId = createRes.data.data._id;

  // 6. List user graphs
  console.log('\n[Test 6] List User Graphs (GET /api/graphs)');
  const listRes = await callAPI('/api/graphs');
  console.log(` -> Status: ${listRes.status}, Count: ${listRes.data?.count}`);
  if (listRes.status !== 200 || listRes.data?.count < 1) {
    throw new Error('Graph listing failed');
  }

  // 7. Compile saved graph (Dry-run compile)
  console.log(`\n[Test 7] Compile Saved Graph (POST /api/graphs/${createdGraphId}/compile)`);
  const compileRes = await callAPI(`/api/graphs/${createdGraphId}/compile`, {
    method: 'POST',
  });
  console.log(` -> Status: ${compileRes.status}`);
  console.log(` -> Message: ${compileRes.data?.message}`);
  console.log(` -> Topological Order: ${JSON.stringify(compileRes.data?.metadata?.topologicalOrder)}`);
  if (compileRes.status !== 200 || !compileRes.data?.success) {
    throw new Error('Dry-run compile failed');
  }

  // 8. Compile ad-hoc unsaved graph (POST /api/graphs/compile)
  console.log('\n[Test 8] Compile Ad-Hoc Graph (POST /api/graphs/compile)');
  const adhocRes = await callAPI('/api/graphs/compile', {
    method: 'POST',
    body: JSON.stringify(validGraph),
  });
  console.log(` -> Status: ${adhocRes.status}`);
  if (adhocRes.status !== 200 || !adhocRes.data?.success) {
    throw new Error('Ad-hoc compile failed');
  }

  // 9. Ingest telemetry that breaches threshold
  console.log('\n[Test 9] Ingest Telemetry (POST /api/ingest) with value 89.2°C');
  const ingestRes = await callAPI('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: 'turbine-01',
      sensorType: 'temperature',
      value: 89.2,
      unit: '°C',
    }),
  });
  console.log(` -> Status: ${ingestRes.status}, Ingested: ${ingestRes.data?.success}`);
  if (ingestRes.status !== 201) throw new Error('Ingest failed');

  // 10. Clean up - Delete graph
  console.log(`\n[Test 10] Delete Graph (DELETE /api/graphs/${createdGraphId})`);
  const delRes = await callAPI(`/api/graphs/${createdGraphId}`, { method: 'DELETE' });
  console.log(` -> Status: ${delRes.status}`);
  if (delRes.status !== 200) throw new Error('Graph deletion failed');

  console.log('\n========================================================');
  console.log('   ALL 10 COMPILER & GRAPH INTEGRATION TESTS PASSED!');
  console.log('========================================================\n');
};

runTests().catch((err) => {
  console.error('\n[INTEGRATION TEST ERROR]:', err.message);
  process.exit(1);
});
