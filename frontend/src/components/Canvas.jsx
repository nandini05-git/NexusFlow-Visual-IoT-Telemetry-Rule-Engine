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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DataSourceNode from './nodes/DataSourceNode';
import MathOperationNode from './nodes/MathOperationNode';
import ActionTriggerNode from './nodes/ActionTriggerNode';
import { validateGraph, serializeGraph, downloadGraphJson } from '../utils/serializeGraph';
import {
  Save,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  X,
  Code2,
  Layers,
  ZoomIn,
} from 'lucide-react';

// Defined outside component to prevent re-render loops in React Flow
const nodeTypes = {
  dataSource: DataSourceNode,
  mathOperation: MathOperationNode,
  actionTrigger: ActionTriggerNode,
};

const defaultInitialNodes = [
  {
    id: 'source-1',
    type: 'dataSource',
    position: { x: 60, y: 150 },
    data: {
      label: 'Turbine-01 (Temp)',
      deviceId: 'turbine-01',
      sensorType: 'temperature',
      unit: '°C',
    },
  },
  {
    id: 'math-1',
    type: 'mathOperation',
    position: { x: 380, y: 150 },
    data: {
      label: 'Threshold Filter',
      operation: 'threshold',
      operator: '>',
      thresholdValue: 80.0,
      windowSize: 5,
    },
  },
  {
    id: 'action-1',
    type: 'actionTrigger',
    position: { x: 720, y: 150 },
    data: {
      label: 'Emergency Cooling',
      actionType: 'sms_alert',
      target: '+1 (555) 019-2834',
    },
  },
];

const defaultInitialEdges = [
  {
    id: 'edge-source1-math1',
    source: 'source-1',
    target: 'math-1',
    sourceHandle: 'output',
    targetHandle: 'input',
    animated: true,
    style: { stroke: '#38bdf8', strokeWidth: 2 },
  },
  {
    id: 'edge-math1-action1',
    source: 'math-1',
    target: 'action-1',
    sourceHandle: 'output',
    targetHandle: 'input',
    animated: true,
    style: { stroke: '#a855f7', strokeWidth: 2 },
  },
];

let idCounter = 10;
const getId = (type) => `${type}-${Date.now()}-${idCounter++}`;

