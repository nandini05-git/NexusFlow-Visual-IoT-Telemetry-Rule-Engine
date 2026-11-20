#!/usr/bin/env node

/**
 * NexusFlow Ingestion & Query Test Suite
 *
 * Verifies single ingestion, batch ingestion, payload validation,
 * array size capping, protected queries, and aggregation stats.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const runIngestTests = async () => {
  console.log('================================================================');
  console.log('        NexusFlow Telemetry Ingestion API Test Suite');
  console.log(`        Target Endpoint: ${BASE_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const testCase = (title, condition, detail = '') => {
    if (condition) {
      console.log(`  [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${title} - ${detail}`);
      failed++;
    }
  };

  const call = async (endpoint, options = {}) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    return { status: res.status, data };
  };

  // 1. Health Check
  const health = await call('/api/health');
  testCase(
    'GET /api/health responds with status ok',
    health.status === 200 && health.data.status === 'ok'
  );

  // 2. Single Ingest: Valid Reading
  const validSingle = await call('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: 'turbine-test-01',
      sensorType: 'temperature',
      value: 78.4,
      unit: '°C',
    }),
  });
  testCase(
    'POST /api/ingest accepts valid reading (201)',
    validSingle.status === 201 && validSingle.data.success === true
  );

  // 3. Single Ingest: Missing deviceId
  const missingDevice = await call('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({
      sensorType: 'temperature',
      value: 78.4,
    }),
  });
  testCase('POST /api/ingest rejects payload without deviceId (400)', missingDevice.status === 400);

  // 4. Single Ingest: Non-numeric value
  const invalidValue = await call('/api/ingest', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: 'turbine-test-01',
      sensorType: 'temperature',
      value: 'NaN-invalid',
    }),
  });
  testCase('POST /api/ingest rejects non-numeric sensor value (400)', invalidValue.status === 400);

  // 5. Batch Ingest: Valid Array (ordered: false)
  const sampleBatch = [
    { deviceId: 'turbine-test-01', sensorType: 'vibration', value: 2.1, unit: 'mm/s' },
    { deviceId: 'turbine-test-02', sensorType: 'vibration', value: 2.3, unit: 'mm/s' },
    { deviceId: 'turbine-test-03', sensorType: 'pressure', value: 14.1, unit: 'bar' },
  ];
  const validBatch = await call('/api/ingest/batch', {
    method: 'POST',
    body: JSON.stringify(sampleBatch),
  });
  testCase(
    'POST /api/ingest/batch inserts valid array of readings (201)',
    validBatch.status === 201 && validBatch.data.insertedCount === 3
  );

  // 6. Batch Ingest: Rejects non-array / empty
  const emptyBatch = await call('/api/ingest/batch', {
    method: 'POST',
    body: JSON.stringify([]),
  });
  testCase('POST /api/ingest/batch rejects empty array (400)', emptyBatch.status === 400);

  // 7. Batch Ingest: Rejects over 10,000 cap
  const oversizedArray = new Array(10001).fill({
    deviceId: 'test',
    sensorType: 'temp',
    value: 10,
  });
  const overCap = await call('/api/ingest/batch', {
    method: 'POST',
    body: JSON.stringify(oversizedArray),
  });
  testCase(
    'POST /api/ingest/batch rejects batches exceeding 10,000 readings (400)',
    overCap.status === 400
  );

  // 8. Auth Protection on /api/telemetry
  const unauthTel = await call('/api/telemetry');
  testCase('GET /api/telemetry requires authentication token (401)', unauthTel.status === 401);

  // 9. Auth Protection on /api/telemetry/stats
  const unauthStats = await call('/api/telemetry/stats');
  testCase(
    'GET /api/telemetry/stats requires authentication token (401)',
    unauthStats.status === 401
  );

  // 10. Authenticate to obtain token
  const authUser = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ingest Verifier',
      email: `ingest_verify_${Date.now()}@nexusflow.io`,
      password: 'Password123!',
    }),
  });
  const token = authUser.data?.token;

  // 11. Authenticated /api/telemetry query with filter
  const authTel = await call('/api/telemetry?deviceId=turbine-test-01&limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  testCase(
    'GET /api/telemetry with Bearer token filters by deviceId and limit (200)',
    authTel.status === 200 && Array.isArray(authTel.data.data) && authTel.data.data.length > 0
  );

  // 12. Authenticated /api/telemetry/stats aggregation
  const authStats = await call('/api/telemetry/stats?deviceId=turbine-test-01&minutes=60', {
    headers: { Authorization: `Bearer ${token}` },
  });
  testCase(
    'GET /api/telemetry/stats returns count, min, max, avg aggregation (200)',
    authStats.status === 200 &&
      authStats.data.stats &&
      typeof authStats.data.stats.count === 'number' &&
      authStats.data.stats.count > 0
  );

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passed} passed, ${failed} failed (${passed + failed} total tests)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runIngestTests().catch((err) => {
  console.error('\nFatal test execution error:', err.message);
  process.exit(1);
});
