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
import { nodeTypes, edgeTypes } from './nodes/nodeRegistry';
import { useGraphActivity } from '../hooks/useGraphActivity';
import { validateGraph, serializeGraph, downloadGraphJson } from '../utils/serializeGraph';
import { GRAPH_TEMPLATES } from '../utils/graphTemplates';
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
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  X,
  Code2,
  ZoomIn,
  PlayCircle,
  Loader2,
  Activity,
  Power,
  PowerOff,
  Undo2,
  Redo2,
  LayoutGrid,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Sparkles,
  Radio,
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
    type: 'glow',
  },
  {
    id: 'edge-math1-action1',
    source: 'math-1',
    target: 'action-1',
    sourceHandle: 'output',
    targetHandle: 'input',
    type: 'glow',
  },
];

let idCounter = 100;
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

  // Live WebSocket Activity & Metrics Hook
  const {
    eventsPerSecond,
    lastAlertTime,
    liveActivityEnabled,
    prefersReducedMotion,
    toggleLiveActivity,
  } = useGraphActivity(currentGraphId, graphStatus === 'active');

  // Dismissible Canvas Onboarding Hint State
  const [hintDismissed, setHintDismissed] = useState(() => {
    try {
      return localStorage.getItem('nexusflow_canvas_hint_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // History State for Undo / Redo
  const [history, setHistory] = useState({
    past: [],
    future: [],
  });

  // Live Problems Panel State
  const [liveProblems, setLiveProblems] = useState([]);
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);

  // Modals & Notifications
  const [toast, setToast] = useState(null);
  const [compileResult, setCompileResult] = useState(null);
  const [savedJsonData, setSavedJsonData] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showCompileModal, setShowCompileModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /**
   * Push current state to past history snapshot
   */
  const pushHistory = useCallback((newNodes, newEdges) => {
    setHistory((prev) => ({
      past: [
        ...prev.past.slice(-25), // Keep max 25 history states
        {
          nodes: JSON.parse(JSON.stringify(newNodes)),
          edges: JSON.parse(JSON.stringify(newEdges)),
        },
      ],
      future: [],
    }));
  }, []);

  /**
   * Undo last edit
   */
  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previousState = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      const currentSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      showToast('success', 'Undo applied');

      return {
        past: newPast,
        future: [currentSnapshot, ...prev.future],
      };
    });
  }, [nodes, edges, setNodes, setEdges, showToast]);

  /**
   * Redo previously undone edit
   */
  const handleRedo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const nextState = prev.future[0];
      const newFuture = prev.future.slice(1);
      const currentSnapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      showToast('success', 'Redo applied');

      return {
        past: [...prev.past, currentSnapshot],
        future: newFuture,
      };
    });
  }, [nodes, edges, setNodes, setEdges, showToast]);

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
   * Live Graph Validation & Problem Extraction
   * Runs whenever nodes or edges mutate, highlighting nodes with missing required config
   */
  useEffect(() => {
    const res = validateGraph(nodes, edges);
    setLiveProblems(res.errors || []);

    // Check if any node error flags need updating
    const issuesMap = res.nodeIssues || {};
    let hasChanges = false;

    const updated = nodes.map((n) => {
      const issues = issuesMap[n.id];
      const hasErr = !!(issues && issues.length > 0);
      const errMsg = hasErr ? issues.join(', ') : '';

      if (n.data?.hasError !== hasErr || n.data?.errorMessage !== errMsg) {
        hasChanges = true;
        return {
          ...n,
          data: {
            ...n.data,
            hasError: hasErr,
            errorMessage: errMsg,
          },
        };
      }
      return n;
    });

    if (hasChanges) {
      setNodes(updated);
    }
  }, [nodes, edges, setNodes]);

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
        setConnectionNotice(
          'Invalid link: Follow Data Source -> Math Operation -> Action Trigger flow.'
        );
        setTimeout(() => setConnectionNotice(null), 4000);
        return;
      }

      pushHistory(nodes, edges);

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'glow',
          },
          eds
        )
      );
      setConnectionNotice(null);
    },
    [isValidConnection, setEdges, pushHistory, nodes, edges]
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

        pushHistory(nodes, edges);
        setNodes((nds) => nds.concat(newNode));
      } catch (err) {
        console.error('Failed to parse dropped node:', err);
      }
    },
    [screenToFlowPosition, nodes, edges, setNodes, pushHistory]
  );

  // Delete selected nodes or edges
  const handleDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);

    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      showToast('error', 'Select one or more nodes or wires to delete.');
      return;
    }

    pushHistory(nodes, edges);
    setNodes((nds) => nds.filter((node) => !node.selected));
    setEdges((eds) => eds.filter((edge) => !edge.selected));
    showToast(
      'success',
      `Deleted ${selectedNodes.length} node(s) and ${selectedEdges.length} connection(s).`
    );
  }, [nodes, edges, setNodes, setEdges, pushHistory, showToast]);

  // Duplicate Selected Node(s)
  const handleDuplicateSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);

    if (selectedNodes.length === 0) {
      showToast('error', 'Select a node on the canvas to duplicate (Ctrl+D).');
      return;
    }

    pushHistory(nodes, edges);

    const clones = selectedNodes.map((n) => ({
      ...JSON.parse(JSON.stringify(n)),
      id: getId(n.type),
      position: {
        x: n.position.x + 40,
        y: n.position.y + 40,
      },
      selected: true,
      data: {
        ...JSON.parse(JSON.stringify(n.data)),
        label: `${n.data.label || 'Node'} (Copy)`,
      },
    }));

    // Deselect original nodes and append clones
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)).concat(clones));
    showToast('success', `Duplicated ${clones.length} node(s).`);
  }, [nodes, edges, setNodes, pushHistory, showToast]);

  // Auto-Layout: Topological Left-to-Right Layering
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    pushHistory(nodes, edges);

    // Compute in-degrees and adjacency
    const incoming = new Map(nodes.map((n) => [n.id, 0]));
    const outgoing = new Map(nodes.map((n) => [n.id, []]));

    edges.forEach((e) => {
      if (incoming.has(e.target)) incoming.set(e.target, incoming.get(e.target) + 1);
      if (outgoing.has(e.source)) outgoing.get(e.source).push(e.target);
    });

    // Assign layers: BFS longest-path from sources
    const layers = new Map();
    nodes.forEach((n) => {
      if (n.type === 'dataSource' || (incoming.get(n.id) || 0) === 0) {
        layers.set(n.id, 0);
      }
    });

    // Fallback if no sources found
    if (layers.size === 0 && nodes.length > 0) {
      layers.set(nodes[0].id, 0);
    }

    // Traverse to compute depths
    for (let iter = 0; iter < nodes.length; iter++) {
      edges.forEach((e) => {
        const srcLayer = layers.get(e.source);
        if (srcLayer !== undefined) {
          const curTargetLayer = layers.get(e.target) || 0;
          layers.set(e.target, Math.max(curTargetLayer, srcLayer + 1));
        }
      });
    }

    // Assign any unvisited nodes by type
    nodes.forEach((n) => {
      if (!layers.has(n.id)) {
        if (n.type === 'dataSource') layers.set(n.id, 0);
        else if (n.type === 'mathOperation') layers.set(n.id, 1);
        else if (n.type === 'actionTrigger') layers.set(n.id, 2);
        else layers.set(n.id, 0);
      }
    });

    // Group nodes by layer
    const layerBuckets = new Map();
    nodes.forEach((n) => {
      const l = layers.get(n.id) || 0;
      if (!layerBuckets.has(l)) layerBuckets.set(l, []);
      layerBuckets.get(l).push(n);
    });

    // Reposition nodes cleanly
    const layoutNodes = nodes.map((n) => {
      const l = layers.get(n.id) || 0;
      const bucket = layerBuckets.get(l);
      const indexInBucket = bucket.findIndex((item) => item.id === n.id);

      return {
        ...n,
        position: {
          x: 60 + l * 320,
          y: 80 + indexInBucket * 180,
        },
      };
    });

    setNodes(layoutNodes);
    showToast('success', 'Auto-layout arranged nodes left-to-right.');
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  }, [nodes, edges, setNodes, pushHistory, fitView, showToast]);

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to clear the canvas? All unsaved nodes and connections will be removed.'
      )
    ) {
      pushHistory(nodes, edges);
      setNodes([]);
      setEdges([]);
      setCurrentGraphId(null);
      setGraphName('Untitled Rule');
      setGraphStatus('draft');
      setSavedJsonData(null);
      setCompileResult(null);
    }
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  // Load Graph Template from predefined library
  const handleSelectTemplate = useCallback(
    (e) => {
      const templateId = e.target.value;
      if (!templateId) return;

      const template = GRAPH_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;

      pushHistory(nodes, edges);
      setNodes(JSON.parse(JSON.stringify(template.graph.nodes)));
      const templateEdges = (template.graph.edges || []).map((e) => ({ ...e, type: 'glow' }));
      setEdges(templateEdges);
      setGraphName(template.name);
      setCurrentGraphId(null);
      setGraphStatus('draft');
      setCompileResult(null);

      showToast('success', `Loaded Template: "${template.name}"`);
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 60);

      // Reset dropdown
      e.target.value = '';
    },
    [nodes, edges, setNodes, setEdges, pushHistory, fitView, showToast]
  );

  // Save Graph to Backend Server (POST /api/graphs or PUT /api/graphs/:id)
  const handleSaveToServer = useCallback(async () => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const result = validateGraph(currentNodes, currentEdges);

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
  }, [getNodes, getEdges, currentGraphId, graphName, loadSavedGraphsList, showToast]);

  // Load Graph from Dropdown selection
  const handleSelectGraph = useCallback(
    async (e) => {
      const selectedId = e.target.value;
      if (!selectedId) {
        return;
      }

      try {
        const res = await fetchGraphById(selectedId);
        if (res.success && res.data) {
          const doc = res.data;
          pushHistory(nodes, edges);
          setGraphName(doc.name);
          setCurrentGraphId(doc._id);
          setGraphStatus(doc.status || 'draft');
          if (doc.graph && Array.isArray(doc.graph.nodes)) {
            setNodes(doc.graph.nodes);
            const loadedEdges = (doc.graph.edges || []).map((e) => ({ ...e, type: 'glow' }));
            setEdges(loadedEdges);
            setCompileResult(null);
            setTimeout(() => fitView({ padding: 0.2 }), 50);
            showToast('success', `Loaded '${doc.name}' (${doc.status || 'draft'})`);
          }
        }
      } catch (err) {
        showToast('error', `Failed to load graph: ${err.message}`);
      }
    },
    [nodes, edges, setNodes, setEdges, fitView, pushHistory, showToast]
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
      showToast('error', `State change failed: ${msg}`);
    } finally {
      setIsTogglingActive(false);
    }
  }, [currentGraphId, graphStatus, loadSavedGraphsList, showToast]);

  // Dry-Run Compile Check
  const handleCompileCheck = useCallback(async () => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();
    const result = validateGraph(currentNodes, currentEdges);

    if (!result.isValid) {
      showToast('error', `Validation Failed: ${result.errors[0]}`);
      return;
    }

    setIsCompiling(true);
    try {
      const serialized = serializeGraph(currentNodes, currentEdges);
      let res;
      if (currentGraphId) {
        res = await compileSavedGraph(currentGraphId);
      } else {
        res = await compileAdHocGraph(serialized);
      }

      if (res.success) {
        setCompileResult(res);
        setShowCompileModal(true);
        showToast(
          'success',
          `Compilation Verified: ${res.metadata?.nodeCount} nodes topologically sorted.`
        );
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      showToast('error', `Compiler error: ${msg}`);
    } finally {
      setIsCompiling(false);
    }
  }, [getNodes, getEdges, currentGraphId, showToast]);

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
    downloadGraphJson(
      serialized,
      `${graphName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`
    );
  }, [getNodes, getEdges, graphName]);

  const copyToClipboard = () => {
    if (savedJsonData) {
      navigator.clipboard.writeText(JSON.stringify(savedJsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Keyboard Shortcuts Handler
   * Captures Ctrl+Z, Ctrl+Y, Ctrl+D, Ctrl+S, Delete/Backspace outside of inputs
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not intercept if focus is inside an input, textarea, or select
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (cmdKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (cmdKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveToServer();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Multi-select delete
        handleDeleteSelected();
      } else if (e.key === '?' || (cmdKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDuplicateSelected, handleSaveToServer, handleDeleteSelected]);

  return (
    <div className="canvas-wrapper" ref={reactFlowWrapper}>
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`canvas-toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="notice-close">
            ×
          </button>
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

          {/* Templates Dropdown */}
          <select
            defaultValue=""
            onChange={handleSelectTemplate}
            className="toolbar-select template-select"
            title="Load ready-made industrial rule template"
          >
            <option value="" disabled>
              Templates...
            </option>
            {GRAPH_TEMPLATES.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                ⚡ {tmpl.name}
              </option>
            ))}
          </select>

          {/* Undo / Redo Controls */}
          <div className="toolbar-btn-group">
            <button
              onClick={handleUndo}
              disabled={history.past.length === 0}
              className="toolbar-icon-btn"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={handleRedo}
              disabled={history.future.length === 0}
              className="toolbar-icon-btn"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>
          </div>

          {/* Save to Server */}
          <button
            onClick={handleSaveToServer}
            disabled={isSaving}
            className="toolbar-btn btn-save"
            title="Save or Update graph on server (Ctrl+S)"
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
          <div
            className={`toolbar-status-badge ${graphStatus}`}
            title={`Rule state: ${graphStatus}`}
          >
            <span className="status-dot" />
            <span>{graphStatus === 'active' ? 'Active' : 'Draft'}</span>
          </div>

          {/* Activate / Deactivate Live Execution Button */}
          <button
            onClick={handleToggleActivate}
            disabled={isTogglingActive}
            className={`toolbar-btn ${graphStatus === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
            title={
              graphStatus === 'active'
                ? 'Deactivate rule (stop execution)'
                : 'Activate rule (compile & run)'
            }
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
        </div>

        <div className="toolbar-right">
          {/* Duplicate Node */}
          <button
            onClick={handleDuplicateSelected}
            className="toolbar-btn btn-duplicate"
            title="Duplicate selected node (Ctrl+D)"
          >
            <Copy size={14} />
            <span>Duplicate</span>
          </button>

          {/* Auto-Layout */}
          <button
            onClick={handleAutoLayout}
            className="toolbar-btn btn-layout"
            title="Auto-arrange nodes topologically left-to-right"
          >
            <LayoutGrid size={14} />
            <span>Auto-Layout</span>
          </button>

          {/* Fit View */}
          <button
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            className="toolbar-btn btn-fit"
            title="Fit canvas to view"
          >
            <ZoomIn size={14} />
            <span>Fit View</span>
          </button>

          {/* Keyboard Shortcuts Popover Trigger */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="toolbar-btn btn-shortcuts"
            title="Keyboard shortcuts cheat sheet"
          >
            <Keyboard size={14} />
            <span>Shortcuts</span>
          </button>

          {/* Inspect / Export JSON */}
          <button
            onClick={handleInspectJson}
            className="toolbar-btn btn-export"
            title="Inspect Serialized JSON"
          >
            <Code2 size={14} />
            <span>JSON</span>
          </button>
          <button onClick={handleExportJson} className="toolbar-btn" title="Download JSON file">
            <Download size={14} />
          </button>

          {/* Delete Selection */}
          <button
            onClick={handleDeleteSelected}
            className="toolbar-btn btn-delete"
            title="Delete selected nodes or edges (Del)"
          >
            <Trash2 size={14} />
          </button>

          {/* Clear Canvas */}
          <button
            onClick={handleClearCanvas}
            className="toolbar-btn btn-clear"
            title="Clear all nodes on canvas"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Floating Notice / Error Banners */}
      {connectionNotice && (
        <div className="canvas-notice-banner error">
          <AlertCircle size={15} />
          <span>{connectionNotice}</span>
          <button onClick={() => setConnectionNotice(null)} className="notice-close">
            ×
          </button>
        </div>
      )}

      {/* Dismissible Onboarding Tip Banner */}
      {!hintDismissed && (
        <div className="canvas-onboarding-hint">
          <div className="hint-content">
            <Sparkles size={15} className="text-cyan" />
            <span>
              <strong>First time?</strong> Drag nodes from the library, connect source ports to math/action inputs, then hit <strong>Compile Check</strong> to verify RxJS stream validity.
            </span>
          </div>
          <button
            onClick={() => {
              setHintDismissed(true);
              try {
                localStorage.setItem('nexusflow_canvas_hint_dismissed', 'true');
              } catch {
                // ignore storage error
              }
            }}
            className="hint-dismiss-btn"
          >
            Got it
          </button>
        </div>
      )}

      {/* Live Activity Status Strip */}
      <div className="canvas-activity-strip">
        <div className="status-strip-left">
          <span className={`strip-status-badge ${graphStatus === 'active' ? 'active' : 'draft'}`}>
            <span className="strip-dot" />
            {graphStatus === 'active' ? 'Engine Active' : 'Draft Mode'}
          </span>
          <span className="strip-metric">
            <Radio size={13} className="text-cyan" />
            Events: <strong>{eventsPerSecond} /s</strong>
          </span>
          <span className="strip-metric">
            <Activity size={13} className="text-purple" />
            Last Alert: <strong>{lastAlertTime ? new Date(lastAlertTime).toLocaleTimeString() : 'None'}</strong>
          </span>
        </div>
        <div className="status-strip-right">
          <button
            onClick={toggleLiveActivity}
            className={`btn-live-toggle ${liveActivityEnabled ? 'active' : ''}`}
            title="Toggle live telemetry animations on wires and nodes"
          >
            {liveActivityEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Live Wires {liveActivityEnabled ? 'ON' : 'OFF'}</span>
          </button>
          <div className="strip-legend">
            <span className="legend-item"><span className="legend-dot idle" /> Idle</span>
            <span className="legend-item"><span className="legend-dot flowing" /> Flowing</span>
            <span className="legend-item"><span className="legend-dot high" /> High Rate</span>
            <span className="legend-item"><span className="legend-dot fired" /> Fired</span>
          </div>
        </div>
      </div>

      {/* React Flow Workspace */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'glow' }}
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

      {/* Live Problems Panel (Collapsible Footer Drawer) */}
      <div className={`canvas-problems-panel ${isProblemsOpen ? 'open' : 'closed'}`}>
        <div className="problems-header" onClick={() => setIsProblemsOpen(!isProblemsOpen)}>
          <div className="problems-title-row">
            {liveProblems.length === 0 ? (
              <>
                <CheckCircle2 size={15} className="text-emerald-400" />
                <span className="problems-badge valid">0 Problems</span>
                <span className="problems-subtitle">
                  DAG topology verified & ready for execution
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={15} className="text-amber-400" />
                <span className="problems-badge invalid">
                  {liveProblems.length} Problem{liveProblems.length > 1 ? 's' : ''}
                </span>
                <span className="problems-subtitle">Fix issues before compiling or activating</span>
              </>
            )}
          </div>
          <button className="problems-toggle-btn">
            {isProblemsOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {isProblemsOpen && (
          <div className="problems-body">
            {liveProblems.length === 0 ? (
              <div className="problems-empty">
                <CheckCircle2 size={24} className="text-emerald-400 mb-1" />
                <p>
                  All nodes and edges conform to the Directed Acyclic Graph (DAG) specification.
                </p>
              </div>
            ) : (
              <ul className="problems-list">
                {liveProblems.map((prob, idx) => (
                  <li key={idx} className="problem-item">
                    <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{prob}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

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
              The DAG was parsed, topologically sorted, and converted into reactive RxJS streams
              with branching via <code>.pipe(share())</code>.
            </p>

            <div className="json-preview-container">
              <div className="json-preview-bar">
                <div className="json-badge">
                  <Activity size={13} />
                  <span>
                    Pipeline: {compileResult.metadata?.nodeCount} Nodes •{' '}
                    {compileResult.metadata?.edgeCount} Edges •{' '}
                    {compileResult.metadata?.dataSources?.length} Inputs •{' '}
                    {compileResult.metadata?.actionTriggers?.length} Sinks
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
              Your visual node canvas was compiled into executable JSON. Ready for RxJS stream
              execution.
            </p>

            <div className="json-preview-container">
              <div className="json-preview-bar">
                <div className="json-badge">
                  <Code2 size={13} />
                  <span>
                    v{savedJsonData.version} • {savedJsonData.nodes.length} Nodes •{' '}
                    {savedJsonData.edges.length} Edges
                  </span>
                </div>
                <button onClick={copyToClipboard} className="btn-copy-json">
                  {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="json-code-block">{JSON.stringify(savedJsonData, null, 2)}</pre>
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

      {/* Keyboard Shortcuts Popover Modal */}
      {showShortcutsModal && (
        <div className="modal-backdrop" onClick={() => setShowShortcutsModal(false)}>
          <div className="modal-card shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Keyboard size={18} className="text-cyan" />
                <h3>Canvas Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcutsModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <p className="modal-desc">Accelerate your workflow with these keyboard shortcuts:</p>

            <div className="shortcuts-table">
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                </div>
                <div className="shortcut-action">Undo canvas edit</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                </div>
                <div className="shortcut-action">Redo canvas edit</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>D</kbd>
                </div>
                <div className="shortcut-action">Duplicate selected node</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Delete</kbd> / <kbd>Backspace</kbd>
                </div>
                <div className="shortcut-action">Delete selected node(s) or edge(s)</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Ctrl</kbd> + <kbd>S</kbd>
                </div>
                <div className="shortcut-action">Save / update graph on server</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>?</kbd>
                </div>
                <div className="shortcut-action">Toggle this shortcuts cheat sheet</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Scroll</kbd>
                </div>
                <div className="shortcut-action">Zoom in / out of canvas</div>
              </div>
              <div className="shortcut-row">
                <div className="shortcut-keys">
                  <kbd>Space</kbd> + <kbd>Drag</kbd>
                </div>
                <div className="shortcut-action">Pan canvas workspace</div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowShortcutsModal(false)} className="btn-modal-close">
                Got it
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
