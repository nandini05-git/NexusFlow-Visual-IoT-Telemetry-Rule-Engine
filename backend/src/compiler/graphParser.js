/**
 * Graph Parser & Validator Module
 *
 * Validates, normalizes, and topologically sorts a React Flow rule graph DAG.
 * Enforces strict connectivity, configuration, and acyclicity rules.
 */

export class GraphValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'GraphValidationError';
    this.errors = errors.length > 0 ? errors : [message];
  }
}

const KNOWN_NODE_TYPES = new Set(['dataSource', 'mathOperation', 'actionTrigger']);
const KNOWN_MATH_OPERATIONS = new Set(['threshold', 'moving_average', 'sum', 'min', 'max']);
const KNOWN_THRESHOLD_OPERATORS = new Set(['>', '>=', '<', '<=', '==', '!=']);

/**
 * Validates node-specific configuration fields.
 */
const validateNodeConfig = (node) => {
  const data = node.data || {};
  const label = data.label || node.id;

  if (!KNOWN_NODE_TYPES.has(node.type)) {
    return `Node '${label}' has unknown type '${node.type}'. Allowed types: dataSource, mathOperation, actionTrigger.`;
  }

  if (node.type === 'dataSource') {
    if (!data.deviceId || typeof data.deviceId !== 'string' || !data.deviceId.trim()) {
      return `Data Source '${label}' requires a valid non-empty 'deviceId'.`;
    }
    if (!data.sensorType || typeof data.sensorType !== 'string' || !data.sensorType.trim()) {
      return `Data Source '${label}' requires a valid non-empty 'sensorType'.`;
    }
  }

  if (node.type === 'mathOperation') {
    const op = data.operation || 'threshold';
    if (!KNOWN_MATH_OPERATIONS.has(op)) {
      return `Math Operation '${label}' has unsupported operation '${op}'. Allowed: threshold, moving_average, sum, min, max.`;
    }

    if (op === 'threshold') {
      const oper = data.operator || '>';
      if (!KNOWN_THRESHOLD_OPERATORS.has(oper)) {
        return `Threshold '${label}' has invalid comparison operator '${oper}'. Allowed: >, >=, <, <=, ==, !=.`;
      }
      const val = data.thresholdValue !== undefined ? Number(data.thresholdValue) : 80;
      if (isNaN(val)) {
        return `Threshold '${label}' requires a valid numeric 'thresholdValue'.`;
      }
    }

    if (op === 'moving_average') {
      const window = data.windowSize !== undefined ? Number(data.windowSize) : 5;
      if (isNaN(window) || window < 1) {
        return `Moving Average '${label}' requires a 'windowSize' >= 1.`;
      }
    }
  }

  if (node.type === 'actionTrigger') {
    const actionType = data.actionType || 'sms_alert';
    if (!actionType || typeof actionType !== 'string') {
      return `Action Trigger '${label}' requires a valid 'actionType'.`;
    }
    if (!data.target || typeof data.target !== 'string' || !data.target.trim()) {
      return `Action Trigger '${label}' requires a non-empty destination 'target' (phone number or URL).`;
    }
  }

  return null;
};

/**
 * Parses and validates a rule graph.
 *
 * @param {Object} rawGraph - Graph object with { nodes, edges, version }
 * @returns {Object} { sortedNodes, edges, adjacency, inDegree, nodeMap }
 * @throws {GraphValidationError} if validation fails
 */
