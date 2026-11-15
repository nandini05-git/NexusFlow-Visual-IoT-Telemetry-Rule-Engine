#!/usr/bin/env node

/**
 * NexusFlow High-Throughput Telemetry Ingestion Load Test
 *
 * Demonstrates high-speed batched ingestion into MongoDB Time-Series collections.
 * Uses native Node fetch without third-party load-testing tools.
 */

const getArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.substring(prefix.length);
  return process.env[name.toUpperCase().replace(/-/g, '_')] || fallback;
};

const BASE_URL = getArg('base-url', process.env.API_URL || 'http://localhost:5000');
const BATCH_SIZE = parseInt(getArg('batch-size', '1000'), 10);
const CONCURRENCY = parseInt(getArg('concurrency', '6'), 10);
const DURATION_SECONDS = parseInt(getArg('duration', '10'), 10);
const API_KEY = getArg('api-key', process.env.INGEST_API_KEY || '');

const DEVICES = ['turbine-01', 'turbine-02', 'compressor-03', 'generator-04', 'pump-05'];
const SENSORS = [
  { type: 'temperature', unit: '°C', base: 74.5, variance: 6.0 },
  { type: 'vibration', unit: 'mm/s', base: 2.3, variance: 0.6 },
  { type: 'pressure', unit: 'bar', base: 14.2, variance: 1.2 },
  { type: 'power', unit: 'kW', base: 450.0, variance: 30.0 },
];

const generateBatch = (count) => {
  const readings = new Array(count);
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const dev = DEVICES[i % DEVICES.length];
    const sensor = SENSORS[i % SENSORS.length];
    const val = sensor.base + (Math.random() - 0.5) * sensor.variance;

    readings[i] = {
      deviceId: dev,
      sensorType: sensor.type,
      value: parseFloat(val.toFixed(2)),
      unit: sensor.unit,
      timestamp: new Date(now - Math.floor(Math.random() * 5000)).toISOString(),
    };
  }
  return readings;
};

const runLoadTest = async () => {
  console.log('================================================================');
  console.log('      NexusFlow Telemetry Ingestion Load Test Runner');
  console.log('================================================================');
  console.log(` Target Endpoint:     ${BASE_URL}/api/ingest/batch`);
  console.log(` Batch Size:           ${BATCH_SIZE.toLocaleString()} readings / request`);
  console.log(` Concurrency:          ${CONCURRENCY} parallel workers`);
  console.log(` Duration Target:      ${DURATION_SECONDS} seconds`);
  console.log(` Target Ingestion:     5,000 writes/sec`);
  console.log('----------------------------------------------------------------');

  // Verify server reachability first
  try {
    const health = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
    console.log(` Server Status:       ${health.status.toUpperCase()} (DB: ${health.database})`);
    if (health.database !== 'connected') {
      console.warn(' WARNING: Backend reports database disconnected. Results may reflect in-memory or failure.');
    }
  } catch (err) {
    console.error(` ERROR: Cannot connect to target server at ${BASE_URL}. Is backend running?`);
    process.exit(1);
  }

  console.log('\nStarting high-throughput ingestion load test...\n');

  let totalSent = 0;
  let totalBatches = 0;
  let failedBatches = 0;
  let totalLatencyMs = 0;
  const latencies = [];

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const startTime = Date.now();
  const stopTime = startTime + DURATION_SECONDS * 1000;

  const runWorker = async (workerId) => {
    while (Date.now() < stopTime) {
      const batch = generateBatch(BATCH_SIZE);
      const reqStart = Date.now();

      try {
        const res = await fetch(`${BASE_URL}/api/ingest/batch`, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
        });

        const reqDuration = Date.now() - reqStart;
        latencies.push(reqDuration);
        totalLatencyMs += reqDuration;

        if (res.ok) {
          const body = await res.json();
          const inserted = body.insertedCount ?? batch.length;
          totalSent += inserted;
          totalBatches++;
        } else {
          failedBatches++;
          const errText = await res.text();
          console.warn(`[Worker ${workerId}] Batch rejected HTTP ${res.status}: ${errText.substring(0, 100)}`);
        }
      } catch (err) {
        failedBatches++;
        console.error(`[Worker ${workerId}] Network error: ${err.message}`);
      }
    }
  };

  // Launch concurrent workers
  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(runWorker(w + 1));
  }

  // Periodic progress logger
  const progressInterval = setInterval(() => {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const currentRate = Math.round(totalSent / (elapsedSec || 1));
    process.stdout.write(` -> Elapsed: ${elapsedSec}s | Sent: ${totalSent.toLocaleString()} records | Rate: ${currentRate.toLocaleString()} writes/sec\r`);
  }, 1000);

  await Promise.all(workers);
  clearInterval(progressInterval);

  const totalDurationMs = Date.now() - startTime;
  const totalDurationSec = totalDurationMs / 1000;
  const writesPerSec = Math.round(totalSent / totalDurationSec);
  const avgLatency = latencies.length > 0 ? Math.round(totalLatencyMs / latencies.length) : 0;

  // Compute p95 latency
  latencies.sort((a, b) => a - b);
  const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

  console.log('\n\n================================================================');
  console.log('                   LOAD TEST RESULTS REPORT');
  console.log('================================================================');
  console.log(` Total Telemetry Sent:    ${totalSent.toLocaleString()} documents`);
  console.log(` Total Batches Sent:      ${totalBatches} successful (${failedBatches} failed)`);
  console.log(` Actual Duration:         ${totalDurationSec.toFixed(2)} seconds`);
  console.log(` Achieved Throughput:     ${writesPerSec.toLocaleString()} writes/sec`);
  console.log(` Average Batch Latency:   ${avgLatency} ms`);
  console.log(` 95th Percentile Latency: ${p95Latency} ms`);
  console.log('----------------------------------------------------------------');

  if (writesPerSec >= 5000) {
    console.log(` STATUS: PASS (Exceeded target 5,000 writes/sec requirement)`);
  } else {
    console.log(` STATUS: MEASURED (${writesPerSec.toLocaleString()} writes/sec recorded)`);
  }
  console.log('================================================================\n');

  return { totalSent, totalDurationSec, writesPerSec, avgLatency, p95Latency, failedBatches };
};

runLoadTest().catch((err) => {
  console.error('\nFatal load test error:', err);
  process.exit(1);
});
