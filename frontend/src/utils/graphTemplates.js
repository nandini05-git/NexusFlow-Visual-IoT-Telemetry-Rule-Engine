/**
 * Ready-made Industrial Rule Graph Templates
 * Used for instant demonstration, test seeding, and DAG serialization proof.
 */

export const templateTurbineOverheat = {
  id: 'template-turbine-overheat',
  name: 'Turbine Overheat Sentinel',
  description: 'Single-source pipeline smoothing turbine temperature with a 5-reading moving average and triggering emergency SMS when exceeding 85°C.',
  graph: {
    version: '1.0.0',
    nodes: [
      {
        id: 'src-temp-1',
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
        id: 'math-ma-1',
        type: 'mathOperation',
        position: { x: 340, y: 150 },
        data: {
          label: 'Rolling Average (5s)',
          operation: 'moving_average',
          windowSize: 5,
        },
      },
      {
        id: 'math-thresh-1',
        type: 'mathOperation',
        position: { x: 630, y: 150 },
        data: {
          label: 'Critical Heat Filter (>85°C)',
          operation: 'threshold',
          operator: '>',
          thresholdValue: 85.0,
        },
      },
      {
        id: 'act-sms-1',
        type: 'actionTrigger',
        position: { x: 920, y: 150 },
        data: {
          label: 'Emergency Cooling SMS',
          actionType: 'sms_alert',
          target: '+1 (555) 019-2834',
          template: 'CRITICAL: Turbine-01 temperature {{value}}°C exceeds 85°C limit!',
          cooldownSeconds: 10,
        },
      },
    ],
    edges: [
      {
        id: 'e-src-ma',
        source: 'src-temp-1',
        target: 'math-ma-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        animated: true,
        style: { stroke: '#38bdf8', strokeWidth: 2 },
      },
      {
        id: 'e-ma-thresh',
        source: 'math-ma-1',
        target: 'math-thresh-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        animated: true,
        style: { stroke: '#a855f7', strokeWidth: 2 },
      },
      {
        id: 'e-thresh-act',
        source: 'math-thresh-1',
        target: 'act-sms-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        animated: true,
        style: { stroke: '#f97316', strokeWidth: 2 },
      },
    ],
  },
};

