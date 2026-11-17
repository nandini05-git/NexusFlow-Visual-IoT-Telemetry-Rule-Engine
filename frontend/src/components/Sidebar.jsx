import React from 'react';
import { Layers, Info } from 'lucide-react';
import { NODE_CATALOG } from './nodes/nodeRegistry';

export default function Sidebar() {
  const onDragStart = (event, item, categoryName) => {
    const payload = {
      type: item.type,
      variant: item.variant,
      label: item.label,
      category: categoryName,
      defaultData: item.defaultData,
    };
    event.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="nexus-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <Layers className="icon-subtle" size={18} />
          <h2>Node Library</h2>
        </div>
        <p className="sidebar-description">
          Drag nodes onto the canvas to construct your reactive telemetry DAG pipeline.
        </p>
      </div>

      <div className="nodes-container">
        {NODE_CATALOG.map((group) => {
          const GroupIcon = group.categoryIcon;
          return (
            <div key={group.category} className="sidebar-category-group">
              <div className="category-header">
                <GroupIcon size={14} className="category-icon" />
                <span className="category-title">{group.category}</span>
                <span className="category-count">{group.items.length}</span>
              </div>

              <div className="category-items">
                {group.items.map((node) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.variant || node.label}
                      className="draggable-node-card"
                      style={{
                        borderColor: node.borderColor,
                        '--hover-bg': node.bgColor,
                      }}
                      draggable
                      onDragStart={(e) => onDragStart(e, node, group.category)}
                    >
                      <div className="node-card-top">
                        <div
                          className="node-icon-wrapper"
                          style={{ backgroundColor: node.bgColor, color: node.color }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="node-title-group">
                          <span className="node-label">{node.label}</span>
                          <span className="node-category">{group.category}</span>
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
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="help-box">
          <Info size={15} className="help-icon" />
          <p>
            Connect Data Sources &rarr; Math Operations &rarr; Action Triggers.
          </p>
        </div>
      </div>
    </aside>
  );
}
