import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Cpu, Activity } from 'lucide-react';

export default function MathOperationNode({ id, data, isConnectable }) {
  const { updateNodeData } = useReactFlow();

  const operation = data.operation || 'threshold';
  const operator = data.operator || '>';
  const thresholdValue = data.thresholdValue !== undefined ? data.thresholdValue : 80;
  const windowSize = data.windowSize || 5;

  const handleOpChange = (e) => {
    updateNodeData(id, { ...data, operation: e.target.value });
  };

  const handleOperatorChange = (e) => {
    updateNodeData(id, { ...data, operator: e.target.value });
  };

  const handleValueChange = (e) => {
    updateNodeData(id, { ...data, thresholdValue: parseFloat(e.target.value) || 0 });
  };

  const handleWindowChange = (e) => {
    updateNodeData(id, { ...data, windowSize: parseInt(e.target.value, 10) || 1 });
  };

  return (
    <div className="flow-node flow-node-math">
      {/* Input handle on the left */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="flow-handle handle-target"
      />

      <div className="flow-node-header">
        <Cpu size={16} className="text-purple" />
        <span className="flow-node-title">{data.label || 'Math Operation'}</span>
      </div>

      <div className="flow-node-body">
        <div className="node-config-field">
          <label>Operation Type</label>
          <select value={operation} onChange={handleOpChange} className="node-select">
            <option value="threshold">Threshold Filter</option>
            <option value="moving_average">Moving Average Window</option>
            <option value="sum">Cumulative Sum</option>
          </select>
        </div>

        {operation === 'threshold' && (
          <div className="node-config-row">
            <div className="node-config-field flex-1">
              <label>Condition</label>
              <select value={operator} onChange={handleOperatorChange} className="node-select">
                <option value=">">&gt; (Greater)</option>
                <option value=">=">&gt;= (At least)</option>
                <option value="<">&lt; (Less)</option>
                <option value="<=">&lt;= (At most)</option>
                <option value="==">== (Equals)</option>
              </select>
            </div>
            <div className="node-config-field flex-1">
              <label>Limit Value</label>
              <input
                type="number"
                value={thresholdValue}
                onChange={handleValueChange}
                className="node-input"
              />
            </div>
          </div>
        )}

        {operation === 'moving_average' && (
          <div className="node-config-field">
            <label>Window Size (samples)</label>
            <input
              type="number"
              min="2"
              max="100"
              value={windowSize}
              onChange={handleWindowChange}
              className="node-input"
            />
          </div>
        )}

        {operation === 'sum' && (
          <div className="node-status-bar">
            <Activity size={12} className="text-purple" />
            <span>Cumulative Accumulator</span>
          </div>
        )}
      </div>

      {/* Output handle on the right */}
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