export const parseGraph = (rawGraph) => {
  const errors = [];

  if (!rawGraph || typeof rawGraph !== 'object') {
    throw new GraphValidationError('Invalid graph input: payload must be an object.');
  }

  const normalizedGraph = typeof rawGraph.toObject === 'function' ? rawGraph.toObject() : rawGraph;

  const rawNodes = Array.isArray(normalizedGraph.nodes) ? normalizedGraph.nodes : [];
  const rawEdges = Array.isArray(normalizedGraph.edges) ? normalizedGraph.edges : [];

  const nodes = rawNodes.map((n) =>
    typeof n.toObject === 'function' ? n.toObject() : n._doc ? { ...n._doc } : n
  );
  const edges = rawEdges.map((e) =>
    typeof e.toObject === 'function' ? e.toObject() : e._doc ? { ...e._doc } : e
  );

  if (nodes.length === 0) {
    throw new GraphValidationError('Rule graph is empty: at least one node is required.');
  }

  // 1. Verify Node ID uniqueness and known types
  const nodeMap = new Map();
  nodes.forEach((node) => {
    if (!node.id) {
      errors.push('All nodes must have a unique non-empty string id.');
      return;
    }
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node id detected: '${node.id}'. Node ids must be unique.`);
    }
    nodeMap.set(node.id, {
      ...node,
      data: { ...(node.data || {}) },
    });

    const configError = validateNodeConfig(node);
    if (configError) errors.push(configError);
  });

  // 2. Structural presence checks
  const dataSources = nodes.filter((n) => n.type === 'dataSource');
  const actionTriggers = nodes.filter((n) => n.type === 'actionTrigger');

  if (dataSources.length === 0) {
    errors.push('Rule graph requires at least one Data Source node (input).');
  }
  if (actionTriggers.length === 0) {
    errors.push('Rule graph requires at least one Action Trigger node (output).');
  }

  // 3. Build Adjacency and In-Degree structures
  const adjacency = new Map();
  const inDegree = new Map();
  const outgoing = new Map();

  nodes.forEach((n) => {
    adjacency.set(n.id, []);
    inDegree.set(n.id, 0);
    outgoing.set(n.id, 0);
  });

  const validEdges = [];
  edges.forEach((edge, index) => {
    if (!edge.source || !edge.target) {
      errors.push(`Edge at index ${index} must have both source and target.`);
      return;
    }
    if (!nodeMap.has(edge.source)) {
      errors.push(`Edge connects from non-existent source node '${edge.source}'.`);
      return;
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Edge connects to non-existent target node '${edge.target}'.`);
      return;
    }
    if (edge.source === edge.target) {
      errors.push(`Self-referential loop detected on node '${edge.source}'.`);
      return;
    }

    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    // Connection rules: Data Source -> Math or Action; Math -> Math or Action; Action -> none
    if (sourceNode.type === 'actionTrigger') {
      errors.push(`Action Trigger '${edge.source}' cannot have outgoing connections.`);
      return;
    }
    if (targetNode.type === 'dataSource') {
      errors.push(`Data Source '${edge.target}' cannot have incoming connections.`);
      return;
    }

    adjacency.get(edge.source).push(edge.target);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    outgoing.set(edge.source, outgoing.get(edge.source) + 1);
    validEdges.push(edge);
  });

  // 4. Orphan Node checks
  nodes.forEach((node) => {
    const label = node.data?.label || node.id;
    const inDeg = inDegree.get(node.id) || 0;
    const outDeg = outgoing.get(node.id) || 0;

    if (node.type === 'dataSource' && outDeg === 0) {
      errors.push(`Data Source '${label}' has no downstream connections (orphan input).`);
    } else if (node.type === 'actionTrigger' && inDeg === 0) {
      errors.push(`Action Trigger '${label}' has no incoming connections (orphan output).`);
    } else if (node.type === 'mathOperation') {
      if (inDeg === 0) {
        errors.push(`Math Operation '${label}' has no incoming stream (orphan processor).`);
      }
      if (outDeg === 0) {
        errors.push(`Math Operation '${label}' has no outgoing connection (disconnected output).`);
      }
    }
  });

  if (errors.length > 0) {
    throw new GraphValidationError(
      `Rule graph validation failed with ${errors.length} error(s): ${errors[0]}`,
      errors
    );
  }

  // 5. Kahn's Algorithm for Topological Sort & Cycle Detection
  const sortedNodes = [];
  const inDegreeCopy = new Map(inDegree);
  const queue = [];

  // Seed queue with nodes having inDegree == 0 (all dataSources)
  nodes.forEach((n) => {
    if (inDegreeCopy.get(n.id) === 0) {
      queue.push(n.id);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift();
    sortedNodes.push(nodeMap.get(currentId));

    const neighbors = adjacency.get(currentId) || [];
    for (const neighborId of neighbors) {
      const remainingInDegree = inDegreeCopy.get(neighborId) - 1;
      inDegreeCopy.set(neighborId, remainingInDegree);
      if (remainingInDegree === 0) {
        queue.push(neighborId);
      }
    }
  }

  // If sortedNodes.length !== nodes.length, a cycle exists
  if (sortedNodes.length !== nodes.length) {
    // Identify cycle nodes (nodes with inDegree > 0)
    const cycleNodeIds = [];
    inDegreeCopy.forEach((deg, id) => {
      if (deg > 0) cycleNodeIds.push(id);
    });

    const cycleMsg = `Cycle detected in rule graph involving nodes: [${cycleNodeIds.join(', ')}]. Rule graphs must be directed acyclic graphs (DAGs).`;
    throw new GraphValidationError(cycleMsg, [cycleMsg]);
  }

  return {
    sortedNodes,
    edges: validEdges,
    adjacency,
    inDegree,
    nodeMap,
  };
};

export default parseGraph;
