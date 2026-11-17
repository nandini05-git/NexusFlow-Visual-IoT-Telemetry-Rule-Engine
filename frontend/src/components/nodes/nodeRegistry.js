import DataSourceNode from './DataSourceNode';
import MathOperationNode from './MathOperationNode';
import ActionTriggerNode from './ActionTriggerNode';
import {
  Database,
  Thermometer,
  Cpu,
  Calculator,
  Filter,
  Sigma,
  TrendingDown,
  TrendingUp,
  Zap,
  MessageSquare,
  Globe,
  Sliders,
} from 'lucide-react';

/**
 * React Flow Node Type Mapping
 */
export const nodeTypes = {
  dataSource: DataSourceNode,
  mathOperation: MathOperationNode,
  actionTrigger: ActionTriggerNode,
};

/**
 * Node Catalog Metadata & Templates
 * Organized into categories for the sidebar palette.
 */
export const NODE_CATALOG = [
  // -------------------------------------------------------------
  // Category 1: Data Sources
  // -------------------------------------------------------------
  {
    category: 'Data Sources',
    categoryIcon: Database,
    items: [
      {
        type: 'dataSource',
        variant: 'turbine_sensor',
        label: 'Turbine Sensor',
        description: 'Industrial turbine monitoring (vibration, temp, pressure)',
        icon: Database,
        color: '#38bdf8',
        bgColor: 'rgba(56, 189, 248, 0.1)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        defaultData: {
          label: 'Turbine Sensor',
          deviceId: 'turbine-01',
          sensorType: 'temperature',
          unit: '°C',
        },
      },
      {
        type: 'dataSource',
        variant: 'temperature_sensor',
        label: 'Temperature Sensor',
        description: 'Ambient & equipment thermal probe stream',
        icon: Thermometer,
        color: '#06b6d4',
        bgColor: 'rgba(6, 182, 212, 0.1)',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        defaultData: {
          label: 'Temperature Sensor',
          deviceId: 'temp-sensor-01',
          sensorType: 'temperature',
          unit: '°C',
        },
      },
      {
        type: 'dataSource',
        variant: 'custom_device',
        label: 'Custom Device',
        description: 'Configurable hardware device ID & telemetry metric',
        icon: Sliders,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        defaultData: {
          label: 'Custom Device',
          deviceId: 'device-custom-01',
          sensorType: 'pressure',
          unit: 'bar',
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // Category 2: Math Operations
  // -------------------------------------------------------------
  {
    category: 'Math Operations',
    categoryIcon: Cpu,
    items: [
      {
        type: 'mathOperation',
        variant: 'threshold',
        label: 'Threshold Filter',
        description: 'Passes readings when value breaches comparison threshold',
        icon: Filter,
        color: '#a855f7',
        bgColor: 'rgba(168, 85, 247, 0.1)',
        borderColor: 'rgba(168, 85, 247, 0.3)',
        defaultData: {
          label: 'Threshold Filter',
          operation: 'threshold',
          operator: '>',
          thresholdValue: 80,
          windowSize: 5,
        },
      },
      {
        type: 'mathOperation',
        variant: 'moving_average',
        label: 'Moving Average',
        description: 'Smooths noisy sensor readings over N-sample window',
        icon: Calculator,
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.1)',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        defaultData: {
          label: 'Moving Average',
          operation: 'moving_average',
          windowSize: 5,
        },
      },
      {
        type: 'mathOperation',
        variant: 'sum',
        label: 'Sum Accumulator',
        description: 'Aggregates cumulative or windowed telemetry sum',
        icon: Sigma,
        color: '#c084fc',
        bgColor: 'rgba(192, 132, 252, 0.1)',
        borderColor: 'rgba(192, 132, 252, 0.3)',
        defaultData: {
          label: 'Sum Accumulator',
          operation: 'sum',
          windowSize: 10,
        },
      },
      {
        type: 'mathOperation',
        variant: 'min',
        label: 'Min Tracker',
        description: 'Tracks lowest recorded telemetry value over window',
        icon: TrendingDown,
        color: '#a78bfa',
        bgColor: 'rgba(167, 139, 250, 0.1)',
        borderColor: 'rgba(167, 139, 250, 0.3)',
        defaultData: {
          label: 'Min Tracker',
          operation: 'min',
          windowSize: 5,
        },
      },
      {
        type: 'mathOperation',
        variant: 'max',
        label: 'Max Tracker',
        description: 'Tracks highest peak telemetry value over window',
        icon: TrendingUp,
        color: '#e879f9',
        bgColor: 'rgba(232, 121, 249, 0.1)',
        borderColor: 'rgba(232, 121, 249, 0.3)',
        defaultData: {
          label: 'Max Tracker',
          operation: 'max',
          windowSize: 5,
        },
      },
    ],
  },

  // -------------------------------------------------------------
  // Category 3: Action Triggers
  // -------------------------------------------------------------
  {
    category: 'Action Triggers',
    categoryIcon: Zap,
    items: [
      {
        type: 'actionTrigger',
        variant: 'sms_alert',
        label: 'SMS Alert',
        description: 'Dispatches emergency SMS notification to on-call engineer',
        icon: MessageSquare,
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        borderColor: 'rgba(249, 115, 22, 0.3)',
        defaultData: {
          label: 'SMS Alert',
          actionType: 'sms_alert',
          target: '+1 (555) 019-2834',
          template: 'ALERT: {{device}} {{metric}} threshold breached: {{value}}',
        },
      },
      {
        type: 'actionTrigger',
        variant: 'webhook',
        label: 'REST Webhook',
        description: 'Sends automated HTTP payload to external cloud service',
        icon: Globe,
        color: '#fb923c',
        bgColor: 'rgba(251, 146, 60, 0.1)',
        borderColor: 'rgba(251, 146, 60, 0.3)',
        defaultData: {
          label: 'REST Webhook',
          actionType: 'webhook',
          target: 'https://api.iot-dispatch.com/alerts',
          method: 'POST',
        },
      },
    ],
  },
];
