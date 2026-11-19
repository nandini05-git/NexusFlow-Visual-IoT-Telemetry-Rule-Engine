/**
 * Graph Serialization & Pipeline Validation Utilities
 *
 * Converts React Flow node and edge state into portable JSON and verifies
 * pipeline integrity (sources, sinks, connectivity, and acyclicity).
 */

export const serializeGraph = (nodes = [], edges = []) => {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    metadata: {
      generator: 'NexusFlow Visual IoT Rule Engine',
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
      },
      data: { ...node.data },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    })),
  };
};

/**
 * Validates individual node configuration:
 * Checks required fields per node type.
 */
export const validateNodeConfig = (node) => {
  const issues = [];
  if (!node || !node.type) return issues;
  const d = node.data || {};

  if (node.type === 'dataSource') {
    if (!d.deviceId || !String(d.deviceId).trim()) {
      issues.push('Target Device ID is required');
    }
    if (!d.sensorType || !String(d.sensorType).trim()) {
      issues.push('Sensor metric type is required');
    }
  } else if (node.type === 'mathOperation') {
    if (!d.operation) {
      issues.push('Operation type is required');
    } else if (d.operation === 'threshold') {
      if (d.thresholdValue === undefined || d.thresholdValue === null || isNaN(Number(d.thresholdValue))) {
        issues.push('Valid numeric threshold value is required');
      }
      if (!d.operator) {
        issues.push('Comparison operator is required');
      }
    } else if (d.operation === 'moving_average') {
      const win = Number(d.windowSize);
      if (!Number.isInteger(win) || win < 2) {
        issues.push('Window size must be an integer >= 2');
      }
    }
  } else if (node.type === 'actionTrigger') {
    if (!d.actionType) {
      issues.push('Action dispatcher type is required');
    } else if (d.actionType === 'sms_alert') {
      if (!d.target || !String(d.target).trim()) {
        issues.push('Emergency phone number is required');
      }
    } else if (d.actionType === 'webhook') {
      if (!d.target || !String(d.target).trim()) {
        issues.push('Webhook endpoint URL is required');
      }
    }
  }

  return issues;
};

/**
 * Validates the serialized rule graph:
 * - At least one Data Source node
 * - At least one Action Trigger node
 * - Node configuration validation
 * - No orphan nodes (unconnected nodes)
 * - No cycles (topological cycle check)
 */
export const validateGraph = (nodes = [], edges = []) => {
  const errors = [];
  const nodeIssues = {};

  if (!nodes || nodes.length === 0) {
    return {
      isValid: false,
      errors: ['Canvas is empty. Add nodes to construct a rule graph.'],
      nodeIssues: {},
      data: null,
    };
  }

  // 1. Check Data Source presence
  const dataSources = nodes.filter((n) => n.type === 'dataSource');
  if (dataSources.length === 0) {
    errors.push('Rule graph requires at least one Data Source node.');
  }

  // 2. Check Action Trigger presence
  const actionTriggers = nodes.filter((n) => n.type === 'actionTrigger');
  if (actionTriggers.length === 0) {
    errors.push('Rule graph requires at least one Action Trigger node.');
  }

  // 3. Validate individual node configs
  nodes.forEach((node) => {
    const issues = validateNodeConfig(node);
    if (issues.length > 0) {
      nodeIssues[node.id] = issues;
      const label = node.data?.label || node.id;
      issues.forEach((iss) => errors.push(`[${label}] ${iss}`));
    }
  });

  // Build degree maps
  const incoming = new Map(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map(nodes.map((n) => [n.id, []]));

  edges.forEach((e) => {
    if (outgoing.has(e.source)) {
      outgoing.set(e.source, outgoing.get(e.source) + 1);
    }
    if (incoming.has(e.target)) {
      incoming.set(e.target, incoming.get(e.target) + 1);
    }
    if (adjacency.has(e.source)) {
      adjacency.get(e.source).push(e.target);
    }
  });

  // 4. Check orphan nodes
  nodes.forEach((node) => {
    const nodeLabel = node.data?.label || node.id;
    const inDeg = incoming.get(node.id) || 0;
    const outDeg = outgoing.get(node.id) || 0;

    if (node.type === 'dataSource' && outDeg === 0) {
      errors.push(`Data Source '${nodeLabel}' must connect to at least one downstream processor.`);
    } else if (node.type === 'actionTrigger' && inDeg === 0) {
      errors.push(`Action Trigger '${nodeLabel}' has no incoming rule trigger connected.`);
    } else if (node.type === 'mathOperation') {
      if (inDeg === 0) {
        errors.push(`Math Processor '${nodeLabel}' has no incoming telemetry source.`);
      }
      if (outDeg === 0) {
        errors.push(`Math Processor '${nodeLabel}' output is disconnected.`);
      }
    }
  });

  // 4. Cycle Detection using DFS
  const visited = new Map(); // 0 = unvisited, 1 = visiting (in stack), 2 = visited
  nodes.forEach((n) => visited.set(n.id, 0));

  let hasCycle = false;
  const dfs = (nodeId) => {
    visited.set(nodeId, 1);
    const neighbors = adjacency.get(nodeId) || [];

    for (const neighbor of neighbors) {
      const state = visited.get(neighbor);
      if (state === 1) {
        hasCycle = true;
        return;
      }
      if (state === 0) {
        dfs(neighbor);
        if (hasCycle) return;
      }
    }
    visited.set(nodeId, 2);
  };

  nodes.forEach((n) => {
    if (visited.get(n.id) === 0 && !hasCycle) {
      dfs(n.id);
    }
  });

  if (hasCycle) {
    errors.push('Circular dependency detected! Telemetry rule pipelines must be directed acyclic graphs (DAG).');
  }

  const serialized = serializeGraph(nodes, edges);

  return {
    isValid: errors.length === 0,
    errors,
    data: serialized,
  };
};

/**
 * Triggers a browser download of the serialized JSON graph
 */
export const downloadGraphJson = (graphData, filename = 'nexusflow-rule-graph.json') => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(graphData, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
