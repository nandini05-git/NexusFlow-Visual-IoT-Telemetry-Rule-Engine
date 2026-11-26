import React, { useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, Radio, Activity } from 'lucide-react';
import { graphActivityStore } from '../../utils/graphActivityStore';

export default function DataSourceNode({ id, data, isConnectable }) {
  const { updateNodeData } = useReactFlow();
  const [activity, setActivity] = useState(() => graphActivityStore.getNodeState(id));

  useEffect(() => {
    return graphActivityStore.subscribeNode(id, (state) => {
      setActivity(state);
    });
  }, [id]);

  const deviceId = data.deviceId || 'turbine-01';
  const sensorType = data.sensorType || 'temperature';
  const unit = data.unit || '°C';

  const handleDeviceChange = (e) => {
    updateNodeData(id, { ...data, deviceId: e.target.value });
  };

  const handleSensorChange = (e) => {
    const newSensor = e.target.value;
    let newUnit = unit;
    if (newSensor === 'temperature') newUnit = '°C';
    else if (newSensor === 'vibration') newUnit = 'mm/s';
    else if (newSensor === 'pressure') newUnit = 'bar';
    else if (newSensor === 'power') newUnit = 'kW';
    updateNodeData(id, { ...data, sensorType: newSensor, unit: newUnit });
  };

  const hasError = !!data.hasError;
  const errorMessage = data.errorMessage;
  const isHot = activity.isHot;
  const eventCount = activity.count || 0;

  return (
    <div
      className={`flow-node flow-node-source ${hasError ? 'flow-node-error' : ''} ${isHot ? 'node-hot-active' : ''}`}
      title={hasError ? `Configuration issue: ${errorMessage}` : undefined}
    >
      <div className="flow-node-header">
        <Database size={16} className="text-cyan" />
        <span className="flow-node-title">{data.label || 'Data Source'}</span>
        {hasError ? (
          <span className="flow-node-error-badge" title={errorMessage}>
            ⚠️ Config Error
          </span>
        ) : isHot ? (
          <span className="node-active-pill" title="Live telemetry receiving">
            <span className="node-active-dot" />
            LIVE
          </span>
        ) : null}
      </div>

      <div className="flow-node-body">
        {hasError && <div className="node-error-callout">{errorMessage}</div>}
        <div className="node-config-field">
          <label>Target Device ID</label>
          <input
            type="text"
            value={deviceId}
            onChange={handleDeviceChange}
            className="node-input"
            placeholder="e.g. turbine-01"
          />
        </div>

        <div className="node-config-field">
          <label>Sensor Metric</label>
          <select value={sensorType} onChange={handleSensorChange} className="node-select">
            <option value="temperature">Temperature (°C)</option>
            <option value="vibration">Vibration (mm/s)</option>
            <option value="pressure">Pressure (bar)</option>
            <option value="power">Power Output (kW)</option>
            <option value="humidity">Humidity (%)</option>
            <option value="voltage">Voltage (V)</option>
          </select>
        </div>

        <div className="node-status-bar">
          <Radio size={12} className={`pulse-icon text-cyan ${isHot ? 'pulse-fast' : ''}`} />
          <span>
            Stream: {deviceId} ({sensorType})
          </span>
          {isHot && (
            <span className="node-event-count ml-auto">
              {eventCount > 1 ? `${eventCount} ev` : 'flow'}
            </span>
          )}
        </div>
      </div>

      {/* Output handle only (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={isConnectable}
        className="flow-handle handle-source"
      />
    </div>
  );
}
