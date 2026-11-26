/**
 * Graph Activity Store
 * High-performance, lightweight subscriber-based activity store for live
 * node & wire glow feedback.
 *
 * Designed to prevent full-canvas React re-renders by allowing individual
 * nodes and edges to subscribe only to their own state updates.
 */

class GraphActivityStore {
  constructor() {
    this.activeGraphId = null;
    this.liveActivityEnabled = true;
    this.prefersReducedMotion = false;

    // Node activity state: nodeId -> { count, lastValue, at, ruleFired, ruleFiredAt }
    this.nodeActivity = new Map();

    // Fine-grained listeners: nodeId -> Set<callback>
    this.nodeListeners = new Map();

    // General store listeners (for status strip, legend, controls)
    this.storeListeners = new Set();

    // Rolling metrics
    this.eventsPerSecond = 0;
    this.rollingCounts = [];
    this.lastAlertTime = null;

    // Decay interval (checks every 150ms for decaying nodes)
    this.decayInterval = null;
    this.metricsInterval = null;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mediaQuery.matches;
      mediaQuery.addEventListener?.('change', (e) => {
        this.prefersReducedMotion = e.matches;
        this.notifyStore();
      });
    }

    this.startIntervals();
  }

  startIntervals() {
    if (typeof window === 'undefined') return;

    // Decay check: fades out activity after ~1200ms
    this.decayInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const [nodeId, item] of this.nodeActivity.entries()) {
        const isHot = now - item.at < 1200;
        const ruleFiredActive = item.ruleFired && now - (item.ruleFiredAt || 0) < 1500;

        if (!isHot && !ruleFiredActive) {
          // Node has fully decayed to idle
          this.nodeActivity.delete(nodeId);
          this.notifyNode(nodeId, { isHot: false, count: 0, lastValue: item.lastValue, ruleFired: false });
          changed = true;
        } else if (item.ruleFired && !ruleFiredActive) {
          item.ruleFired = false;
          this.notifyNode(nodeId, { isHot, count: item.count, lastValue: item.lastValue, ruleFired: false });
          changed = true;
        }
      }

      if (changed) {
        this.notifyStore();
      }
    }, 150);

    // Events-per-second metric calculation (1 second window)
    this.metricsInterval = setInterval(() => {
      const now = Date.now();
      this.rollingCounts = this.rollingCounts.filter((e) => now - e.time < 1000);
      const totalEvents = this.rollingCounts.reduce((acc, c) => acc + c.count, 0);
      this.eventsPerSecond = totalEvents;
      this.notifyStore();
    }, 500);
  }

  setActiveGraph(graphId) {
    if (this.activeGraphId !== graphId) {
      this.activeGraphId = graphId ? String(graphId) : null;
      this.nodeActivity.clear();
      this.rollingCounts = [];
      this.eventsPerSecond = 0;
      this.notifyAllNodes();
      this.notifyStore();
    }
  }

  setLiveActivityEnabled(enabled) {
    this.liveActivityEnabled = Boolean(enabled);
    this.notifyAllNodes();
    this.notifyStore();
  }

  /**
   * Ingests nodeActivity batches from WebSocket.
   * Discards activity if graphId does not match currently active graph.
   */
  processNodeActivity(graphId, nodes = []) {
    if (!this.liveActivityEnabled || !this.activeGraphId) return;
    if (String(graphId) !== String(this.activeGraphId)) return; // Ignore other graphs

    const now = Date.now();
    let batchCount = 0;

    for (const node of nodes) {
      if (!node.nodeId) continue;
      const count = node.count || 1;
      batchCount += count;

      const state = {
        nodeId: node.nodeId,
        count,
        lastValue: node.lastValue,
        at: now,
        isHot: true,
        ruleFired: false,
      };

      this.nodeActivity.set(node.nodeId, state);
      this.notifyNode(node.nodeId, state);
    }

    if (batchCount > 0) {
      this.rollingCounts.push({ time: now, count: batchCount });
    }
  }

  /**
   * Ingests ruleFired event from WebSocket.
   */
  processRuleFired(graphId, nodeId, at) {
    if (!this.activeGraphId || String(graphId) !== String(this.activeGraphId)) return;

    const now = Date.now();
    this.lastAlertTime = at ? new Date(at).toLocaleTimeString() : new Date().toLocaleTimeString();

    const existing = this.nodeActivity.get(nodeId) || {
      nodeId,
      count: 1,
      lastValue: undefined,
      at: now,
    };

    const state = {
      ...existing,
      at: now,
      isHot: true,
      ruleFired: true,
      ruleFiredAt: now,
    };

    this.nodeActivity.set(nodeId, state);
    this.notifyNode(nodeId, state);
    this.notifyStore();
  }

  // Node subscription helper
  subscribeNode(nodeId, callback) {
    if (!this.nodeListeners.has(nodeId)) {
      this.nodeListeners.set(nodeId, new Set());
    }
    this.nodeListeners.get(nodeId).add(callback);

    // Initial state call
    const current = this.getNodeState(nodeId);
    callback(current);

    return () => {
      const set = this.nodeListeners.get(nodeId);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.nodeListeners.delete(nodeId);
      }
    };
  }

  getNodeState(nodeId) {
    if (!this.liveActivityEnabled) {
      return { isHot: false, count: 0, lastValue: undefined, ruleFired: false };
    }
    const item = this.nodeActivity.get(nodeId);
    if (!item) return { isHot: false, count: 0, lastValue: undefined, ruleFired: false };
    const isHot = Date.now() - item.at < 1200;
    return {
      isHot,
      count: item.count,
      lastValue: item.lastValue,
      ruleFired: Boolean(item.ruleFired),
    };
  }

  notifyNode(nodeId, state) {
    const listeners = this.nodeListeners.get(nodeId);
    if (listeners) {
      for (const cb of listeners) {
        cb(state);
      }
    }
  }

  notifyAllNodes() {
    for (const nodeId of this.nodeListeners.keys()) {
      const state = this.getNodeState(nodeId);
      this.notifyNode(nodeId, state);
    }
  }

  // General store subscription
  subscribeStore(callback) {
    this.storeListeners.add(callback);
    callback(this.getStoreState());
    return () => this.storeListeners.delete(callback);
  }

  getStoreState() {
    return {
      activeGraphId: this.activeGraphId,
      liveActivityEnabled: this.liveActivityEnabled,
      eventsPerSecond: this.eventsPerSecond,
      lastAlertTime: this.lastAlertTime,
      prefersReducedMotion: this.prefersReducedMotion,
      activeNodesCount: this.nodeActivity.size,
    };
  }

  notifyStore() {
    const state = this.getStoreState();
    for (const cb of this.storeListeners) {
      cb(state);
    }
  }

  destroy() {
    clearInterval(this.decayInterval);
    clearInterval(this.metricsInterval);
    this.nodeActivity.clear();
    this.nodeListeners.clear();
    this.storeListeners.clear();
  }
}

export const graphActivityStore = new GraphActivityStore();
export default graphActivityStore;
