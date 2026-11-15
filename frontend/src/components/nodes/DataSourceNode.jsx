import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, Radio } from 'lucide-react';

export default function DataSourceNode({ id, data, isConnectable }) {
  const { updateNodeData } = useReactFlow();

  const deviceId = data.deviceId || 'turbine-01';
  const sensorType = data.sensorType || 'temperature';
  const unit = data.unit || '°C';

  const handleDeviceChange = (e) => {
    updateNodeData(id, { ...data, deviceId: e.target.value });
  };

  const handleSensorChange = (e) => {
    const newSensor = e.target.value;
    let newUnit = '°C';
    if (newSensor === 'vibration') newUnit = 'mm/s';
    if (newSensor === 'pressure') newUnit = 'bar';
    if (newSensor === 'power') newUnit = 'kW';
    updateNodeData(id, { ...data, sensorType: newSensor, unit: newUnit });
  };

  return (
    <div className="flow-node flow-node-source">
      <div className="flow-node-header">
        <Database size={16} className="text-cyan" />
        <span className="flow-node-title">{data.label || 'Data Source'}</span>
      </div>

      <div className="flow-node-body">
        <div className="node-config-field">
          <label>Target Device</label>
          <select value={deviceId} onChange={handleDeviceChange} className="node-select">
            <option value="turbine-01">Turbine-01 (Primary)</option>
            <option value="turbine-02">Turbine-02 (Auxiliary)</option>
            <option value="compressor-03">Compressor-03</option>
            <option value="generator-04">Generator-04</option>
            <option value="pump-05">Water Pump-05</option>
          </select>
        </div>

        <div className="node-config-field">
          <label>Sensor Metric</label>
          <select value={sensorType} onChange={handleSensorChange} className="node-select">
            <option value="temperature">Temperature (°C)</option>
            <option value="vibration">Vibration (mm/s)</option>
            <option value="pressure">Pressure (bar)</option>
            <option value="power">Power Output (kW)</option>
          </select>
        </div>

        <div className="node-status-bar">
          <Radio size={12} className="pulse-icon text-cyan" />
          <span>Active Ingest Stream</span>
        </div>
      </div>

      {/* Output handle only */}
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
