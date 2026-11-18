import { describe, it, expect } from 'vitest';
import { serializeGraph, validateGraph } from './serializeGraph.js';

describe('NexusFlow Graph Serialization & Topology Validation Proof', () => {
  // 1. Simple 3-node graph
  it('1. Serializes and validates a simple 3-node linear pipeline', () => {
    const nodes = [
      {
        id: 'source-1',
        type: 'dataSource',
        position: { x: 50, y: 100 },
        data: { label: 'Turbine Temp', deviceId: 'turbine-01', sensorType: 'temperature' },
      },
      {
        id: 'math-1',
        type: 'mathOperation',
        position: { x: 300, y: 100 },
        data: { label: 'Overheat Threshold', operation: 'threshold', operator: '>', thresholdValue: 80 },
      },
      {
        id: 'action-1',
        type: 'actionTrigger',
        position: { x: 600, y: 100 },
        data: { label: 'SMS Dispatch', actionType: 'sms_alert', target: '+15551234567' },
      },
    ];

    const edges = [
      { id: 'e1', source: 'source-1', target: 'math-1' },
      { id: 'e2', source: 'math-1', target: 'action-1' },
    ];

    const serialized = serializeGraph(nodes, edges);

    expect(serialized.version).toBe('1.0.0');
    expect(serialized.metadata.nodeCount).toBe(3);
    expect(serialized.metadata.edgeCount).toBe(2);
    expect(serialized.nodes).toHaveLength(3);
    expect(serialized.edges).toHaveLength(2);

    const validation = validateGraph(nodes, edges);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  // 2. Complex graph with 12+ nodes and branching
  it('2. Serializes and validates a complex 15-node multi-branching DAG', () => {
    const complexNodes = [
      // 2 Data Sources
      { id: 'src-temp', type: 'dataSource', position: { x: 0, y: 100 }, data: { label: 'Turbine Temp', deviceId: 'turbine-01', sensorType: 'temperature' } },
      { id: 'src-vib', type: 'dataSource', position: { x: 0, y: 400 }, data: { label: 'Turbine Vibration', deviceId: 'turbine-01', sensorType: 'vibration' } },

      // Branch A: Immediate Temp Alert
      { id: 'math-high-thresh', type: 'mathOperation', position: { x: 250, y: 50 }, data: { label: 'Critical > 90', operation: 'threshold', operator: '>', thresholdValue: 90 } },
      { id: 'act-sms-crit', type: 'actionTrigger', position: { x: 500, y: 50 }, data: { label: 'Critical SMS', actionType: 'sms_alert', target: '+19998887777' } },

      // Branch B: Temp Smoothing & Warning
      { id: 'math-temp-ma', type: 'mathOperation', position: { x: 250, y: 150 }, data: { label: '5-Sample MA', operation: 'moving_average', windowSize: 5 } },
      { id: 'math-warn-thresh', type: 'mathOperation', position: { x: 500, y: 150 }, data: { label: 'Warning > 80', operation: 'threshold', operator: '>', thresholdValue: 80 } },
      { id: 'act-webhook-warn', type: 'actionTrigger', position: { x: 750, y: 150 }, data: { label: 'Warning Webhook', actionType: 'webhook', target: 'https://api.iot/warning' } },

      // Branch C: Low Temp / Freezing Detection
      { id: 'math-temp-min', type: 'mathOperation', position: { x: 250, y: 250 }, data: { label: 'Min Temp Window', operation: 'min', windowSize: 10 } },
      { id: 'math-freeze-thresh', type: 'mathOperation', position: { x: 500, y: 250 }, data: { label: 'Freeze < 15', operation: 'threshold', operator: '<', thresholdValue: 15 } },
      { id: 'act-freeze-sms', type: 'actionTrigger', position: { x: 750, y: 250 }, data: { label: 'Freeze Alert', actionType: 'sms_alert', target: '+15554443333' } },

      // Branch D: Vibration Peak & Alarm
      { id: 'math-vib-max', type: 'mathOperation', position: { x: 250, y: 380 }, data: { label: 'Peak Vibration', operation: 'max', windowSize: 5 } },
      { id: 'math-vib-thresh', type: 'mathOperation', position: { x: 500, y: 380 }, data: { label: 'Vib Alarm > 15', operation: 'threshold', operator: '>', thresholdValue: 15 } },
      { id: 'act-vib-webhook', type: 'actionTrigger', position: { x: 750, y: 380 }, data: { label: 'Vib Webhook', actionType: 'webhook', target: 'https://api.iot/vibration' } },

      // Branch E: Vibration Accumulator
      { id: 'math-vib-sum', type: 'mathOperation', position: { x: 250, y: 480 }, data: { label: 'Energy Sum', operation: 'sum', windowSize: 10 } },
      { id: 'act-vib-log', type: 'actionTrigger', position: { x: 500, y: 480 }, data: { label: 'Audit Log Webhook', actionType: 'webhook', target: 'https://api.iot/audit' } },
    ];

    const complexEdges = [
      // Temp branches
      { id: 'e1', source: 'src-temp', target: 'math-high-thresh' },
      { id: 'e2', source: 'math-high-thresh', target: 'act-sms-crit' },

      { id: 'e3', source: 'src-temp', target: 'math-temp-ma' },
      { id: 'e4', source: 'math-temp-ma', target: 'math-warn-thresh' },
      { id: 'e5', source: 'math-warn-thresh', target: 'act-webhook-warn' },

      { id: 'e6', source: 'src-temp', target: 'math-temp-min' },
      { id: 'e7', source: 'math-temp-min', target: 'math-freeze-thresh' },
      { id: 'e8', source: 'math-freeze-thresh', target: 'act-freeze-sms' },

      // Vib branches
      { id: 'e9', source: 'src-vib', target: 'math-vib-max' },
      { id: 'e10', source: 'math-vib-max', target: 'math-vib-thresh' },
      { id: 'e11', source: 'math-vib-thresh', target: 'act-vib-webhook' },

      { id: 'e12', source: 'src-vib', target: 'math-vib-sum' },
      { id: 'e13', source: 'math-vib-sum', target: 'act-vib-log' },
    ];

    expect(complexNodes.length).toBeGreaterThanOrEqual(12);

    const serialized = serializeGraph(complexNodes, complexEdges);
    expect(serialized.nodes).toHaveLength(15);
    expect(serialized.edges).toHaveLength(13);

    const validation = validateGraph(complexNodes, complexEdges);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  // 3. Graph with every supported node type and math operation
  it('3. Supports every node variant: all data sources, math operations, and action triggers', () => {
    const allTypeNodes = [
      { id: 'src-1', type: 'dataSource', position: { x: 0, y: 0 }, data: { deviceId: 'turbine-01', sensorType: 'temperature' } },
      { id: 'm-thresh', type: 'mathOperation', position: { x: 200, y: 0 }, data: { operation: 'threshold', operator: '>=', thresholdValue: 50 } },
      { id: 'm-ma', type: 'mathOperation', position: { x: 400, y: 0 }, data: { operation: 'moving_average', windowSize: 3 } },
      { id: 'm-sum', type: 'mathOperation', position: { x: 600, y: 0 }, data: { operation: 'sum', windowSize: 5 } },
      { id: 'm-min', type: 'mathOperation', position: { x: 800, y: 0 }, data: { operation: 'min', windowSize: 5 } },
      { id: 'm-max', type: 'mathOperation', position: { x: 1000, y: 0 }, data: { operation: 'max', windowSize: 5 } },
      { id: 'act-sms', type: 'actionTrigger', position: { x: 1200, y: 0 }, data: { actionType: 'sms_alert', target: '+1234567890' } },
      { id: 'act-web', type: 'actionTrigger', position: { x: 1200, y: 100 }, data: { actionType: 'webhook', target: 'https://api.io/hook' } },
    ];

    const allTypeEdges = [
      { id: 'e1', source: 'src-1', target: 'm-thresh' },
      { id: 'e2', source: 'm-thresh', target: 'm-ma' },
      { id: 'e3', source: 'm-ma', target: 'm-sum' },
      { id: 'e4', source: 'm-sum', target: 'm-min' },
      { id: 'e5', source: 'm-min', target: 'm-max' },
      { id: 'e6', source: 'm-max', target: 'act-sms' },
      { id: 'e7', source: 'm-max', target: 'act-web' },
    ];

    const val = validateGraph(allTypeNodes, allTypeEdges);
    expect(val.isValid).toBe(true);
    expect(val.errors).toHaveLength(0);
  });

  // 4. Invalid graphs producing readable errors
  it('4a. Detects and reports cyclic dependency loops', () => {
    const cyclicNodes = [
      { id: 's1', type: 'dataSource', position: { x: 0, y: 0 }, data: { label: 'Source' } },
      { id: 'm1', type: 'mathOperation', position: { x: 100, y: 0 }, data: { label: 'Math A' } },
      { id: 'm2', type: 'mathOperation', position: { x: 200, y: 0 }, data: { label: 'Math B' } },
      { id: 'a1', type: 'actionTrigger', position: { x: 300, y: 0 }, data: { label: 'Action' } },
    ];

    const cyclicEdges = [
      { id: 'e1', source: 's1', target: 'm1' },
      { id: 'e2', source: 'm1', target: 'm2' },
      { id: 'e3', source: 'm2', target: 'm1' }, // Cycle: m1 <-> m2
      { id: 'e4', source: 'm2', target: 'a1' },
    ];

    const val = validateGraph(cyclicNodes, cyclicEdges);
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.toLowerCase().includes('circular') || e.toLowerCase().includes('cycle'))).toBe(true);
  });

  it('4b. Detects and reports orphan nodes', () => {
    const orphanNodes = [
      { id: 's1', type: 'dataSource', position: { x: 0, y: 0 }, data: { label: 'Source 1' } },
      { id: 'm-lost', type: 'mathOperation', position: { x: 100, y: 0 }, data: { label: 'Floating Processor' } },
      { id: 'a1', type: 'actionTrigger', position: { x: 200, y: 0 }, data: { label: 'Alert 1' } },
    ];

    const edges = [{ id: 'e1', source: 's1', target: 'a1' }];

    const val = validateGraph(orphanNodes, edges);
    expect(val.isValid).toBe(false);
    expect(val.errors.some((e) => e.includes('Floating Processor'))).toBe(true);
  });

  it('4c. Detects missing input Data Sources or missing output Action Triggers', () => {
    // Missing Action Trigger
    const noActionNodes = [
      { id: 's1', type: 'dataSource', position: { x: 0, y: 0 }, data: { label: 'Source' } },
      { id: 'm1', type: 'mathOperation', position: { x: 100, y: 0 }, data: { label: 'Math' } },
    ];
    const noActionEdges = [{ id: 'e1', source: 's1', target: 'm1' }];

    const val1 = validateGraph(noActionNodes, noActionEdges);
    expect(val1.isValid).toBe(false);
    expect(val1.errors.some((e) => e.includes('Action Trigger'))).toBe(true);

    // Missing Data Source
    const noSourceNodes = [
      { id: 'a1', type: 'actionTrigger', position: { x: 0, y: 0 }, data: { label: 'Action' } },
    ];
    const val2 = validateGraph(noSourceNodes, []);
    expect(val2.isValid).toBe(false);
    expect(val2.errors.some((e) => e.includes('Data Source'))).toBe(true);
  });

  // 5. Round-trip test: serialize -> deserialize -> serialize produces identical JSON
  it('5. Round-trip serialization idempotency (serialize -> deserialize -> serialize)', () => {
    const initialNodes = [
      { id: 'src-1', type: 'dataSource', position: { x: 60, y: 150 }, data: { label: 'Turbine Temp', deviceId: 'turbine-01', sensorType: 'temperature' } },
      { id: 'math-1', type: 'mathOperation', position: { x: 380, y: 150 }, data: { label: 'Threshold', operation: 'threshold', operator: '>', thresholdValue: 80 } },
      { id: 'act-1', type: 'actionTrigger', position: { x: 720, y: 150 }, data: { label: 'SMS Emergency', actionType: 'sms_alert', target: '+15550192834' } },
    ];

    const initialEdges = [
      { id: 'e1', source: 'src-1', target: 'math-1' },
      { id: 'e2', source: 'math-1', target: 'act-1' },
    ];

    // First serialization
    const serializedFirst = serializeGraph(initialNodes, initialEdges);

    // Simulated deserialization from stored JSON (re-hydrating React Flow nodes and edges)
    const rehydratedNodes = serializedFirst.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: { ...n.data },
    }));
    const rehydratedEdges = serializedFirst.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    }));

    // Second serialization
    const serializedSecond = serializeGraph(rehydratedNodes, rehydratedEdges);

    // Compare payload structure (ignoring ISO timestamp)
    expect(serializedFirst.version).toBe(serializedSecond.version);
    expect(serializedFirst.metadata.nodeCount).toBe(serializedSecond.metadata.nodeCount);
    expect(serializedFirst.metadata.edgeCount).toBe(serializedSecond.metadata.edgeCount);
    expect(serializedFirst.nodes).toEqual(serializedSecond.nodes);
    expect(serializedFirst.edges).toEqual(serializedSecond.edges);
  });
});