export const templateTwoSensorBranching = {
  id: 'template-two-sensor-branching',
  name: 'Two-Sensor Comparison with Branching',
  description: 'Dual-source pipeline monitoring temperature and vibration with independent multi-branch alerts.',
  graph: {
    version: '1.0.0',
    nodes: [
      {
        id: 'src-temp-dual',
        type: 'dataSource',
        position: { x: 50, y: 80 },
        data: {
          label: 'Turbine-01 Temp',
          deviceId: 'turbine-01',
          sensorType: 'temperature',
          unit: '°C',
        },
      },
      {
        id: 'src-vib-dual',
        type: 'dataSource',
        position: { x: 50, y: 280 },
        data: {
          label: 'Turbine-01 Vibration',
          deviceId: 'turbine-01',
          sensorType: 'vibration',
          unit: 'mm/s',
        },
      },
      {
        id: 'math-temp-thresh',
        type: 'mathOperation',
        position: { x: 340, y: 80 },
        data: {
          label: 'Temp High (>80°C)',
          operation: 'threshold',
          operator: '>',
          thresholdValue: 80.0,
        },
      },
      {
        id: 'math-vib-ma',
        type: 'mathOperation',
        position: { x: 340, y: 280 },
        data: {
          label: 'Vib Rolling Avg (3s)',
          operation: 'moving_average',
          windowSize: 3,
        },
      },
      {
        id: 'math-vib-thresh',
        type: 'mathOperation',
        position: { x: 630, y: 280 },
        data: {
          label: 'Vib Spike (>3.5 mm/s)',
          operation: 'threshold',
          operator: '>',
          thresholdValue: 3.5,
        },
      },
      {
        id: 'act-dual-sms',
        type: 'actionTrigger',
        position: { x: 630, y: 80 },
        data: {
          label: 'On-Call Engineer SMS',
          actionType: 'sms_alert',
          target: '+1 (555) 777-9999',
          template: 'ALERT: Temperature threshold breached at {{value}}°C',
          cooldownSeconds: 10,
        },
      },
      {
        id: 'act-temp-log',
        type: 'actionTrigger',
        position: { x: 630, y: 180 },
        data: {
          label: 'Metrics Cloud Logger',
          actionType: 'webhook',
          target: 'https://metrics.cloud/iot/log',
          template: 'Temp Event: {{value}}',
          cooldownSeconds: 5,
        },
      },
      {
        id: 'act-dual-webhook',
        type: 'actionTrigger',
        position: { x: 920, y: 280 },
        data: {
          label: 'Incident Webhook',
          actionType: 'webhook',
          target: 'https://pagerduty.internal/api/v1/incidents',
          template: 'Vibration anomaly detected: {{value}} mm/s',
          cooldownSeconds: 15,
        },
      },
    ],
    edges: [
      { id: 'e-temp-thresh', source: 'src-temp-dual', target: 'math-temp-thresh', animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } },
      { id: 'e-temp-sms', source: 'math-temp-thresh', target: 'act-dual-sms', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
      { id: 'e-temp-log-branch', source: 'math-temp-thresh', target: 'act-temp-log', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
      { id: 'e-vib-ma', source: 'src-vib-dual', target: 'math-vib-ma', animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } },
      { id: 'e-ma-vibthresh', source: 'math-vib-ma', target: 'math-vib-thresh', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
      { id: 'e-vibthresh-webhook', source: 'math-vib-thresh', target: 'act-dual-webhook', animated: true, style: { stroke: '#f97316', strokeWidth: 2 } },
    ],
  },
};

export const templateComplexIndustrialDAG = {
  id: 'template-complex-industrial-dag',
  name: 'Complex 15-Node Industrial Monitoring DAG',
  description: 'Enterprise 15-node, 13-edge DAG with 5 distinct processing branches for comprehensive turbine health analysis.',
  graph: {
    version: '1.0.0',
    nodes: [
      { id: 'src-temp', type: 'dataSource', position: { x: 50, y: 100 }, data: { label: 'Turbine Temp Sensor', deviceId: 'turbine-01', sensorType: 'temperature', unit: '°C' } },
      { id: 'src-vib', type: 'dataSource', position: { x: 50, y: 350 }, data: { label: 'Turbine Vibration Sensor', deviceId: 'turbine-01', sensorType: 'vibration', unit: 'mm/s' } },
      { id: 'math-crit-thresh', type: 'mathOperation', position: { x: 340, y: 50 }, data: { label: 'Critical Temp (>90°C)', operation: 'threshold', operator: '>', thresholdValue: 90.0 } },
      { id: 'act-sms-crit', type: 'actionTrigger', position: { x: 630, y: 50 }, data: { label: 'Emergency Evac SMS', actionType: 'sms_alert', target: '+1-911-ALERT', cooldownSeconds: 5 } },
      { id: 'math-temp-ma', type: 'mathOperation', position: { x: 340, y: 150 }, data: { label: 'Temp Moving Avg (5s)', operation: 'moving_average', windowSize: 5 } },
      { id: 'math-warn-thresh', type: 'mathOperation', position: { x: 630, y: 150 }, data: { label: 'Warning Filter (>75°C)', operation: 'threshold', operator: '>', thresholdValue: 75.0 } },
      { id: 'act-webhook-warn', type: 'actionTrigger', position: { x: 920, y: 150 }, data: { label: 'Maintenance Webhook', actionType: 'webhook', target: 'https://maint.corp/warn', cooldownSeconds: 15 } },
      { id: 'math-temp-min', type: 'mathOperation', position: { x: 340, y: 250 }, data: { label: 'Rolling Min Tracker', operation: 'min' } },
      { id: 'math-freeze-thresh', type: 'mathOperation', position: { x: 630, y: 250 }, data: { label: 'Sub-Zero Filter (<0°C)', operation: 'threshold', operator: '<', thresholdValue: 0.0 } },
      { id: 'act-freeze-sms', type: 'actionTrigger', position: { x: 920, y: 250 }, data: { label: 'Anti-Freeze Alarm SMS', actionType: 'sms_alert', target: '+1-FREEZE-ALERT', cooldownSeconds: 30 } },
      { id: 'math-vib-max', type: 'mathOperation', position: { x: 340, y: 350 }, data: { label: 'Vibration Max Peak', operation: 'max' } },
      { id: 'math-vib-thresh', type: 'mathOperation', position: { x: 630, y: 350 }, data: { label: 'Vibration Spike (>4.5)', operation: 'threshold', operator: '>', thresholdValue: 4.5 } },
      { id: 'act-vib-log', type: 'actionTrigger', position: { x: 920, y: 350 }, data: { label: 'Acoustic Diagnostic Log', actionType: 'webhook', target: 'https://log.diagnostics.io', cooldownSeconds: 10 } },
      { id: 'math-vib-sum', type: 'mathOperation', position: { x: 340, y: 450 }, data: { label: 'Energy Accumulator', operation: 'sum' } },
      { id: 'act-vib-webhook', type: 'actionTrigger', position: { x: 630, y: 450 }, data: { label: 'Energy Dispatch Webhook', actionType: 'webhook', target: 'https://grid.power/meter', cooldownSeconds: 20 } },
    ],
    edges: [
      { id: 'e1', source: 'src-temp', target: 'math-crit-thresh' },
      { id: 'e2', source: 'math-crit-thresh', target: 'act-sms-crit' },
      { id: 'e3', source: 'src-temp', target: 'math-temp-ma' },
      { id: 'e4', source: 'math-temp-ma', target: 'math-warn-thresh' },
      { id: 'e5', source: 'math-warn-thresh', target: 'act-webhook-warn' },
      { id: 'e6', source: 'src-temp', target: 'math-temp-min' },
      { id: 'e7', source: 'math-temp-min', target: 'math-freeze-thresh' },
      { id: 'e8', source: 'math-freeze-thresh', target: 'act-freeze-sms' },
      { id: 'e9', source: 'src-vib', target: 'math-vib-max' },
      { id: 'e10', source: 'math-vib-max', target: 'math-vib-thresh' },
      { id: 'e11', source: 'math-vib-thresh', target: 'act-vib-log' },
      { id: 'e12', source: 'src-vib', target: 'math-vib-sum' },
      { id: 'e13', source: 'math-vib-sum', target: 'act-vib-webhook' },
    ],
  },
};

export const GRAPH_TEMPLATES = [
  templateTurbineOverheat,
  templateTwoSensorBranching,
  templateComplexIndustrialDAG,
];
