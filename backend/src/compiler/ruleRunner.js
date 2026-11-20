import compileGraph from './compileGraph.js';
import telemetryBus from './telemetryBus.js';
import AlertEvent from '../models/AlertEvent.js';

/**
 * RuleRunner Engine
 *
 * Manages the lifecycle of active compiled RxJS rule graph pipelines.
 * Tracks active subscriptions, handles alert generation with cooldown suppression,
 * and ensures non-blocking, isolated execution.
 */
class RuleRunner {
  constructor() {
    // Map of active graphs: graphId (string) -> entry
    this.activeGraphs = new Map();
    // Cooldown map: `${graphId}:${nodeId}` -> timestamp (ms)
    this.lastTriggeredTimes = new Map();
  }

  /**
   * Activates a compiled rule graph.
   * If already active, stops previous instance first to guarantee no duplicate subscriptions.
   *
   * @param {string|Object} graphId - Graph ID
   * @param {Object} graphDoc - RuleGraph document or graph payload
   * @param {string|Object} ownerId - ID of owning user
   * @returns {Object} { success: true, graphId, ruleName, metadata, activatedAt }
   */
  activate(graphId, graphDoc, ownerId) {
    const idStr = String(graphId);

    // If already active, deactivate first to prevent duplicate subscriptions
    if (this.activeGraphs.has(idStr)) {
      this.deactivate(idStr);
    }

    const ruleName = graphDoc.name || 'NexusFlow Rule';
    const graphData = graphDoc.graph || graphDoc;

    // Define Action listener with cooldown & AlertEvent persistence
    const actionListener = async (eventData) => {
      const nodeId = eventData.nodeId || 'action-node';
      const cooldownSec =
        eventData.cooldownSeconds !== undefined ? Number(eventData.cooldownSeconds) : 10;
      const cooldownMs = Math.max(0, cooldownSec * 1000);
      const cooldownKey = `${idStr}:${nodeId}`;

      const now = Date.now();
      const lastTime = this.lastTriggeredTimes.get(cooldownKey) || 0;

      if (now - lastTime < cooldownMs) {
        // Cooldown active: suppress duplicate alert event
        return;
      }

      this.lastTriggeredTimes.set(cooldownKey, now);

      const readingVal = eventData.reading?.value;
      const deviceId =
        eventData.reading?.metadata?.deviceId || eventData.reading?.deviceId || 'device';
      const sensorType =
        eventData.reading?.metadata?.sensorType || eventData.reading?.sensorType || 'metric';

      const alertMessage = eventData.template
        ? eventData.template
            .replace(/\{\{device\}\}/g, deviceId)
            .replace(/\{\{metric\}\}/g, sensorType)
            .replace(/\{\{value\}\}/g, String(readingVal))
        : `[ALERT] Rule '${ruleName}' triggered for ${deviceId} (${sensorType}: ${readingVal})`;

      try {
        await AlertEvent.create({
          graphId: idStr,
          owner: ownerId,
          ruleName,
          actionType: eventData.actionType || 'sms_alert',
          target: eventData.target || '',
          reading: eventData.reading || {},
          message: alertMessage,
          triggeredAt: new Date(),
        });
      } catch (err) {
        console.error(`[AlertEvent Save Error] Graph ${idStr}:`, err.message);
      }
    };

    // Compile into executable RxJS streams
    const compiled = compileGraph(graphData, {
      ruleName,
      inputObservable: telemetryBus,
      actionListener,
    });

    // Start pipeline subscriptions
    compiled.start();

    const activatedAt = new Date().toISOString();
    this.activeGraphs.set(idStr, {
      graphId: idStr,
      ownerId: String(ownerId),
      ruleName,
      compiled,
      activatedAt,
    });

    return {
      success: true,
      graphId: idStr,
      ruleName,
      metadata: compiled.metadata,
      activatedAt,
    };
  }

  /**
   * Deactivates and stops a running rule graph.
   *
   * @param {string|Object} graphId
   * @returns {Object} { success: true, message }
   */
  deactivate(graphId) {
    const idStr = String(graphId);
    const entry = this.activeGraphs.get(idStr);

    if (!entry) {
      return { success: true, message: 'Graph was not active.' };
    }

    entry.compiled.stop();
    this.activeGraphs.delete(idStr);

    // Clean up cooldown entries for this graph
    for (const key of this.lastTriggeredTimes.keys()) {
      if (key.startsWith(`${idStr}:`)) {
        this.lastTriggeredTimes.delete(key);
      }
    }

    return {
      success: true,
      graphId: idStr,
      ruleName: entry.ruleName,
      message: `Rule graph '${entry.ruleName}' deactivated successfully.`,
    };
  }

  /**
   * Checks if a graph is actively running.
   */
  isActive(graphId) {
    return this.activeGraphs.has(String(graphId));
  }

  /**
   * Lists all active graphs for a given user.
   */
  listActive(ownerId = null) {
    const list = [];
    for (const entry of this.activeGraphs.values()) {
      if (!ownerId || entry.ownerId === String(ownerId)) {
        list.push({
          graphId: entry.graphId,
          ruleName: entry.ruleName,
          activatedAt: entry.activatedAt,
          metadata: entry.compiled.metadata,
        });
      }
    }
    return list;
  }

  /**
   * Graceful shutdown: stops all active graphs.
   */
  stopAll() {
    let stoppedCount = 0;
    for (const [id, entry] of this.activeGraphs.entries()) {
      try {
        entry.compiled.stop();
        stoppedCount++;
      } catch (err) {
        console.error(`[RuleRunner stopAll Error] Graph ${id}:`, err.message);
      }
    }
    this.activeGraphs.clear();
    this.lastTriggeredTimes.clear();
    return { success: true, stoppedCount };
  }
}

// Singleton RuleRunner instance
export const ruleRunner = new RuleRunner();
export default ruleRunner;
