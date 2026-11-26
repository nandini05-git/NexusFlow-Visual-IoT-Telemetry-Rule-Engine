import { describe, it, expect, beforeEach } from 'vitest';
import { graphActivityStore } from './graphActivityStore.js';

describe('NexusFlow GraphActivityStore Client Store Test Suite', () => {
  beforeEach(() => {
    graphActivityStore.setActiveGraph('test-graph-1');
    graphActivityStore.setLiveActivityEnabled(true);
  });

  it('1. Initial node state defaults to idle', () => {
    const state = graphActivityStore.getNodeState('unknown-node');
    expect(state.isHot).toBe(false);
    expect(state.count).toBe(0);
    expect(state.ruleFired).toBe(false);
  });

  it('2. processNodeActivity updates node state and notifies subscribed listener', () => {
    let notifiedState = null;
    const unsubscribe = graphActivityStore.subscribeNode('source-node', (state) => {
      notifiedState = state;
    });

    graphActivityStore.processNodeActivity('test-graph-1', [
      { nodeId: 'source-node', count: 5, lastValue: 92.4, at: Date.now() },
    ]);

    expect(notifiedState).not.toBeNull();
    expect(notifiedState.isHot).toBe(true);
    expect(notifiedState.count).toBe(5);
    expect(notifiedState.lastValue).toBe(92.4);

    const directState = graphActivityStore.getNodeState('source-node');
    expect(directState.isHot).toBe(true);
    expect(directState.count).toBe(5);

    unsubscribe();
  });

  it('3. Graph isolation: ignores nodeActivity intended for a different graph', () => {
    let callCount = 0;
    const unsubscribe = graphActivityStore.subscribeNode('foreign-node', () => {
      callCount++;
    });

    // Initial state call on subscribe
    expect(callCount).toBe(1);

    graphActivityStore.processNodeActivity('other-graph-999', [
      { nodeId: 'foreign-node', count: 10, lastValue: 120, at: Date.now() },
    ]);

    // Should NOT trigger callback again because graphId does not match activeGraphId
    expect(callCount).toBe(1);
    expect(graphActivityStore.getNodeState('foreign-node').isHot).toBe(false);

    unsubscribe();
  });

  it('4. processRuleFired marks action node as ruleFired and notifies store', () => {
    let actionState = null;
    const unsubscribe = graphActivityStore.subscribeNode('action-sink', (state) => {
      actionState = state;
    });

    graphActivityStore.processRuleFired('test-graph-1', 'action-sink', Date.now());

    expect(actionState).not.toBeNull();
    expect(actionState.ruleFired).toBe(true);
    expect(actionState.isHot).toBe(true);

    const storeState = graphActivityStore.getStoreState();
    expect(storeState.lastAlertTime).not.toBeNull();

    unsubscribe();
  });

  it('5. setActiveGraph flushes prior graph state', () => {
    graphActivityStore.processNodeActivity('test-graph-1', [
      { nodeId: 'temp-node', count: 8, lastValue: 88, at: Date.now() },
    ]);
    expect(graphActivityStore.getNodeState('temp-node').isHot).toBe(true);

    graphActivityStore.setActiveGraph('test-graph-2');
    expect(graphActivityStore.getNodeState('temp-node').isHot).toBe(false);
    expect(graphActivityStore.activeGraphId).toBe('test-graph-2');
  });

  it('6. setLiveActivityEnabled(false) turns off live visual updates', () => {
    let callCount = 0;
    const unsubscribe = graphActivityStore.subscribeNode('monitored-node', () => {
      callCount++;
    });

    graphActivityStore.setLiveActivityEnabled(false);
    const initialCalls = callCount;

    graphActivityStore.processNodeActivity('test-graph-1', [
      { nodeId: 'monitored-node', count: 12, lastValue: 75, at: Date.now() },
    ]);

    // Should not notify because live activity is toggled off
    expect(callCount).toBe(initialCalls);

    unsubscribe();
  });
});
