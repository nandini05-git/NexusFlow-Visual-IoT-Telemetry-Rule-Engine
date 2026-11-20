import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Subject } from 'rxjs';
import { parseGraph, GraphValidationError } from '../src/compiler/graphParser.js';
import { compileGraph } from '../src/compiler/compileGraph.js';

describe('NexusFlow Logic Compiler Test Suite', () => {
  // Sample valid graph builder
  const buildValidGraph = () => ({
    version: '1.0.0',
    nodes: [
      {
        id: 'source-1',
        type: 'dataSource',
        position: { x: 50, y: 100 },
        data: {
          label: 'Turbine-01 Temp',
          deviceId: 'turbine-01',
          sensorType: 'temperature',
        },
      },
      {
        id: 'math-1',
        type: 'mathOperation',
        position: { x: 300, y: 100 },
        data: {
          label: 'High Temp Threshold',
          operation: 'threshold',
          operator: '>',
          thresholdValue: 80,
        },
      },
      {
        id: 'action-1',
        type: 'actionTrigger',
        position: { x: 550, y: 100 },
        data: {
          label: 'SMS Alert Dispatcher',
          actionType: 'sms_alert',
          target: '+1 (555) 019-2834',
        },
      },
    ],
    edges: [
      { id: 'e1', source: 'source-1', target: 'math-1' },
      { id: 'e2', source: 'math-1', target: 'action-1' },
    ],
  });

  it('1. Valid graph compiles into an executable pipeline with valid metadata', () => {
    const graph = buildValidGraph();
    const compiled = compileGraph(graph, { ruleName: 'Overheat Detection' });

    assert.ok(compiled, 'Compiled object must exist');
    assert.strictEqual(typeof compiled.start, 'function');
    assert.strictEqual(typeof compiled.stop, 'function');
    assert.strictEqual(compiled.metadata.nodeCount, 3);
    assert.strictEqual(compiled.metadata.edgeCount, 2);
    assert.strictEqual(compiled.metadata.dataSources.length, 1);
    assert.strictEqual(compiled.metadata.actionTriggers.length, 1);
    assert.deepStrictEqual(compiled.metadata.topologicalOrder, ['source-1', 'math-1', 'action-1']);

    // Test lifecycle transitions
    assert.strictEqual(compiled.metadata.isRunning, false);
    compiled.start();
    assert.strictEqual(compiled.metadata.isRunning, true);
    compiled.stop();
    assert.strictEqual(compiled.metadata.isRunning, false);
  });

  it('2. Graph with a cyclic loop is rejected with an error identifying the cycle', () => {
    const cyclicGraph = {
      nodes: [
        {
          id: 'source-1',
          type: 'dataSource',
          data: { deviceId: 'turbine-01', sensorType: 'temp' },
        },
        {
          id: 'math-a',
          type: 'mathOperation',
          data: { operation: 'threshold', operator: '>', thresholdValue: 50 },
        },
        {
          id: 'math-b',
          type: 'mathOperation',
          data: { operation: 'threshold', operator: '>', thresholdValue: 60 },
        },
        {
          id: 'action-1',
          type: 'actionTrigger',
          data: { actionType: 'sms_alert', target: '+123456789' },
        },
      ],
      edges: [
        { id: 'e1', source: 'source-1', target: 'math-a' },
        { id: 'e2', source: 'math-a', target: 'math-b' },
        { id: 'e3', source: 'math-b', target: 'math-a' }, // Cycle: math-a <-> math-b
        { id: 'e4', source: 'math-b', target: 'action-1' },
      ],
    };

    assert.throws(
      () => {
        compileGraph(cyclicGraph);
      },
      (err) => {
        assert.ok(err instanceof GraphValidationError, 'Error must be GraphValidationError');
        assert.match(err.message, /cycle detected/i);
        assert.ok(
          err.message.includes('math-a') || err.message.includes('math-b'),
          'Error message must specify nodes in cycle'
        );
        return true;
      }
    );
  });

  it('3. Graph with missing or orphan nodes is rejected with descriptive errors', () => {
    // 3a. Orphan math operation (disconnected output)
    const orphanGraph = {
      nodes: [
        {
          id: 'source-1',
          type: 'dataSource',
          data: { deviceId: 'turbine-01', sensorType: 'temp' },
        },
        {
          id: 'math-orphan',
          type: 'mathOperation',
          data: {
            label: 'Floating Filter',
            operation: 'threshold',
            operator: '>',
            thresholdValue: 50,
          },
        },
        {
          id: 'action-1',
          type: 'actionTrigger',
          data: { actionType: 'sms_alert', target: '+123456789' },
        },
      ],
      edges: [{ id: 'e1', source: 'source-1', target: 'action-1' }],
    };

    assert.throws(
      () => {
        parseGraph(orphanGraph);
      },
      (err) => {
        assert.ok(err instanceof GraphValidationError);
        assert.match(err.message, /Floating Filter/);
        return true;
      }
    );

    // 3b. Missing Data Source
    const noSourceGraph = {
      nodes: [
        {
          id: 'action-only',
          type: 'actionTrigger',
          data: { actionType: 'sms_alert', target: '+123456789' },
        },
      ],
      edges: [],
    };

    assert.throws(
      () => {
        parseGraph(noSourceGraph);
      },
      (err) => {
        assert.ok(err.message.includes('Data Source'));
        return true;
      }
    );
  });

  it('4. Feeding simulated readings through a compiled pipeline triggers action only when threshold is met', () => {
    const testBus = new Subject();
    const actionEvents = [];

    const graph = buildValidGraph(); // Threshold: > 80, device: turbine-01, sensor: temperature
    const pipeline = compileGraph(graph, {
      inputObservable: testBus,
      actionListener: (event) => actionEvents.push(event),
    });

    pipeline.start();

    // 1. Reading below threshold (75) -> Should NOT trigger
    testBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 75.0,
      timestamp: new Date(),
    });
    assert.strictEqual(actionEvents.length, 0, 'Value 75 should not trigger > 80 threshold');

    // 2. Reading above threshold (95) but DIFFERENT device (turbine-02) -> Should NOT trigger
    testBus.next({
      metadata: { deviceId: 'turbine-02', sensorType: 'temperature' },
      value: 95.0,
      timestamp: new Date(),
    });
    assert.strictEqual(actionEvents.length, 0, 'Different device should be filtered out');

    // 3. Reading above threshold (95) but DIFFERENT sensor (vibration) -> Should NOT trigger
    testBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'vibration' },
      value: 95.0,
      timestamp: new Date(),
    });
    assert.strictEqual(actionEvents.length, 0, 'Different sensor type should be filtered out');

    // 4. Reading matching device, sensor, and value > 80 (86.4) -> Should TRIGGER
    testBus.next({
      metadata: { deviceId: 'turbine-01', sensorType: 'temperature' },
      value: 86.4,
      timestamp: new Date(),
    });
    assert.strictEqual(actionEvents.length, 1, 'Valid reading above threshold must trigger action');
    assert.strictEqual(actionEvents[0].actionType, 'sms_alert');
    assert.strictEqual(actionEvents[0].target, '+1 (555) 019-2834');
    assert.strictEqual(actionEvents[0].reading.value, 86.4);

    pipeline.stop();
  });

  it('5. Moving average computes correctly over a sliding window', () => {
    const testBus = new Subject();
    const actionEvents = [];

    const maGraph = {
      version: '1.0.0',
      nodes: [
        {
          id: 'source-1',
          type: 'dataSource',
          data: { deviceId: 'turbine-01', sensorType: 'temperature' },
        },
        {
          id: 'ma-node',
          type: 'mathOperation',
          data: {
            label: '3-Sample MA',
            operation: 'moving_average',
            windowSize: 3,
          },
        },
        {
          id: 'action-sink',
          type: 'actionTrigger',
          data: { actionType: 'webhook', target: 'https://api.internal/stats' },
        },
      ],
      edges: [
        { id: 'e1', source: 'source-1', target: 'ma-node' },
        { id: 'e2', source: 'ma-node', target: 'action-sink' },
      ],
    };

    const pipeline = compileGraph(maGraph, {
      inputObservable: testBus,
      actionListener: (event) => actionEvents.push(event),
    });

    pipeline.start();

    // Stream 4 values: 10, 20, 30, 40
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 10 });
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 20 });
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 30 });
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 40 });

    assert.strictEqual(actionEvents.length, 4);

    // 1st emission: [10] -> avg = 10
    assert.strictEqual(actionEvents[0].reading.value, 10);
    // 2nd emission: [10, 20] -> avg = 15
    assert.strictEqual(actionEvents[1].reading.value, 15);
    // 3rd emission: [10, 20, 30] -> avg = 20
    assert.strictEqual(actionEvents[2].reading.value, 20);
    // 4th emission: [20, 30, 40] -> avg = 30
    assert.strictEqual(actionEvents[3].reading.value, 30);

    pipeline.stop();
  });

  it('6. A branched graph feeds both downstream branches independently using share()', () => {
    const testBus = new Subject();
    const branch1Events = [];
    const branch2Events = [];

    const branchedGraph = {
      version: '1.0.0',
      nodes: [
        {
          id: 'source-1',
          type: 'dataSource',
          data: { label: 'Temp Stream', deviceId: 'turbine-01', sensorType: 'temperature' },
        },
        // Branch 1: High temp critical alarm (> 90)
        {
          id: 'math-high',
          type: 'mathOperation',
          data: { label: 'High Alarm', operation: 'threshold', operator: '>', thresholdValue: 90 },
        },
        {
          id: 'action-high',
          type: 'actionTrigger',
          data: { label: 'High SMS', actionType: 'sms_alert', target: '+1-HIGH-ALARM' },
        },
        // Branch 2: Low temp freeze warning (< 20)
        {
          id: 'math-low',
          type: 'mathOperation',
          data: { label: 'Low Alarm', operation: 'threshold', operator: '<', thresholdValue: 20 },
        },
        {
          id: 'action-low',
          type: 'actionTrigger',
          data: { label: 'Low Webhook', actionType: 'webhook', target: 'https://iot.alert/freeze' },
        },
      ],
      edges: [
        // Fork from source-1 into two branches
        { id: 'e-src-high', source: 'source-1', target: 'math-high' },
        { id: 'e-high-act', source: 'math-high', target: 'action-high' },
        { id: 'e-src-low', source: 'source-1', target: 'math-low' },
        { id: 'e-low-act', source: 'math-low', target: 'action-low' },
      ],
    };

    const pipeline = compileGraph(branchedGraph, {
      inputObservable: testBus,
      actionListener: (event) => {
        if (event.nodeId === 'action-high') branch1Events.push(event);
        if (event.nodeId === 'action-low') branch2Events.push(event);
      },
    });

    pipeline.start();

    // 1. Normal reading (50) -> Neither branch should trigger
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 50 });
    assert.strictEqual(branch1Events.length, 0);
    assert.strictEqual(branch2Events.length, 0);

    // 2. High reading (95) -> Only branch 1 should trigger
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 95 });
    assert.strictEqual(branch1Events.length, 1);
    assert.strictEqual(branch2Events.length, 0);
    assert.strictEqual(branch1Events[0].target, '+1-HIGH-ALARM');

    // 3. Low reading (12) -> Only branch 2 should trigger
    testBus.next({ metadata: { deviceId: 'turbine-01', sensorType: 'temperature' }, value: 12 });
    assert.strictEqual(branch1Events.length, 1);
    assert.strictEqual(branch2Events.length, 1);
    assert.strictEqual(branch2Events[0].target, 'https://iot.alert/freeze');

    pipeline.stop();
  });
});
