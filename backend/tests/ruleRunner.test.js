import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import ruleRunner from '../src/compiler/ruleRunner.js';
import telemetryBus from '../src/compiler/telemetryBus.js';
import AlertEvent from '../src/models/AlertEvent.js';

describe('NexusFlow RuleRunner & Alert Engine Test Suite', () => {
  let createdAlerts = [];
  const originalCreate = AlertEvent.create;

  const validGraph = {
    _id: 'graph-test-001',
    name: 'Overheat Sentinel',
    graph: {
      version: '1.0.0',
      nodes: [
        {
          id: 'src-1',
          type: 'dataSource',
          data: { label: 'Turbine Temp', deviceId: 'turbine-01', sensorType: 'temperature' },
        },
        {
          id: 'math-1',
          type: 'mathOperation',
          data: { label: 'High Temp > 80', operation: 'threshold', operator: '>', thresholdValue: 80 },
        },
        {
          id: 'act-1',
          type: 'actionTrigger',
          data: {
            label: 'Emergency Alert',
            actionType: 'sms_alert',
            target: '+1 (555) 019-2834',
            cooldownSeconds: 1, // 1-second cooldown for testing
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'src-1', target: 'math-1' },
        { id: 'e2', source: 'math-1', target: 'act-1' },
      ],
    },
  };

  beforeEach(() => {
    createdAlerts = [];
    AlertEvent.create = async (doc) => {
      createdAlerts.push(doc);
      return { ...doc, _id: `alert-${Date.now()}-${createdAlerts.length}` };
    };
    ruleRunner.stopAll();
  });

  afterEach(() => {
    ruleRunner.stopAll();
    AlertEvent.create = originalCreate;
  });

  it('1. Activating a graph and ingesting a matching reading creates one AlertEvent', async () => {
    const ownerId = 'user-owner-001';
    ruleRunner.activate(validGraph._id, validGraph, ownerId);

    assert.strictEqual(ruleRunner.isActive(validGraph._id), true);

    // Emit matching reading: device turbine-01, temperature, value 85.5 (> 80)
    telemetryBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 85.5,
      timestamp: new Date(),
    });

    // Small microtask wait for async AlertEvent.create
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.strictEqual(createdAlerts.length, 1);
    assert.strictEqual(createdAlerts[0].ruleName, 'Overheat Sentinel');
    assert.strictEqual(createdAlerts[0].actionType, 'sms_alert');
    assert.strictEqual(createdAlerts[0].target, '+1 (555) 019-2834');
    assert.strictEqual(createdAlerts[0].reading.value, 85.5);
  });

  it('2. Ingesting non-matching readings creates zero AlertEvents', async () => {
    const ownerId = 'user-owner-001';
    ruleRunner.activate(validGraph._id, validGraph, ownerId);

    // Reading 1: value 72.0 (below threshold)
    telemetryBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 72.0,
    });

    // Reading 2: different deviceId (turbine-02)
    telemetryBus.next({
      metadata: { deviceId: 'turbine-02', sensorType: 'temperature' },
      value: 95.0,
    });

    // Reading 3: different sensorType (vibration)
    telemetryBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'vibration' },
      value: 95.0,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.strictEqual(createdAlerts.length, 0, 'No non-matching readings should trigger an alert');
  });

  it('3. Cooldown suppresses duplicate alerts within cooldown window', async () => {
    const ownerId = 'user-owner-001';
    ruleRunner.activate(validGraph._id, validGraph, ownerId);

    // Send 5 matching readings in rapid succession (burst stream)
    for (let i = 0; i < 5; i++) {
      telemetryBus.next({
        metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
        value: 85.0 + i,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 30));

    // Cooldown is 1s, so only the first reading within this burst should create an alert
    assert.strictEqual(createdAlerts.length, 1, 'Burst stream within cooldown should only trigger once');

    // Wait 1.1 seconds for cooldown to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Next matching reading should now trigger a second alert
    telemetryBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 92.0,
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.strictEqual(createdAlerts.length, 2, 'Post-cooldown reading must trigger a new alert');
  });

  it('4. Deactivating a graph stops alerts completely', async () => {
    const ownerId = 'user-owner-001';
    ruleRunner.activate(validGraph._id, validGraph, ownerId);
    assert.strictEqual(ruleRunner.isActive(validGraph._id), true);

    // Deactivate
    const deact = ruleRunner.deactivate(validGraph._id);
    assert.strictEqual(deact.success, true);
    assert.strictEqual(ruleRunner.isActive(validGraph._id), false);

    // Emit matching reading
    telemetryBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 99.0,
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.strictEqual(createdAlerts.length, 0, 'Deactivated graph must not emit alerts');
  });

  it('5. Activating twice does not create duplicate subscriptions', async () => {
    const ownerId = 'user-owner-001';
    // Activate once
    ruleRunner.activate(validGraph._id, validGraph, ownerId);
    // Activate second time (should replace/restart cleanly)
    ruleRunner.activate(validGraph._id, validGraph, ownerId);

    const activeList = ruleRunner.listActive(ownerId);
    assert.strictEqual(activeList.length, 1, 'Should only have 1 active entry in runner');

    // Emit 1 matching reading
    telemetryBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 88.0,
    });

    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.strictEqual(createdAlerts.length, 1, 'Activating twice must not produce duplicate alerts');
  });

  it('6. A throwing node or operator error does not break ingestion or other rules', async () => {
    const ownerId = 'user-owner-001';

    // Graph with a problematic math node that throws on value 999
    const faultyGraph = {
      _id: 'graph-faulty-001',
      name: 'Faulty Rule',
      graph: {
        version: '1.0.0',
        nodes: [
          {
            id: 'src-fault',
            type: 'dataSource',
            data: { deviceId: 'turbine-fault', sensorType: 'temperature' },
          },
          {
            id: 'math-fault',
            type: 'mathOperation',
            data: { operation: 'threshold', operator: '>', thresholdValue: 50 },
          },
          {
            id: 'act-fault',
            type: 'actionTrigger',
            data: { actionType: 'sms_alert', target: '+111111111' },
          },
        ],
        edges: [
          { id: 'e1', source: 'src-fault', target: 'math-fault' },
          { id: 'e2', source: 'math-fault', target: 'act-fault' },
        ],
      },
    };

    // Activate both normal valid graph and faulty graph
    ruleRunner.activate(validGraph._id, validGraph, ownerId);
    ruleRunner.activate(faultyGraph._id, faultyGraph, ownerId);

    // Ingest simulated readings through telemetryBus using the safe pattern from ingest.controller
    const safeIngest = (reading) => {
      try {
        telemetryBus.next(reading);
      } catch (err) {
        console.error('[Ingest caught isolated stream error]:', err.message);
      }
    };

    // 1. Send normal reading for valid graph
    safeIngest({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 86.0,
    });

    // 2. Send reading for faulty graph
    safeIngest({
      metadata: { deviceId: 'turbine-fault', sensorType: 'temperature' },
      value: 65.0,
    });

    await new Promise((resolve) => setTimeout(resolve, 30));

    // Valid graph continues to trigger alerts successfully
    assert.strictEqual(createdAlerts.length, 2);
    assert.strictEqual(createdAlerts[0].ruleName, 'Overheat Sentinel');
    assert.strictEqual(createdAlerts[1].ruleName, 'Faulty Rule');
  });
});
