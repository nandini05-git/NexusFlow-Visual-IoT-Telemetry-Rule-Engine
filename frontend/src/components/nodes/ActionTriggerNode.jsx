import React from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Zap, BellRing, Webhook, MessageSquare } from 'lucide-react';

export default function ActionTriggerNode({ id, data, isConnectable }) {
  const { updateNodeData } = useReactFlow();

  const actionType = data.actionType || 'sms_alert';
  const target = data.target || (actionType === 'sms_alert' ? '+1 (555) 019-2834' : 'https://api.iot-dispatch.com/alerts');
  const method = data.method || 'POST';
  const template = data.template || 'ALERT: {{device}} metric breach ({{value}})';

  const handleActionChange = (e) => {
    const newType = e.target.value;
    const defaultTarget = newType === 'sms_alert' ? '+1 (555) 019-2834' : 'https://api.iot-dispatch.com/alerts';
    updateNodeData(id, { ...data, actionType: newType, target: defaultTarget });
  };

  const handleTargetChange = (e) => {
    updateNodeData(id, { ...data, target: e.target.value });
  };

  const handleMethodChange = (e) => {
    updateNodeData(id, { ...data, method: e.target.value });
  };

  const handleTemplateChange = (e) => {
    updateNodeData(id, { ...data, template: e.target.value });
  };

  return (
    <div className="flow-node flow-node-action">
      {/* Input handle only (left) */}
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

        {actionType === 'sms_alert' ? (
          <>
            <div className="node-config-field">
              <label>Emergency Phone Number</label>
              <input
                type="text"
                value={target}
                onChange={handleTargetChange}
                placeholder="+1 (555) 019-2834"
                className="node-input"
              />
            </div>
            <div className="node-config-field">
              <label>Message Template</label>
              <input
                type="text"
                value={template}
                onChange={handleTemplateChange}
                placeholder="ALERT: {{device}} breach"
                className="node-input"
              />
            </div>
          </>
        ) : (
          <>
            <div className="node-config-row">
              <div className="node-config-field" style={{ width: '85px' }}>
                <label>Method</label>
                <select value={method} onChange={handleMethodChange} className="node-select">
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              <div className="node-config-field flex-1">
                <label>Webhook URL</label>
                <input
                  type="text"
                  value={target}
                  onChange={handleTargetChange}
                  placeholder="https://api..."
                  className="node-input"
                />
              </div>
            </div>
          </>
        )}

        <div className="node-status-bar">
          {actionType === 'sms_alert' ? (
            <MessageSquare size={12} className="text-orange" />
          ) : (
            <Webhook size={12} className="text-orange" />
          )}
          <span>Standby for Trigger</span>
        </div>
      </div>
    </div>
  );
}
