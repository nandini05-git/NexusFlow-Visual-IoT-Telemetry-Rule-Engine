import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, BellRing, Webhook } from 'lucide-react';

export default function ActionTriggerNode({ id, data, isConnectable }) {
  const { updateNodeData } = useReactFlow();

  const actionType = data.actionType || 'sms_alert';
  const target = data.target || (actionType === 'sms_alert' ? '+1 (555) 019-2834' : 'https://api.iot-dispatch.com/valve/cool');

  const handleActionChange = (e) => {
    const newType = e.target.value;
    const defaultTarget = newType === 'sms_alert' ? '+1 (555) 019-2834' : 'https://api.iot-dispatch.com/valve/cool';
    updateNodeData(id, { ...data, actionType: newType, target: defaultTarget });
  };

  const handleTargetChange = (e) => {
    updateNodeData(id, { ...data, target: e.target.value });
  };

  return (
    <div className="flow-node flow-node-action">
      {/* Input handle only */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={isConnectable}
        className="flow-handle handle-target"
      />

      <div className="flow-node-header">
        <Zap size={16} className="text-orange" />
        <span className="flow-node-title">{data.label || 'Action Trigger'}</span>
      </div>

      <div className="flow-node-body">
        <div className="node-config-field">
          <label>Action Dispatcher</label>
          <select value={actionType} onChange={handleActionChange} className="node-select">
            <option value="sms_alert">SMS Alert Notification</option>
            <option value="webhook">REST Webhook Dispatcher</option>
          </select>
        </div>

        <div className="node-config-field">
          <label>{actionType === 'sms_alert' ? 'Emergency Phone Number' : 'Target Endpoint URL'}</label>
          <input
            type="text"
            value={target}
            onChange={handleTargetChange}
            placeholder={actionType === 'sms_alert' ? '+1 (555) ...' : 'https://...'}
            className="node-input"
          />
        </div>

        <div className="node-status-bar">
          {actionType === 'sms_alert' ? (
            <BellRing size={12} className="text-orange" />
          ) : (
            <Webhook size={12} className="text-orange" />
          )}
          <span>Standby for Trigger</span>
        </div>
      </div>
    </div>
  );
}
