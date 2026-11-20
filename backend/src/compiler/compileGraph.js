import { merge, Subscription } from 'rxjs';
import { share } from 'rxjs/operators';
import { telemetryBus } from './telemetryBus.js';
import { parseGraph } from './graphParser.js';
import {
  createDataSourceOperator,
  createMathOperationOperators,
  createActionTriggerOperators,
} from './nodeFactories.js';

/**
 * Logic Compiler
 *
 * Compiles a React Flow JSON graph (DAG) into an executable RxJS pipeline.
 *
 * Features:
 * - Validates schema, connectivity, and acyclicity via graphParser
 * - Builds multi-branch observable streams using share()
 * - Supports merge of multiple incoming streams to a single node
 * - Returns lifecycle object { start, stop, metadata, nodeObservables }
 *
 * @param {Object} rawGraph - Graph definition or Mongoose RuleGraph document
 * @param {Object} [options]
 * @param {Observable} [options.inputObservable] - Upstream input (defaults to telemetryBus)
 * @param {Function} [options.actionListener] - Callback fired on action execution (for tests/telemetry)
 * @param {string} [options.ruleName] - Human-readable rule name
 * @returns {Object} Compiled pipeline controller
 */
export const compileGraph = (rawGraph, options = {}) => {
  const plainGraph = typeof rawGraph.toObject === 'function' ? rawGraph.toObject() : rawGraph;
  // Extract graph payload if wrapped inside Mongoose doc or { graph: { ... } }
  const graphData = plainGraph.graph ? plainGraph.graph : plainGraph;
  const ruleName = options.ruleName || plainGraph.name || 'NexusFlow Rule';
  const inputObservable = options.inputObservable || telemetryBus;
  const actionListener = options.actionListener || null;

  // 1. Parse and validate DAG structure
  const { sortedNodes, edges } = parseGraph(graphData);

  // 2. Build upstream lookup map (targetId -> array of sourceIds)
  const incomingMap = new Map();
  sortedNodes.forEach((n) => incomingMap.set(n.id, []));
  edges.forEach((e) => {
    if (incomingMap.has(e.target)) {
      incomingMap.get(e.target).push(e.source);
    }
  });

  // 3. Assemble node observables in topological order
  const nodeObservables = new Map();
  const sinkObservables = [];

  for (const node of sortedNodes) {
    if (node.type === 'dataSource') {
      // Data Source taps directly into the inputObservable bus with filtering
      const filterOp = createDataSourceOperator(node);
      const stream$ = inputObservable.pipe(filterOp, share());
      nodeObservables.set(node.id, stream$);
    } else if (node.type === 'mathOperation') {
      // Math Operation combines upstream streams, applies transforms, and shares output
      const upstreamSources = incomingMap.get(node.id) || [];
      if (upstreamSources.length === 0) {
        throw new Error(`Math node '${node.id}' has no upstream streams.`);
      }

      const upstreamStreams = upstreamSources.map((sourceId) => {
        const stream = nodeObservables.get(sourceId);
        if (!stream) {
          throw new Error(`Missing upstream stream for node '${sourceId}'.`);
        }
        return stream;
      });

      const combinedStream$ =
        upstreamStreams.length === 1 ? upstreamStreams[0] : merge(...upstreamStreams);
      const mathOps = createMathOperationOperators(node);
      const processedStream$ = combinedStream$.pipe(...mathOps, share());
      nodeObservables.set(node.id, processedStream$);
    } else if (node.type === 'actionTrigger') {
      // Action Trigger is a sink node; logs action or dispatches event
      const upstreamSources = incomingMap.get(node.id) || [];
      if (upstreamSources.length === 0) {
        throw new Error(`Action node '${node.id}' has no upstream streams.`);
      }

      const upstreamStreams = upstreamSources.map((sourceId) => {
        const stream = nodeObservables.get(sourceId);
        if (!stream) {
          throw new Error(`Missing upstream stream for node '${sourceId}'.`);
        }
        return stream;
      });

      const combinedStream$ =
        upstreamStreams.length === 1 ? upstreamStreams[0] : merge(...upstreamStreams);
      const actionOps = createActionTriggerOperators(node, ruleName, actionListener);
      const actionStream$ = combinedStream$.pipe(...actionOps, share());
      nodeObservables.set(node.id, actionStream$);
      sinkObservables.push({ nodeId: node.id, stream$: actionStream$ });
    }
  }

  // 4. Construct execution lifecycle controller
  let rootSubscription = null;
  let isRunning = false;

  const metadata = {
    ruleName,
    version: graphData.version || '1.0.0',
    nodeCount: sortedNodes.length,
    edgeCount: edges.length,
    dataSources: sortedNodes
      .filter((n) => n.type === 'dataSource')
      .map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        deviceId: n.data?.deviceId,
        sensorType: n.data?.sensorType,
      })),
    mathOperations: sortedNodes
      .filter((n) => n.type === 'mathOperation')
      .map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        operation: n.data?.operation,
        operator: n.data?.operator,
        thresholdValue: n.data?.thresholdValue,
        windowSize: n.data?.windowSize,
      })),
    actionTriggers: sortedNodes
      .filter((n) => n.type === 'actionTrigger')
      .map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        actionType: n.data?.actionType,
        target: n.data?.target,
      })),
    topologicalOrder: sortedNodes.map((n) => n.id),
    compiledAt: new Date().toISOString(),
    get isRunning() {
      return isRunning;
    },
  };

  const start = () => {
    if (isRunning) return metadata;

    const compositeSub = new Subscription();
    sinkObservables.forEach(({ nodeId, stream$ }) => {
      const sub = stream$.subscribe({
        error: (err) => console.error(`[COMPILER STREAM ERROR] Node ${nodeId}:`, err),
      });
      compositeSub.add(sub);
    });

    rootSubscription = compositeSub;
    isRunning = true;
    return metadata;
  };

  const stop = () => {
    if (!isRunning || !rootSubscription) return metadata;
    rootSubscription.unsubscribe();
    rootSubscription = null;
    isRunning = false;
    return metadata;
  };

  return {
    start,
    stop,
    metadata,
    nodeObservables,
    sinkObservables,
  };
};

export default compileGraph;
