import { WebSocket } from 'ws';

/**
 * Activity Tracker Service
 * Aggregates and throttles node execution events per active rule graph.
 * Flushes at most ~5 times/sec (200ms) over WebSocket to the graph owner's
 * browser sockets ONLY.
 *
 * Implements strict zero-overhead: when no browser socket is watching a graph,
 * activity aggregation is skipped completely.
 */
class ActivityTracker {
  constructor() {
    // Sockets per user: ownerId -> Set<ws>
    this.userSockets = new Map();
    // Sockets per graph: graphId -> Set<ws>
    this.graphWatchers = new Map();
    // Buffered activity: graphId -> Map<nodeId, { nodeId, count, lastValue, at }>
    this.activityBuffers = new Map();
    // Flush timers: graphId -> timeoutId
    this.flushTimers = new Map();
    // Flush rate limit: 200ms = 5Hz
    this.throttleIntervalMs = 200;
  }

  /**
   * Registers a connected WebSocket client.
   *
   * @param {WebSocket} ws
   * @param {string} ownerId
   * @param {string} [graphId]
   */
  registerSocket(ws, ownerId, graphId = null) {
    if (!ws || !ownerId) return;
    const uid = String(ownerId);
    ws.ownerId = uid;

    if (!this.userSockets.has(uid)) {
      this.userSockets.set(uid, new Set());
    }
    this.userSockets.get(uid).add(ws);

    if (graphId) {
      this.subscribeGraph(ws, graphId);
    }

    ws.on('close', () => this.unregisterSocket(ws));
  }

  /**
   * Subscribes an open socket to watch a specific graph's activity.
   */
  subscribeGraph(ws, graphId) {
    if (!ws || !graphId) return;
    const gid = String(graphId);

    // Unsubscribe from prior graph if any
    if (ws.subscribedGraphId && ws.subscribedGraphId !== gid) {
      this.unsubscribeGraph(ws, ws.subscribedGraphId);
    }

    ws.subscribedGraphId = gid;
    if (!this.graphWatchers.has(gid)) {
      this.graphWatchers.set(gid, new Set());
    }
    this.graphWatchers.get(gid).add(ws);
  }

  /**
   * Unsubscribes a socket from a graph.
   */
  unsubscribeGraph(ws, graphId) {
    const gid = String(graphId);
    const watchers = this.graphWatchers.get(gid);
    if (watchers) {
      watchers.delete(ws);
      if (watchers.size === 0) {
        this.graphWatchers.delete(gid);
        // Clear any pending buffer if no one is watching
        this.clearBuffer(gid);
      }
    }
    if (ws.subscribedGraphId === gid) {
      ws.subscribedGraphId = null;
    }
  }

  /**
   * Unregisters a disconnected socket from all registries.
   */
  unregisterSocket(ws) {
    if (!ws) return;
    const uid = ws.ownerId;
    if (uid && this.userSockets.has(uid)) {
      const set = this.userSockets.get(uid);
      set.delete(ws);
      if (set.size === 0) {
        this.userSockets.delete(uid);
      }
    }

    if (ws.subscribedGraphId) {
      this.unsubscribeGraph(ws, ws.subscribedGraphId);
    }
  }

  /**
   * Returns true if the graph owner currently has at least one active,
   * open WebSocket subscribed to watch this graph.
   */
  hasWatchers(graphId, ownerId) {
    const gid = String(graphId);
    const uid = String(ownerId);
    const watchers = this.graphWatchers.get(gid);
    if (!watchers || watchers.size === 0) return false;

    for (const ws of watchers) {
      if (ws.readyState === WebSocket.OPEN && ws.ownerId === uid) {
        return true;
      }
    }
    return false;
  }

  /**
   * Records node execution activity.
   * Skipped entirely if no owner sockets are watching this graph.
   */
  recordNodeActivity(graphId, ownerId, nodeId, value) {
    const gid = String(graphId);
    const uid = String(ownerId);

    // Zero-cost check: skip aggregation if owner is not actively watching
    if (!this.hasWatchers(gid, uid)) {
      return;
    }

    let buffer = this.activityBuffers.get(gid);
    if (!buffer) {
      buffer = new Map();
      this.activityBuffers.set(gid, buffer);
    }

    const existing = buffer.get(nodeId) || {
      nodeId,
      count: 0,
      lastValue: undefined,
      at: null,
    };

    existing.count += 1;
    if (value !== undefined) {
      existing.lastValue = value;
    }
    existing.at = new Date().toISOString();
    buffer.set(nodeId, existing);

    // Schedule throttled flush if timer not already running
    if (!this.flushTimers.has(gid)) {
      const timerId = setTimeout(() => {
        this.flushActivity(gid, uid);
      }, this.throttleIntervalMs);
      this.flushTimers.set(gid, timerId);
    }
  }

  /**
   * Alias for recordNodeActivity
   */
  recordActivity(graphId, ownerId, nodeId, value) {
    return this.recordNodeActivity(graphId, ownerId, nodeId, value);
  }

  /**
   * Flushes aggregated node activity to the graph owner's watching sockets.
   */
  flushActivity(graphId, ownerId) {
    const gid = String(graphId);
    const uid = String(ownerId);

    // Clear active timer entry
    this.flushTimers.delete(gid);

    const buffer = this.activityBuffers.get(gid);
    if (!buffer || buffer.size === 0) return;

    // Convert buffered nodes map to array
    const nodes = Array.from(buffer.values());
    this.activityBuffers.delete(gid);

    const message = JSON.stringify({
      type: 'nodeActivity',
      graphId: gid,
      nodes,
      flushedAt: new Date().toISOString(),
    });

    const watchers = this.graphWatchers.get(gid);
    if (!watchers) return;

    for (const ws of watchers) {
      if (ws.readyState === WebSocket.OPEN && ws.ownerId === uid) {
        try {
          ws.send(message);
        } catch (err) {
          console.warn('[ActivityTracker WS Send Error]:', err.message);
        }
      }
    }
  }

  /**
   * Sends an immediate ruleFired event when an Action Trigger executes.
   */
  recordRuleFired(graphId, ownerId, nodeId) {
    const gid = String(graphId);
    const uid = String(ownerId);

    if (!this.hasWatchers(gid, uid)) return;

    const message = JSON.stringify({
      type: 'ruleFired',
      graphId: gid,
      nodeId,
      at: new Date().toISOString(),
    });

    const watchers = this.graphWatchers.get(gid);
    if (!watchers) return;

    for (const ws of watchers) {
      if (ws.readyState === WebSocket.OPEN && ws.ownerId === uid) {
        try {
          ws.send(message);
        } catch (err) {
          console.warn('[ActivityTracker ruleFired Send Error]:', err.message);
        }
      }
    }
  }

  /**
   * Immediately flushes any pending buffer (useful for test assertions).
   */
  flushImmediately(graphId, ownerId) {
    const gid = String(graphId);
    const timer = this.flushTimers.get(gid);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(gid);
    }
    this.flushActivity(gid, ownerId);
  }

  /**
   * Clears buffer and active timers for a graph.
   */
  clearBuffer(graphId) {
    const gid = String(graphId);
    const timer = this.flushTimers.get(gid);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(gid);
    }
    this.activityBuffers.delete(gid);
  }

  /**
   * Resets all internal state (for testing).
   */
  reset() {
    for (const timer of this.flushTimers.values()) {
      clearTimeout(timer);
    }
    this.flushTimers.clear();
    this.activityBuffers.clear();
    this.graphWatchers.clear();
    this.userSockets.clear();
  }
}

const activityTracker = new ActivityTracker();
export { activityTracker };
export default activityTracker;
