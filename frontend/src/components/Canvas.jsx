import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { nodeTypes } from './nodes/nodeRegistry';
import { validateGraph, serializeGraph, downloadGraphJson } from '../utils/serializeGraph';
import {
  fetchUserGraphs,
  fetchGraphById,
  createRuleGraph,
  updateRuleGraph,
  compileSavedGraph,
  compileAdHocGraph,
  activateGraph,
  deactivateGraph,
} from '../api/graphs';
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
  ZoomIn,
  PlayCircle,
  FolderOpen,
  FileCheck,
  Loader2,
  Activity,
  Power,
  PowerOff,
} from 'lucide-react';

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
      template: 'ALERT: Turbine-01 overheat ({{value}}°C)',
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

  // Rule Graph Persistence State
  const [graphName, setGraphName] = useState('Turbine Overheat Rule');
  const [currentGraphId, setCurrentGraphId] = useState(null);
  const [graphStatus, setGraphStatus] = useState('draft');
  const [savedGraphs, setSavedGraphs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  // Notifications & Modals
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const [validationResult, setValidationResult] = useState(null);
  const [compileResult, setCompileResult] = useState(null);
  const [savedJsonData, setSavedJsonData] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showCompileModal, setShowCompileModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load user saved graphs on mount
  const loadSavedGraphsList = useCallback(async () => {
    try {
      const res = await fetchUserGraphs();
      if (res.success && Array.isArray(res.data)) {
        setSavedGraphs(res.data);
      }
    } catch (err) {
      console.warn('Could not load user saved graphs (offline or unauthorized):', err.message);
    }
  }, []);

  useEffect(() => {
    loadSavedGraphsList();
  }, [loadSavedGraphsList]);

  /**
   * Validate connections:
   * Rule: Data Source -> Math Operation -> Action Trigger only!
   * Blocks self-connections and invalid link topologies.
   */
  const isValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false;

      const sourceNode = getNode(connection.source);
      const targetNode = getNode(connection.target);
      if (!sourceNode || !targetNode) return false;

      // Data Source must connect to Math Operation or Action Trigger
      if (sourceNode.type === 'dataSource') {
        return targetNode.type === 'mathOperation' || targetNode.type === 'actionTrigger';
      }

      // Math Operation can connect to another Math Operation or Action Trigger
      if (sourceNode.type === 'mathOperation') {
        return targetNode.type === 'mathOperation' || targetNode.type === 'actionTrigger';
      }

      // Action Trigger has no outputs
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
          ...(nodeInfo.defaultData || {}),
        };

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
      setCurrentGraphId(null);
      setGraphName('Untitled Rule');
      setGraphStatus('draft');
      setValidationResult(null);
      setSavedJsonData(null);
      setCompileResult(null);
    }
  }, [setNodes, setEdges]);

  // Reset to default sample pipeline
  const handleResetSample = useCallback(() => {
    setNodes(defaultInitialNodes);
    setEdges(defaultInitialEdges);
    setGraphName('Turbine Overheat Rule');
    setCurrentGraphId(null);
    setGraphStatus('draft');
    setValidationResult(null);
    setCompileResult(null);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [setNodes, setEdges, fitView]);

  // Save Graph to Backend Server (POST /api/graphs or PUT /api/graphs/:id)
  const handleSaveToServer = useCallback(async () => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const result = validateGraph(currentNodes, currentEdges);
    setValidationResult(result);

    if (!result.isValid) {
      showToast('error', `Cannot save: ${result.errors[0]}`);
      return;
    }

    const serialized = serializeGraph(currentNodes, currentEdges);
    setIsSaving(true);

    try {
      if (currentGraphId) {
        // Update existing graph
        const res = await updateRuleGraph(currentGraphId, {
          name: graphName.trim() || 'Untitled Rule',
          graph: serialized,
        });
        setGraphStatus(res.data?.status || 'draft');
        showToast('success', `Graph '${res.data.name}' updated on server!`);
      } else {
        // Create new graph
        const res = await createRuleGraph({
          name: graphName.trim() || 'Untitled Rule',
          graph: serialized,
          status: 'draft',
        });
        setCurrentGraphId(res.data._id);
        setGraphStatus('draft');
        showToast('success', `Graph '${res.data.name}' saved to server!`);
      }
      loadSavedGraphsList();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast('error', `Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [getNodes, getEdges, currentGraphId, graphName, loadSavedGraphsList]);

  // Load Graph from Dropdown selection
  const handleSelectGraph = useCallback(
    async (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        handleResetSample();
        return;
      }

      try {
        const res = await fetchGraphById(selectedId);
        if (res.success && res.data) {
          const doc = res.data;
          setGraphName(doc.name);
          setCurrentGraphId(doc._id);
          setGraphStatus(doc.status || 'draft');
          if (doc.graph && Array.isArray(doc.graph.nodes)) {
            setNodes(doc.graph.nodes);
            setEdges(doc.graph.edges || []);
            setValidationResult(null);
            setCompileResult(null);
            setTimeout(() => fitView({ padding: 0.2 }), 50);
            showToast('success', `Loaded '${doc.name}' (${doc.status || 'draft'})`);
          }
        }
      } catch (err) {
        showToast('error', `Failed to load graph: ${err.message}`);
      }
    },
    [setNodes, setEdges, fitView, handleResetSample]
  );

  // Activate / Deactivate running state on server
  const handleToggleActivate = useCallback(async () => {
    if (!currentGraphId) {
      showToast('error', 'Please save graph to server before activating.');
      return;
    }

    setIsTogglingActive(true);
    try {
      if (graphStatus === 'active') {
        const res = await deactivateGraph(currentGraphId);
        setGraphStatus('draft');
        showToast('success', res.message || 'Graph deactivated (draft mode).');
      } else {
        const res = await activateGraph(currentGraphId);
        setGraphStatus('active');
        showToast('success', res.message || 'Graph activated and running! Listening to telemetry.');
      }
      loadSavedGraphsList();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast('error', `Activation error: ${msg}`);
    } finally {
      setIsTogglingActive(false);
    }
  }, [currentGraphId, graphStatus, loadSavedGraphsList]);

  // Compile Check: Dry-run compiles via POST /api/graphs/:id/compile or POST /api/graphs/compile
  const handleCompileCheck = useCallback(async () => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const clientValidation = validateGraph(currentNodes, currentEdges);

    if (!clientValidation.isValid) {
      setValidationResult(clientValidation);
      showToast('error', `Compiler Check Failed: ${clientValidation.errors[0]}`);
      return;
    }

    setIsCompiling(true);
    const serialized = serializeGraph(currentNodes, currentEdges);

    try {
      let res;
      if (currentGraphId) {
        // Compile saved graph
        res = await compileSavedGraph(currentGraphId);
      } else {
        // Compile current canvas graph ad-hoc
        res = await compileAdHocGraph({
          name: graphName.trim() || 'Canvas Rule',
          graph: serialized,
        });
      }

      setCompileResult(res);
      setShowCompileModal(true);
      showToast('success', 'Logic Compiler: Graph successfully compiled into RxJS streams!');
    } catch (err) {
      const errData = err.response?.data;
      const errorList = errData?.errors || [errData?.message || err.message];
      setValidationResult({ isValid: false, errors: errorList });
      showToast('error', `Compilation Error: ${errorList[0]}`);
    } finally {
      setIsCompiling(false);
    }
  }, [getNodes, getEdges, currentGraphId, graphName]);

  // Inspect Serialized JSON
  const handleInspectJson = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const serialized = serializeGraph(currentNodes, currentEdges);
    setSavedJsonData(serialized);
    setShowJsonModal(true);
  }, [getNodes, getEdges]);

  // Export JSON file download
  const handleExportJson = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const serialized = serializeGraph(currentNodes, currentEdges);
    downloadGraphJson(serialized, `${graphName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`);
  }, [getNodes, getEdges, graphName]);

  const copyToClipboard = () => {
    if (savedJsonData) {
      navigator.clipboard.writeText(JSON.stringify(savedJsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`canvas-toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="notice-close">×</button>
        </div>
      )}

      {/* Canvas Top Toolbar */}
      <div className="canvas-toolbar">
        <div className="toolbar-left">
          {/* Rule Name Input */}
          <input
            type="text"
            value={graphName}
            onChange={(e) => setGraphName(e.target.value)}
            className="toolbar-name-input"
            title="Graph / Rule Name"
            placeholder="Untitled Rule"
          />

          {/* Load Graph Dropdown */}
          <select
            value={currentGraphId || ''}
            onChange={handleSelectGraph}
            className="toolbar-select"
            title="Load saved user graph"
          >
            <option value="">-- Load Saved Graph --</option>
            {savedGraphs.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name} ({new Date(g.updatedAt).toLocaleDateString()})
              </option>
            ))}
          </select>

          {/* Save to Server */}
          <button
            onClick={handleSaveToServer}
            disabled={isSaving}
            className="toolbar-btn btn-save"
            title="Save or Update graph on server"
          >
            {isSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            <span>{currentGraphId ? 'Update Server' : 'Save to Server'}</span>
          </button>

          {/* Compile Check */}
          <button
            onClick={handleCompileCheck}
            disabled={isCompiling}
            className="toolbar-btn btn-compile"
            title="Dry-run compile into executable RxJS streams"
          >
            {isCompiling ? <Loader2 size={14} className="spin" /> : <PlayCircle size={14} />}
            <span>Compile Check</span>
          </button>

          {/* Real Server State Status Badge */}
          <div className={`toolbar-status-badge ${graphStatus}`} title={`Rule state: ${graphStatus}`}>
            <span className="status-dot" />
            <span>{graphStatus === 'active' ? 'Active' : 'Draft'}</span>
          </div>

          {/* Activate / Deactivate Live Execution Button */}
          <button
            onClick={handleToggleActivate}
            disabled={isTogglingActive}
            className={`toolbar-btn ${graphStatus === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
            title={graphStatus === 'active' ? 'Deactivate rule (stop execution)' : 'Activate rule (compile & run)'}
          >
            {isTogglingActive ? (
              <Loader2 size={14} className="spin" />
            ) : graphStatus === 'active' ? (
              <PowerOff size={14} />
            ) : (
              <Power size={14} />
            )}
            <span>{graphStatus === 'active' ? 'Deactivate' : 'Activate'}</span>
          </button>

          <div className="toolbar-divider" />

          {/* Inspect / Export JSON */}
          <button onClick={handleInspectJson} className="toolbar-btn btn-export" title="Inspect Serialized JSON">
            <Code2 size={14} />
            <span>Inspect JSON</span>
          </button>
          <button onClick={handleExportJson} className="toolbar-btn" title="Download JSON file">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>

        <div className="toolbar-right">
          <button onClick={handleDeleteSelected} className="toolbar-btn btn-delete" title="Delete selected nodes or edges">
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
          <button onClick={handleClearCanvas} className="toolbar-btn btn-clear" title="Clear all nodes on canvas">
            <X size={14} />
            <span>Clear</span>
          </button>
          <button onClick={handleResetSample} className="toolbar-btn btn-sample" title="Load sample turbine pipeline">
            <RefreshCw size={14} />
            <span>Sample</span>
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

      {/* Compiler Result Modal */}
      {showCompileModal && compileResult && (
        <div className="modal-backdrop" onClick={() => setShowCompileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <CheckCircle2 size={18} className="text-green" />
                <h3>RxJS Logic Compiler: Success</h3>
              </div>
              <button onClick={() => setShowCompileModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <p className="modal-desc">
              The DAG was parsed, topologically sorted, and converted into reactive RxJS streams with branching via <code>.pipe(share())</code>.
            </p>

            <div className="json-preview-container">
              <div className="json-preview-bar">
                <div className="json-badge">
                  <Activity size={13} />
                  <span>
                    Pipeline: {compileResult.metadata?.nodeCount} Nodes • {compileResult.metadata?.edgeCount} Edges • {compileResult.metadata?.dataSources?.length} Inputs • {compileResult.metadata?.actionTriggers?.length} Sinks
                  </span>
                </div>
              </div>
              <pre className="json-code-block">
                {JSON.stringify(compileResult.metadata, null, 2)}
              </pre>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCompileModal(false)} className="btn-modal-close">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
