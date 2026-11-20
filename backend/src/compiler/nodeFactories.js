import { filter, map, scan, tap } from 'rxjs';

/**
 * Node Factories Module
 *
 * Produces RxJS pipeable operators / transforms corresponding to each
 * React Flow node type (Data Sources, Math Operations, Action Triggers).
 */

/**
 * Extracts deviceId, sensorType, and numeric value from either flat
 * or nested (metadata) telemetry readings.
 */
export const extractTelemetryFields = (reading) => {
  if (!reading || typeof reading !== 'object')
    return { deviceId: null, sensorType: null, value: NaN };
  const metadata = reading.metadata || {};
  const deviceId = reading.deviceId || metadata.deviceId || null;
  const sensorType = reading.sensorType || metadata.sensorType || null;
  const rawValue = reading.value !== undefined ? reading.value : metadata.value;
  const value = Number(rawValue);
  return { deviceId, sensorType, value };
};

/**
 * Factory: Data Source Node
 * Filters the incoming telemetry stream by deviceId and sensorType.
 *
 * @param {Object} node - React Flow node definition
 * @returns {Function} RxJS operator function
 */
export const createDataSourceOperator = (node) => {
  const targetDevice = (node.data?.deviceId || '').trim().toLowerCase();
  const targetSensor = (node.data?.sensorType || '').trim().toLowerCase();

  return filter((reading) => {
    const { deviceId, sensorType, value } = extractTelemetryFields(reading);
    if (isNaN(value)) return false;

    const matchDevice = !targetDevice || (deviceId && deviceId.toLowerCase() === targetDevice);
    const matchSensor = !targetSensor || (sensorType && sensorType.toLowerCase() === targetSensor);

    return Boolean(matchDevice && matchSensor);
  });
};

/**
 * Factory: Math Operation Node
 * Supported operations:
 *  - threshold: >, >=, <, <=, ==, != against thresholdValue
 *  - moving_average: computes rolling mean over windowSize
 *  - sum: rolling or cumulative sum over windowSize
 *  - min: rolling or cumulative min
 *  - max: rolling or cumulative max
 *
 * @param {Object} node - React Flow node definition
 * @returns {Array<Function>} List of RxJS operators to pipe
 */
export const createMathOperationOperators = (node) => {
  const data = node.data || {};
  const operation = data.operation || 'threshold';

  switch (operation) {
    case 'threshold': {
      const operator = data.operator || '>';
      const thresholdVal = Number(data.thresholdValue !== undefined ? data.thresholdValue : 80);

      return [
        filter((reading) => {
          const { value } = extractTelemetryFields(reading);
          if (isNaN(value)) return false;

          switch (operator) {
            case '>':
              return value > thresholdVal;
            case '>=':
              return value >= thresholdVal;
            case '<':
              return value < thresholdVal;
            case '<=':
              return value <= thresholdVal;
            case '==':
              return value === thresholdVal;
            case '!=':
              return value !== thresholdVal;
            default:
              return value > thresholdVal;
          }
        }),
      ];
    }

    case 'moving_average': {
      const windowSize = Math.max(1, parseInt(data.windowSize, 10) || 5);

      return [
        scan(
          (acc, reading) => {
            const { value } = extractTelemetryFields(reading);
            const window = [...acc.window, value].slice(-windowSize);
            const sum = window.reduce((a, b) => a + b, 0);
            const avg = Number((sum / window.length).toFixed(2));

            return {
              window,
              reading: {
                ...reading,
                value: avg,
                raw: value,
                computedBy: 'moving_average',
                windowSize,
                samplesInWindow: window.length,
              },
            };
          },
          { window: [], reading: null }
        ),
        map((state) => state.reading),
      ];
    }

    case 'sum': {
      const windowSize = data.windowSize ? parseInt(data.windowSize, 10) : null;

      return [
        scan(
          (acc, reading) => {
            const { value } = extractTelemetryFields(reading);
            const window = windowSize
              ? [...acc.window, value].slice(-windowSize)
              : [...acc.window, value];
            const sum = Number(window.reduce((a, b) => a + b, 0).toFixed(2));

            return {
              window,
              reading: {
                ...reading,
                value: sum,
                raw: value,
                computedBy: 'sum',
                windowSize: windowSize || 'cumulative',
              },
            };
          },
          { window: [], reading: null }
        ),
        map((state) => state.reading),
      ];
    }

    case 'min': {
      const windowSize = data.windowSize ? parseInt(data.windowSize, 10) : null;

      return [
        scan(
          (acc, reading) => {
            const { value } = extractTelemetryFields(reading);
            const window = windowSize
              ? [...acc.window, value].slice(-windowSize)
              : [...acc.window, value];
            const minVal = Math.min(...window);

            return {
              window,
              reading: {
                ...reading,
                value: minVal,
                raw: value,
                computedBy: 'min',
              },
            };
          },
          { window: [], reading: null }
        ),
        map((state) => state.reading),
      ];
    }

    case 'max': {
      const windowSize = data.windowSize ? parseInt(data.windowSize, 10) : null;

      return [
        scan(
          (acc, reading) => {
            const { value } = extractTelemetryFields(reading);
            const window = windowSize
              ? [...acc.window, value].slice(-windowSize)
              : [...acc.window, value];
            const maxVal = Math.max(...window);

            return {
              window,
              reading: {
                ...reading,
                value: maxVal,
                raw: value,
                computedBy: 'max',
              },
            };
          },
          { window: [], reading: null }
        ),
        map((state) => state.reading),
      ];
    }

    default:
      return [map((reading) => reading)];
  }
};

/**
 * Factory: Action Trigger Node
 * Stubs action delivery (logging "ACTION: <type> triggered" with reading & rule name).
 * Supports an optional execution listener for test assertions.
 *
 * @param {Object} node - React Flow node definition
 * @param {string} ruleName - Name of the parent rule graph
 * @param {Function} [actionListener] - Optional callback invoked on trigger
 * @returns {Array<Function>} List of RxJS operators to pipe
 */
export const createActionTriggerOperators = (
  node,
  ruleName = 'Rule Graph',
  actionListener = null
) => {
  const data = node.data || {};
  const actionType = data.actionType || 'sms_alert';
  const target = data.target || 'N/A';

  return [
    tap((reading) => {
      const { deviceId, sensorType, value } = extractTelemetryFields(reading);
      const logMessage = `[ACTION TRIGGERED] Rule: "${ruleName}" | Action: ${actionType.toUpperCase()} | Target: ${target} | Device: ${deviceId} | ${sensorType}: ${value}`;

      console.log(
        `\n======================================================\n${logMessage}\n======================================================`
      );

      if (typeof actionListener === 'function') {
        actionListener({
          ruleName,
          nodeId: node.id,
          actionType,
          target,
          reading,
          cooldownSeconds: data.cooldownSeconds !== undefined ? Number(data.cooldownSeconds) : 10,
          template: data.template || null,
          triggeredAt: new Date().toISOString(),
        });
      }
    }),
  ];
};
