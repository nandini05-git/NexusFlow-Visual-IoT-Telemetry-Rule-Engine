import React, { useState, useEffect, memo } from 'react';
import { BaseEdge, getBezierPath } from '@xyflow/react';
import { graphActivityStore } from '../../utils/graphActivityStore';

/**
 * GlowEdge Component
 * High-performance React Flow custom edge that animates and glows when
 * telemetry data flows through its source node.
 *
 * Performance guarantee: Subscribes only to its own source node activity;
 * does not cause global canvas re-renders when data arrives.
 *
 * Accessibility: Replaces moving dash animation with static vibrant highlight
 * when user enables prefers-reduced-motion.
 */
function GlowEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const [activity, setActivity] = useState(() => graphActivityStore.getNodeState(source));
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  useEffect(() => {
    // Subscribe directly to source node activity events
    return graphActivityStore.subscribeNode(source, (state) => {
      setActivity(state);
    });
  }, [source]);

  const isHot = activity.isHot;
  const count = activity.count || 0;
  const isRuleFired = activity.ruleFired;
  const reducedMotion = graphActivityStore.prefersReducedMotion;

  // Derive dynamic stroke attributes based on activity level
  let strokeColor = '#334155'; // Idle slate-700
  let strokeWidth = 2;
  let filter = 'none';
  let isAnimated = false;

  if (isHot) {
    if (isRuleFired) {
      strokeColor = '#f43f5e'; // Rose-500
      strokeWidth = 3.5;
      filter = 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.8))';
      isAnimated = !reducedMotion;
    } else if (count > 5) {
      // High throughput: brighter, thicker
      strokeColor = '#38bdf8'; // Sky-400
      strokeWidth = 3.5;
      filter = 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.85))';
      isAnimated = !reducedMotion;
    } else {
      // Moderate throughput: clean cyan glow
      strokeColor = '#06b6d4'; // Cyan-500
      strokeWidth = 2.5;
      filter = 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))';
      isAnimated = !reducedMotion;
    }
  }

  const customStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth,
    filter,
    transition: 'stroke 0.3s ease, stroke-width 0.3s ease, filter 0.3s ease',
  };

  return (
    <>
      {/* Base path */}
      <BaseEdge id={id} path={edgePath} style={customStyle} markerEnd={markerEnd} />

      {/* Flowing animated particle overlay when hot (and motion not reduced) */}
      {isHot && isAnimated && (
        <path
          d={edgePath}
          fill="none"
          stroke={isRuleFired ? '#fda4af' : '#a5f3fc'}
          strokeWidth={strokeWidth}
          strokeDasharray="6 8"
          className="glow-edge-animated"
          style={{
            filter: 'drop-shadow(0 0 4px #fff)',
            pointerEvents: 'none',
          }}
        />
      )}
    </>
  );
}

export const GlowEdge = memo(GlowEdgeComponent);
export default GlowEdge;
