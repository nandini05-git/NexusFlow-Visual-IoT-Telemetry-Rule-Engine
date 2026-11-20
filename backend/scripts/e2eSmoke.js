#!/usr/bin/env node

/**
 * NexusFlow End-to-End Smoke Test Script
 *
 * Verifies the entire telemetry and rule execution lifecycle against a running server:
 * 1. Health check & database connection
 * 2. Demo user login / registration
 * 3. Graph creation from template
 * 4. Server-side DAG validation & dry-run compile
 * 5. Dynamic rule activation
 * 6. Non-matching telemetry ingestion (zero false-positive alerts)
 * 7. Matching threshold breach ingestion (exact alert verification)
 * 8. Dynamic rule deactivation
 * 9. Telemetry ingestion while inactive (zero alerts created)
 * 10. Automated cleanup & verification
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const DEMO_CREDENTIALS = {
  name: 'Smoke Test Engineer',
  email: 'demo@nexusflow.io',
  password: 'DemoUser2026!',
};

const SMOKE_GRAPH = {
  name: `Smoke Test Sentinel (${Date.now()})`,
  description: 'Automated E2E smoke test pipeline for turbine overheat monitoring',
  graph: {
    version: '1.0.0',
    nodes: [
      {
        id: 'smoke-src-1',
        type: 'dataSource',
        position: { x: 50, y: 150 },
        data: {
          label: 'Turbine-01 (Temp)',
          deviceId: 'turbine-01',
          sensorType: 'temperature',
          unit: '°C',
        },
      },
      {
        id: 'smoke-math-1',
        type: 'mathOperation',
        position: { x: 350, y: 150 },
        data: {
          label: 'Overheat Threshold (>85°C)',
          operation: 'threshold',
          operator: '>',
          thresholdValue: 85.0,
        },
      },
      {
        id: 'smoke-act-1',
        type: 'actionTrigger',
        position: { x: 650, y: 150 },
        data: {
          label: 'Emergency SMS Dispatch',
          actionType: 'sms_alert',
          target: '+1 (555) 019-2834',
          template: 'ALERT: {{deviceId}} temperature reached {{value}}°C',
          cooldownSeconds: 10,
        },
      },
    ],
    edges: [
      {
        id: 'e-smoke-1',
        source: 'smoke-src-1',
        target: 'smoke-math-1',
      },
      {
        id: 'e-smoke-2',
        source: 'smoke-math-1',
        target: 'smoke-act-1',
      },
    ],
  },
};

let passed = 0;
let failed = 0;

const logStep = (stepNumber, title, status, details = '') => {
  const badge = status === 'PASS' ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`  ${badge} Step ${stepNumber}: ${title}`);
  if (details) {
    console.log(`         \x1b[90m${details}\x1b[0m`);
  }
  if (status === 'PASS') passed++;
  else failed++;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callAPI(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runSmokeTest() {
  console.log('\n================================================================');
  console.log('       NexusFlow End-to-End System Smoke Test Suite');
  console.log(`       Target Endpoint: ${BASE_URL}`);
  console.log(`       Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  let authToken = null;
  let createdGraphId = null;

  try {
    // 1. Health check
    const health = await callAPI('/api/health');
    if (health.status === 200 && health.data?.database === 'connected') {
      logStep(
        1,
        'API Server & MongoDB Health Check',
        'PASS',
        `HTTP ${health.status} (DB: connected)`
      );
    } else {
      logStep(
        1,
        'API Server & MongoDB Health Check',
        'FAIL',
        `Unexpected response: ${JSON.stringify(health.data)}`
      );
      throw new Error('Health check failed. Ensure the backend server is running.');
    }

    // 2. Authentication: Login or Register
    let authRes = await callAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      }),
    });

    if (authRes.status === 200 && authRes.data?.token) {
      authToken = authRes.data.token;
      logStep(
        2,
        'Demo User Authentication (Login)',
        'PASS',
        `Logged in as ${DEMO_CREDENTIALS.email}`
      );
    } else {
      // Register if not yet seeded
      const regRes = await callAPI('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(DEMO_CREDENTIALS),
      });
      if ((regRes.status === 201 || regRes.status === 200) && regRes.data?.token) {
        authToken = regRes.data.token;
        logStep(
          2,
          'Demo User Authentication (Register)',
          'PASS',
          `Registered new demo user ${DEMO_CREDENTIALS.email}`
        );
      } else {
        logStep(
          2,
          'Demo User Authentication',
          'FAIL',
          `Status ${authRes.status}: ${JSON.stringify(authRes.data)}`
        );
        throw new Error('Could not authenticate demo user');
      }
    }

    // 3. Create Rule Graph
    const createRes = await callAPI(
      '/api/graphs',
      {
        method: 'POST',
        body: JSON.stringify(SMOKE_GRAPH),
      },
      authToken
    );

    if (createRes.status === 201 && createRes.data?.data?._id) {
      createdGraphId = createRes.data.data._id;
      logStep(
        3,
        'Create Rule Graph from Template',
        'PASS',
        `Created graph ID: ${createdGraphId} (status: draft)`
      );
    } else {
      logStep(
        3,
        'Create Rule Graph from Template',
        'FAIL',
        `Status ${createRes.status}: ${JSON.stringify(createRes.data)}`
      );
      throw new Error('Graph creation failed');
    }

    // 4. Compile Check (Dry-run)
    const compileRes = await callAPI(
      `/api/graphs/${createdGraphId}/compile`,
      {
        method: 'POST',
      },
      authToken
    );

    if (compileRes.status === 200 && compileRes.data?.success) {
      const order = (
        compileRes.data.metadata?.topologicalOrder ||
        compileRes.data.data?.topologicalOrder ||
        []
      ).join(' -> ');
      logStep(
        4,
        'Server-Side DAG Compilation & Topological Order',
        'PASS',
        `Topological Order: [${order}]`
      );
    } else {
      logStep(
        4,
        'Server-Side DAG Compilation',
        'FAIL',
        `Status ${compileRes.status}: ${JSON.stringify(compileRes.data)}`
      );
      throw new Error('Graph compile check failed');
    }

    // 5. Activate Rule Graph
    const activateRes = await callAPI(
      `/api/graphs/${createdGraphId}/activate`,
      {
        method: 'POST',
      },
      authToken
    );

    if (activateRes.status === 200 && activateRes.data?.success) {
      logStep(
        5,
        'Dynamic Rule Runner Activation',
        'PASS',
        `Rule compiled and subscribed to telemetry bus.`
      );
    } else {
      logStep(
        5,
        'Dynamic Rule Runner Activation',
        'FAIL',
        `Status ${activateRes.status}: ${JSON.stringify(activateRes.data)}`
      );
      throw new Error('Rule activation failed');
    }

    // Verify it is in active list
    const activeList = await callAPI('/api/graphs/active', { method: 'GET' }, authToken);
    const isActive = activeList.data?.data?.some((g) => g.graphId === createdGraphId);
    if (isActive) {
      logStep(
        6,
        'Verify Graph in Active Registry',
        'PASS',
        `Graph ${createdGraphId} confirmed active in ruleRunner.`
      );
    } else {
      logStep(6, 'Verify Graph in Active Registry', 'FAIL', 'Graph not found in active list');
    }

    // 7. Ingest Non-Matching Readings (Zero Alerts Expected)
    const reading1 = {
      deviceId: 'turbine-01',
      sensorType: 'temperature',
      value: 74.2, // Below 85
      unit: '°C',
      timestamp: new Date().toISOString(),
    };
    const reading2 = {
      deviceId: 'pump-03', // Different device
      sensorType: 'temperature',
      value: 99.0,
      unit: '°C',
      timestamp: new Date().toISOString(),
    };

    await callAPI('/api/ingest', { method: 'POST', body: JSON.stringify(reading1) });
    await callAPI('/api/ingest', { method: 'POST', body: JSON.stringify(reading2) });
    await delay(200);

    const alertsAfterCold = await callAPI(
      `/api/alerts?graphId=${createdGraphId}`,
      { method: 'GET' },
      authToken
    );
    const coldAlertCount = alertsAfterCold.data?.data?.length ?? alertsAfterCold.data?.length ?? 0;

    if (coldAlertCount === 0) {
      logStep(
        7,
        'Ingest Non-Matching Readings',
        'PASS',
        `2 non-matching readings ingested; exactly 0 alerts created.`
      );
    } else {
      logStep(
        7,
        'Ingest Non-Matching Readings',
        'FAIL',
        `Expected 0 alerts, got ${coldAlertCount}`
      );
    }

    // 8. Ingest Matching Breach Reading (Exactly 1 Alert Expected)
    const breachReading = {
      deviceId: 'turbine-01',
      sensorType: 'temperature',
      value: 91.4, // Exceeds 85
      unit: '°C',
      timestamp: new Date().toISOString(),
    };

    const ingestRes = await callAPI('/api/ingest', {
      method: 'POST',
      body: JSON.stringify(breachReading),
    });
    if (ingestRes.status !== 201) {
      throw new Error(`Ingest failed with status ${ingestRes.status}`);
    }
    await delay(300);

    const alertsAfterBreach = await callAPI(
      `/api/alerts?graphId=${createdGraphId}`,
      { method: 'GET' },
      authToken
    );
    const breachAlerts = alertsAfterBreach.data?.data ?? alertsAfterBreach.data ?? [];

    if (breachAlerts.length === 1 && breachAlerts[0].reading?.value === 91.4) {
      logStep(
        8,
        'Ingest Breach Reading & Verify Alert Log',
        'PASS',
        `Breach value 91.4°C triggered AlertEvent: "${breachAlerts[0].message}"`
      );
    } else {
      logStep(
        8,
        'Ingest Breach Reading & Verify Alert Log',
        'FAIL',
        `Expected 1 alert with value 91.4, got count ${breachAlerts.length}`
      );
    }

    // 9. Deactivate Rule Graph
    const deactivateRes = await callAPI(
      `/api/graphs/${createdGraphId}/deactivate`,
      {
        method: 'POST',
      },
      authToken
    );

    if (deactivateRes.status === 200 && deactivateRes.data?.data?.status === 'draft') {
      logStep(
        9,
        'Dynamic Rule Deactivation',
        'PASS',
        `Rule subscription released; status returned to "draft".`
      );
    } else {
      logStep(
        9,
        'Dynamic Rule Deactivation',
        'FAIL',
        `Status ${deactivateRes.status}: ${JSON.stringify(deactivateRes.data)}`
      );
    }

    // 10. Ingest While Deactivated (Verify Zero New Alerts)
    const postDeactReading = {
      deviceId: 'turbine-01',
      sensorType: 'temperature',
      value: 96.0, // High heat while deactivated
      unit: '°C',
      timestamp: new Date().toISOString(),
    };

    await callAPI('/api/ingest', { method: 'POST', body: JSON.stringify(postDeactReading) });
    await delay(200);

    const alertsAfterDeact = await callAPI(
      `/api/alerts?graphId=${createdGraphId}`,
      { method: 'GET' },
      authToken
    );
    const totalAlerts = alertsAfterDeact.data?.data?.length ?? alertsAfterDeact.data?.length ?? 0;

    if (totalAlerts === 1) {
      logStep(
        10,
        'Ingest While Deactivated (Suppression Check)',
        'PASS',
        `Ingested 96.0°C; alert count remained 1 (no spurious execution).`
      );
    } else {
      logStep(
        10,
        'Ingest While Deactivated (Suppression Check)',
        'FAIL',
        `Expected count 1, found ${totalAlerts}`
      );
    }

    // 11. Cleanup Test Graph
    const delRes = await callAPI(`/api/graphs/${createdGraphId}`, { method: 'DELETE' }, authToken);
    if (delRes.status === 200) {
      logStep(
        11,
        'Teardown & Cleanup Test Graph',
        'PASS',
        `Cleaned up test rule ${createdGraphId}`
      );
      createdGraphId = null;
    } else {
      logStep(11, 'Teardown & Cleanup Test Graph', 'FAIL', `Status ${delRes.status}`);
    }
  } catch (err) {
    console.error(`\n\x1b[31m[SMOKE TEST FATAL ERROR]\x1b[0m ${err.message}`);
    failed++;
  } finally {
    // If graph was created but not deleted, clean it up
    if (createdGraphId && authToken) {
      try {
        await callAPI(`/api/graphs/${createdGraphId}/deactivate`, { method: 'POST' }, authToken);
        await callAPI(`/api/graphs/${createdGraphId}`, { method: 'DELETE' }, authToken);
      } catch {
        // ignore
      }
    }

    console.log('\n================================================================');
    console.log(` SMOKE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runSmokeTest();