function CanvasInner() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultInitialEdges);
  const { screenToFlowPosition, getNode, getNodes, getEdges, fitView } = useReactFlow();

  // Serialization and validation UI state
  const [validationResult, setValidationResult] = useState(null);
  const [savedJsonData, setSavedJsonData] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(null);

  /**
   * Validate connections:
   * Rule: Data Source -> Math Operation -> Action Trigger only!
   * Blocks self-connections and invalid link topologies.
   */
  const isValidConnection = useCallback(
    (connection) => {
      // 1. Block self connection
      if (connection.source === connection.target) return false;

      const sourceNode = getNode(connection.source);
      const targetNode = getNode(connection.target);
      if (!sourceNode || !targetNode) return false;

      // 2. Data Source must connect to Math Operation or Action Trigger
      if (sourceNode.type === 'dataSource') {
        return targetNode.type === 'mathOperation' || targetNode.type === 'actionTrigger';
      }

      // 3. Math Operation can connect to another Math Operation or Action Trigger
      if (sourceNode.type === 'mathOperation') {
        return targetNode.type === 'mathOperation' || targetNode.type === 'actionTrigger';
      }

      // 4. Action Trigger has no outputs
      if (sourceNode.type === 'actionTrigger') {
        return false;
      }

      return false;
    },
    [getNode]
  );

  const onConnect = useCallback(
    (params) => {
      if (!isValidConnection(params)) {
        setConnectionNotice('Invalid link: Follow Data Source -> Math Operation -> Action Trigger flow.');
        setTimeout(() => setConnectionNotice(null), 4000);
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#38bdf8', strokeWidth: 2 },
          },
          eds
        )
      );
      setConnectionNotice(null);
    },
    [isValidConnection, setEdges]
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

        const newNodeId = getId(nodeInfo.type);

        let initialData = {
          label: `${nodeInfo.label} #${nodes.length + 1}`,
          category: nodeInfo.category,
          type: nodeInfo.type,
        };

        if (nodeInfo.type === 'dataSource') {
          initialData = {
            ...initialData,
            deviceId: 'turbine-01',
            sensorType: 'temperature',
            unit: '°C',
          };
        } else if (nodeInfo.type === 'mathOperation') {
          initialData = {
            ...initialData,
            operation: 'threshold',
            operator: '>',
            thresholdValue: 80,
            windowSize: 5,
          };
        } else if (nodeInfo.type === 'actionTrigger') {
          initialData = {
            ...initialData,
            actionType: 'sms_alert',
            target: '+1 (555) 019-2834',
          };
        }

        const newNode = {
          id: newNodeId,
          type: nodeInfo.type,
          position,
          data: initialData,
        };

        setNodes((nds) => nds.concat(newNode));
      } catch (err) {
        console.error('Failed to parse dropped node:', err);
      }
    },
    [screenToFlowPosition, nodes.length, setNodes]
  );

  // Delete selected nodes or edges
  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
  }, [setNodes, setEdges]);

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the canvas? All unsaved nodes and connections will be removed.')) {
      setNodes([]);
      setEdges([]);
      setValidationResult(null);
      setSavedJsonData(null);
    }
  }, [setNodes, setEdges]);

  // Reset to default sample pipeline
  const handleResetSample = useCallback(() => {
    setNodes(defaultInitialNodes);
    setEdges(defaultInitialEdges);
    setValidationResult(null);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [setNodes, setEdges, fitView]);

  // Save and Validate Graph
  const handleSaveGraph = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const result = validateGraph(currentNodes, currentEdges);
    setValidationResult(result);

    if (result.isValid) {
      setSavedJsonData(result.data);
      setShowJsonModal(true);
    }
  }, [getNodes, getEdges]);

  // Export JSON file download
  const handleExportJson = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const serialized = serializeGraph(currentNodes, currentEdges);
    downloadGraphJson(serialized, `nexusflow-graph-${Date.now()}.json`);
  }, [getNodes, getEdges]);

  const copyToClipboard = () => {
    if (savedJsonData) {
      navigator.clipboard.writeText(JSON.stringify(savedJsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* Canvas Top Toolbar */}
      <div className="canvas-toolbar">
        <div className="toolbar-left">
          <button onClick={handleSaveGraph} className="toolbar-btn btn-save" title="Validate & Save Graph">
            <Save size={15} />
            <span>Save Graph</span>
          </button>
          <button onClick={handleExportJson} className="toolbar-btn btn-export" title="Export as JSON file">
            <Download size={15} />
            <span>Export JSON</span>
          </button>
          <div className="toolbar-divider" />
          <button onClick={handleDeleteSelected} className="toolbar-btn btn-delete" title="Delete selected nodes or edges">
            <Trash2 size={15} />
            <span>Delete Selected</span>
          </button>
          <button onClick={handleClearCanvas} className="toolbar-btn btn-clear" title="Clear all nodes on canvas">
            <X size={15} />
            <span>Clear Canvas</span>
          </button>
        </div>

        <div className="toolbar-right">
          <button onClick={handleResetSample} className="toolbar-btn btn-sample" title="Load sample turbine pipeline">
            <RefreshCw size={14} />
            <span>Load Sample</span>
          </button>
          <button onClick={() => fitView({ padding: 0.2 })} className="toolbar-btn btn-fit" title="Fit view to canvas">
            <ZoomIn size={14} />
            <span>Fit View</span>
          </button>
        </div>
      </div>

      {/* Floating Notice / Error Banners */}
      {connectionNotice && (
        <div className="canvas-notice-banner error">
          <AlertCircle size={15} />
          <span>{connectionNotice}</span>
          <button onClick={() => setConnectionNotice(null)} className="notice-close">×</button>
        </div>
      )}

      {validationResult && !validationResult.isValid && (
        <div className="canvas-validation-errors">
          <div className="val-error-header">
            <AlertCircle size={16} className="text-red" />
            <strong>Pipeline Validation Failed ({validationResult.errors.length})</strong>
            <button onClick={() => setValidationResult(null)} className="notice-close">×</button>
          </div>
          <ul className="val-error-list">
            {validationResult.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        deleteKeyCode={['Backspace', 'Delete']}
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

      {/* Serialized JSON Graph Modal */}
      {showJsonModal && savedJsonData && (
        <div className="modal-backdrop" onClick={() => setShowJsonModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <CheckCircle2 size={18} className="text-green" />
                <h3>Rule Graph Validated & Serialized</h3>
              </div>
              <button onClick={() => setShowJsonModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <p className="modal-desc">
              Your visual node canvas was compiled into executable JSON. Ready for RxJS stream execution.
            </p>

            <div className="json-preview-container">
              <div className="json-preview-bar">
                <div className="json-badge">
                  <Code2 size={13} />
                  <span>v{savedJsonData.version} • {savedJsonData.nodes.length} Nodes • {savedJsonData.edges.length} Edges</span>
                </div>
                <button onClick={copyToClipboard} className="btn-copy-json">
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="json-code-block">
                {JSON.stringify(savedJsonData, null, 2)}
              </pre>
            </div>

            <div className="modal-footer">
              <button onClick={handleExportJson} className="btn-modal-download">
                <Download size={14} />
                <span>Download .json File</span>
              </button>
              <button onClick={() => setShowJsonModal(false)} className="btn-modal-close">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
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
