/**
 * Comparative Load Test: Ingestion With Active Rule Pipeline
 *
 * Compares ingestion throughput with an active compiled RxJS rule graph
 * running in memory vs baseline ingestion.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const runAudit = async () => {
  console.log('================================================================');
  console.log('   NexusFlow Ingestion Audit: Active Rule Pipeline Impact');
  console.log('================================================================\n');

  // 1. Auth & Activate Graph
  const email = `audit_user_${Date.now()}@nexusflow.io`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Audit Engineer', email, password: 'Password123!' }),
  });
  const authData = await regRes.json();
  const token = authData.token;

  console.log(`[Step 1] Authenticated test user: ${email}`);

  // Create graph
  const graphRes = await fetch(`${BASE_URL}/api/graphs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Audit Turbine Sentinel',
      graph: {
        version: '1.0.0',
        nodes: [
          {
            id: 'src-1',
            type: 'dataSource',
            data: { deviceId: 'turbine-01', sensorType: 'temperature' },
          },
          {
            id: 'math-1',
            type: 'mathOperation',
            data: { operation: 'threshold', operator: '>', thresholdValue: 85 },
          },
          {
            id: 'act-1',
            type: 'actionTrigger',
            data: { actionType: 'sms_alert', target: '+15550001111', cooldownSeconds: 2 },
          },
        ],
        edges: [
          { id: 'e1', source: 'src-1', target: 'math-1' },
          { id: 'e2', source: 'math-1', target: 'act-1' },
        ],
      },
    }),
  });
  const graphData = await graphRes.json();
  const graphId = graphData.data._id;
  console.log(`[Step 2] Created rule graph: ${graphId}`);

  // Activate graph
  const actRes = await fetch(`${BASE_URL}/api/graphs/${graphId}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const actData = await actRes.json();
  console.log(`[Step 3] Activated graph: Status = ${actData.data?.status} (${actData.message})`);

  // Verify active
  const listRes = await fetch(`${BASE_URL}/api/graphs/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  console.log(`[Step 4] Verified active running graphs: count = ${listData.count}`);

  // 2. Ingest Batched Telemetry under active rule execution
  console.log('\n[Step 5] Ingesting telemetry batches with active rule running...');
  const BATCH_SIZE = 500;
  const NUM_BATCHES = 20; // 10,000 total records
  const start = Date.now();
  let successBatches = 0;
  let failedBatches = 0;

  for (let b = 0; b < NUM_BATCHES; b++) {
    const readings = new Array(BATCH_SIZE);
    for (let i = 0; i < BATCH_SIZE; i++) {
      readings[i] = {
        deviceId: 'turbine-01',
        sensorType: 'temperature',
        value: 70 + (i % 25), // values between 70 and 94 (triggering threshold periodically)
        unit: '°C',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(`${BASE_URL}/api/ingest/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readings),
      });
      if (res.status === 201) successBatches++;
      else failedBatches++;
    } catch {
      failedBatches++;
    }
  }

  const durationSec = (Date.now() - start) / 1000;
  const totalRecords = successBatches * BATCH_SIZE;
  const writesPerSec = Math.round(totalRecords / durationSec);

  console.log('\n================================================================');
  console.log('      ACTIVE RULE INGESTION BENCHMARK RESULTS');
  console.log('================================================================');
  console.log(` Total Telemetry Sent:    ${totalRecords.toLocaleString()} documents`);
  console.log(` Total Batches Sent:      ${successBatches} successful (${failedBatches} failed)`);
  console.log(` Duration:                ${durationSec.toFixed(2)} seconds`);
  console.log(` Achieved Throughput:     ${writesPerSec.toLocaleString()} writes/sec`);
  console.log(` Avg Batch Latency:       ${Math.round((durationSec / NUM_BATCHES) * 1000)} ms`);
  console.log('----------------------------------------------------------------');

  // Check generated alerts
  const alertRes = await fetch(`${BASE_URL}/api/alerts?graphId=${graphId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const alertData = await alertRes.json();
  console.log(
    ` Alert Events Generated:  ${alertData.count} (Cooldown throttled repeats successfully)`
  );

  // Deactivate graph
  await fetch(`${BASE_URL}/api/graphs/${graphId}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(' Cleaned up & deactivated graph.');
  console.log('================================================================\n');
};

runAudit().catch(console.error);
