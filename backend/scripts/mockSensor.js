const PORT = process.env.PORT || 5000;
const INGEST_URL = process.env.INGEST_URL || `http://localhost:${PORT}/api/ingest`;

console.log(`[Mock Sensor] Starting simulated IoT Turbine Temperature Sensor...`);
console.log(`[Mock Sensor] Target endpoint: ${INGEST_URL}`);
console.log(`[Mock Sensor] Sending telemetry readings every 1000ms. Press Ctrl+C to stop.\n`);

const DEVICE_ID = 'turbine-01';
const SENSOR_TYPE = 'temperature';
const UNIT = '°C';
let baseTemp = 72.5;

const sendReading = async () => {
  // Simulate fluctuating temperature with occasional drift
  const fluctuation = (Math.random() - 0.48) * 2.2;
  baseTemp = Math.min(Math.max(baseTemp + fluctuation, 60.0), 95.0);
  const currentTemp = parseFloat(baseTemp.toFixed(2));

  const payload = {
    deviceId: DEVICE_ID,
    sensorType: SENSOR_TYPE,
    value: currentTemp,
    unit: UNIT,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Sent ${DEVICE_ID} ${SENSOR_TYPE}: ${currentTemp} ${UNIT} -> Success (id: ${data.data?._id || 'ok'})`);
    } else {
      const errText = await response.text();
      console.warn(`[${new Date().toLocaleTimeString()}] HTTP ${response.status}: ${errText}`);
    }
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Ingestion error: ${err.message}`);
  }
};

// Send immediately, then every 1000ms
sendReading();
const interval = setInterval(sendReading, 1000);

process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n[Mock Sensor] Sensor simulation stopped.');
  process.exit(0);
});
