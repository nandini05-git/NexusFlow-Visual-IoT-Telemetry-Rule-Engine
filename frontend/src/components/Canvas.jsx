import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Cpu, Zap, Activity } from 'lucide-react';

// Custom Node: Data Source
const DataSourceNode = ({ data }) => {
  return (
    <div className="flow-node flow-node-source">
      <div className="flow-node-header">
        <Database size={16} className="text-cyan" />
        <span className="flow-node-title">{data.label || 'Data Source'}</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-metric">
          <Activity size={12} className="pulse-icon text-cyan" />
          <span>Device: turbine-01</span>
        </div>
        <span className="flow-badge">IoT Ingestion</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="flow-handle handle-source"
      />
    </div>
  );
};

// Custom Node: Math Operation
const MathOperationNode = ({ data }) => {
  return (
    <div className="flow-node flow-node-math">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="flow-handle handle-target"
      />
      <div className="flow-node-header">
        <Cpu size={16} className="text-purple" />
        <span className="flow-node-title">{data.label || 'Math Operation'}</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-metric">
          <span>Condition: Value &gt; 80°C</span>
        </div>
        <span className="flow-badge badge-purple">Rule Evaluation</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="flow-handle handle-source"
      />
    </div>
  );
};

// Custom Node: Action Trigger
const ActionTriggerNode = ({ data }) => {
  return (
    <div className="flow-node flow-node-action">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="flow-handle handle-target"
      />
      <div className="flow-node-header">
        <Zap size={16} className="text-orange" />
        <span className="flow-node-title">{data.label || 'Action Trigger'}</span>
      </div>
      <div className="flow-node-body">
        <div className="flow-node-metric">
          <span>Webhook: Cooling Actuator</span>
        </div>
        <span className="flow-badge badge-orange">Alert Trigger</span>
      </div>
    </div>
  );
};

const nodeTypes = {
  dataSource: DataSourceNode,
  mathOperation: MathOperationNode,
  actionTrigger: ActionTriggerNode,
};

const initialNodes = [
  {
    id: 'node-1',
    type: 'dataSource',
    position: { x: 80, y: 160 },
    data: { label: 'Turbine-01 (Temp)', category: 'Inputs', type: 'dataSource' },
  },
  {
    id: 'node-2',
    type: 'mathOperation',
    position: { x: 380, y: 160 },
    data: { label: 'Threshold Rule (> 80°C)', category: 'Processors', type: 'mathOperation' },
  },
  {
    id: 'node-3',
    type: 'actionTrigger',
    position: { x: 680, y: 160 },
    data: { label: 'Emergency Cooling Actuator', category: 'Outputs', type: 'actionTrigger' },
  },
];

const initialEdges = [
  {
    id: 'edge-1-2',
    source: 'node-1',
    target: 'node-2',
    sourceHandle: 'output',
    targetHandle: 'input',
    animated: true,
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  },
  {
    id: 'edge-2-3',
    source: 'node-2',
    target: 'node-3',
    sourceHandle: 'output',
    targetHandle: 'input',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2 },
  },
];

let idCounter = 4;
const getId = () => `node-${idCounter++}`;

function CanvasInner() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#38bdf8', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;

      try {
        const nodeInfo = JSON.parse(rawData);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = {
          id: getId(),
          type: nodeInfo.type,
          position,
          data: {
            label: `${nodeInfo.label} #${idCounter - 1}`,
            category: nodeInfo.category,
            type: nodeInfo.type,
          },
        };

        setNodes((nds) => nds.concat(newNode));
      } catch (err) {
        console.error('Failed to parse dropped node data:', err);
      }
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls className="flow-controls-custom" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="flow-minimap-custom"
          nodeColor={(n) => {
            if (n.type === 'dataSource') return '#38bdf8';
            if (n.type === 'mathOperation') return '#a855f7';
            if (n.type === 'actionTrigger') return '#f97316';
            return '#64748b';
          }}
        />
        <Background color="#334155" gap={20} size={1.2} />
      </ReactFlow>
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
