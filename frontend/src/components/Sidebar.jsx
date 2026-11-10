import React from 'react';
import { Database, Cpu, Zap, Info, Layers } from 'lucide-react';

const NODE_TEMPLATES = [
  {
    type: 'dataSource',
    label: 'Data Source',
    description: 'Ingest live telemetry from IoT devices (e.g. Turbine Temp)',
    icon: Database,
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    category: 'Inputs',
  },
  {
    type: 'mathOperation',
    label: 'Math Operation',
    description: 'Compute thresholds, moving averages, or scale metrics',
    icon: Cpu,
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    category: 'Processors',
  },
  {
    type: 'actionTrigger',
    label: 'Action Trigger',
    description: 'Trigger webhooks, alert notifications, or actuator signals',
    icon: Zap,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    category: 'Outputs',
  },
];

export default function Sidebar() {
  const onDragStart = (event, nodeData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="nexus-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <Layers className="icon-subtle" size={18} />
          <h2>Node Palette</h2>
        </div>
        <p className="sidebar-description">
          Drag and drop nodes onto the canvas to construct your IoT telemetry pipeline.
        </p>
      </div>

      <div className="nodes-container">
        {NODE_TEMPLATES.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              className="draggable-node-card"
              style={{
                borderColor: node.borderColor,
                '--hover-bg': node.bgColor,
              }}
              draggable
              onDragStart={(e) => onDragStart(e, node)}
            >
              <div className="node-card-top">
                <div
                  className="node-icon-wrapper"
                  style={{ backgroundColor: node.bgColor, color: node.color }}
                >
                  <Icon size={18} />
                </div>
                <div className="node-title-group">
                  <span className="node-label">{node.label}</span>
                  <span className="node-category">{node.category}</span>
                </div>
              </div>
              <p className="node-summary">{node.description}</p>
              <div className="drag-handle-hint">
                <span>⋮⋮ Drag to Canvas</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="help-box">
          <Info size={16} className="help-icon" />
          <p>
            Connect outputs to inputs to build reactive telemetry event flows.
          </p>
        </div>
      </div>
    </aside>
  );
}
