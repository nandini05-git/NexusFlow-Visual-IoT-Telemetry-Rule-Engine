import { useState, useEffect, useCallback, useRef } from 'react';
import { graphActivityStore } from '../utils/graphActivityStore';
import { useAuth } from '../context/AuthContext';

/**
 * useGraphActivity Hook
 * Connects to the backend WebSocket stream, routes nodeActivity and ruleFired
 * events to the graphActivityStore for the current active graph, and provides
 * real-time metrics for the canvas status strip.
 */
export function useGraphActivity(currentGraphId, isGraphActive = false) {
  const { token } = useAuth();
  const [storeState, setStoreState] = useState(() => graphActivityStore.getStoreState());
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Sync active graph ID with the activity store
  useEffect(() => {
    graphActivityStore.setActiveGraph(currentGraphId);
  }, [currentGraphId]);

  // Subscribe to general store state changes (events/sec, last alert time, toggle)
  useEffect(() => {
    return graphActivityStore.subscribeStore((newState) => {
      setStoreState(newState);
    });
  }, []);

  // Connect & maintain WebSocket connection
  const connectSocket = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Build WebSocket URL from API URL or window.location
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const wsUrl = apiUrl.replace(/^http/, 'ws');

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        // Authenticate and subscribe to the currently loaded graph
        if (currentGraphId) {
          socket.send(
            JSON.stringify({
              type: 'subscribeGraph',
              graphId: currentGraphId,
              token: token || localStorage.getItem('nexusflow_token'),
            })
          );
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'nodeActivity') {
            graphActivityStore.processNodeActivity(data.graphId, data.nodes);
          } else if (data.type === 'ruleFired') {
            graphActivityStore.processRuleFired(data.graphId, data.nodeId, data.at);
          }
        } catch {
          // Non-JSON message ignored
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        // Auto-reconnect with exponential backoff (2s)
        reconnectTimerRef.current = setTimeout(connectSocket, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch (err) {
      console.warn('[useGraphActivity WS Connection Error]:', err.message);
    }
  }, [currentGraphId, token]);

  useEffect(() => {
    connectSocket();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectSocket]);

  // Update subscription when graph ID changes on an existing socket
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentGraphId) {
      socketRef.current.send(
        JSON.stringify({
          type: 'subscribeGraph',
          graphId: currentGraphId,
          token: token || localStorage.getItem('nexusflow_token'),
        })
      );
    }
  }, [currentGraphId, token]);

  const toggleLiveActivity = useCallback(() => {
    graphActivityStore.setLiveActivityEnabled(!storeState.liveActivityEnabled);
  }, [storeState.liveActivityEnabled]);

  return {
    ...storeState,
    toggleLiveActivity,
  };
}

export default useGraphActivity;
