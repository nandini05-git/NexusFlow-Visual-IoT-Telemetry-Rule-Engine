import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { activityTracker } from '../src/services/activityTracker.js';

class MockWebSocket {
  constructor() {
    this.sentMessages = [];
    this.readyState = 1; // WebSocket.OPEN
    this.listeners = {};
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data));
  }

  on(event, cb) {
    this.listeners[event] = cb;
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    if (this.listeners['close']) this.listeners['close']();
  }
}

describe('NexusFlow Activity Tracker & WebSocket Throttler Test Suite', () => {
  beforeEach(() => {
    activityTracker.reset();
  });

  it('1. hasWatchers returns false when no sockets are subscribed', () => {
    assert.strictEqual(activityTracker.hasWatchers('graph-123', 'user-456'), false);
  });

  it('2. hasWatchers returns true after socket registers and subscribes to graph', () => {
    const ws = new MockWebSocket();
    activityTracker.registerSocket(ws, 'user-456', 'graph-123');

    assert.strictEqual(activityTracker.hasWatchers('graph-123', 'user-456'), true);
    assert.strictEqual(activityTracker.hasWatchers('graph-999', 'user-456'), false);
    assert.strictEqual(activityTracker.hasWatchers('graph-123', 'user-other'), false);
  });

  it('3. Unregistering or closing socket removes it from watchers', () => {
    const ws = new MockWebSocket();
    activityTracker.registerSocket(ws, 'user-456', 'graph-123');
    assert.strictEqual(activityTracker.hasWatchers('graph-123', 'user-456'), true);

    ws.close();
    assert.strictEqual(activityTracker.hasWatchers('graph-123', 'user-456'), false);
  });

  it('4. Zero-cost optimization: recordActivity does not buffer or set timers when no watchers exist', () => {
    activityTracker.recordActivity('graph-unwatched', 'user-nobody', 'node-1', 42);
    assert.strictEqual(activityTracker.activityBuffers.has('graph-unwatched'), false);
    assert.strictEqual(activityTracker.flushTimers.has('graph-unwatched'), false);
  });

  it('5. Throttled activity flush aggregates multiple rapid events into a single payload', async () => {
    const ws = new MockWebSocket();
    activityTracker.registerSocket(ws, 'user-1', 'graph-1');

    // Fire 10 rapid events
    for (let i = 1; i <= 10; i++) {
      activityTracker.recordActivity('graph-1', 'user-1', 'node-temp', 80 + i);
    }

    // Immediately after, buffer should be populated but not yet sent
    assert.strictEqual(ws.sentMessages.length, 0);

    // Wait for the 200ms throttle timer to flush
    await new Promise((resolve) => setTimeout(resolve, 260));

    // Exactly one aggregated message should be delivered
    assert.strictEqual(ws.sentMessages.length, 1);
    const msg = ws.sentMessages[0];
    assert.strictEqual(msg.type, 'nodeActivity');
    assert.strictEqual(msg.graphId, 'graph-1');
    assert.strictEqual(msg.nodes.length, 1);
    assert.strictEqual(msg.nodes[0].nodeId, 'node-temp');
    assert.strictEqual(msg.nodes[0].count, 10);
    assert.strictEqual(msg.nodes[0].lastValue, 90);
  });

  it('6. recordRuleFired delivers immediately without waiting for throttle window', () => {
    const ws = new MockWebSocket();
    activityTracker.registerSocket(ws, 'user-1', 'graph-1');

    activityTracker.recordRuleFired('graph-1', 'user-1', 'node-action-1');

    // Must be sent synchronously
    assert.strictEqual(ws.sentMessages.length, 1);
    assert.strictEqual(ws.sentMessages[0].type, 'ruleFired');
    assert.strictEqual(ws.sentMessages[0].graphId, 'graph-1');
    assert.strictEqual(ws.sentMessages[0].nodeId, 'node-action-1');
  });

  it('7. Graph isolation: events for graph-A are never sent to graph-B watcher', async () => {
    const wsA = new MockWebSocket();
    const wsB = new MockWebSocket();

    activityTracker.registerSocket(wsA, 'user-1', 'graph-A');
    activityTracker.registerSocket(wsB, 'user-1', 'graph-B');

    activityTracker.recordRuleFired('graph-A', 'user-1', 'action-node');

    assert.strictEqual(wsA.sentMessages.length, 1);
    assert.strictEqual(wsB.sentMessages.length, 0);
  });
});
