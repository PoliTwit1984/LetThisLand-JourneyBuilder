// Converts flat touchpoints[] → React Flow nodes + edges for the visual canvas.

import type { Node, Edge } from '@xyflow/react';

interface TouchpointData {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content: Record<string, unknown>;
}

// Node spacing constants
const NODE_GAP = 80;
const SEND_HEIGHT = 72;
const WAIT_HEIGHT = 40;
const DECISION_HEIGHT = 56;
const TERMINAL_HEIGHT = 40;
const NODE_X = 200; // Center x position

export interface GraphNodeData {
  label: string;
  channel?: string;
  day?: number;
  touchpointId?: string;
  condition?: string;
  days?: number;
  [key: string]: unknown;
}

export function buildGraph(touchpoints: TouchpointData[]): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const sorted = [...touchpoints].sort((a, b) => a.sequence - b.sequence);
  const nodes: Node<GraphNodeData>[] = [];
  const edges: Edge[] = [];
  let y = 40;

  // Entry node
  const entryId = '__entry__';
  nodes.push({
    id: entryId,
    type: 'entryNode',
    position: { x: NODE_X, y },
    data: { label: 'Journey Start' },
    draggable: false,
  });
  y += TERMINAL_HEIGHT + NODE_GAP;

  let prevNodeId = entryId;
  let prevDay = 0;

  for (let i = 0; i < sorted.length; i++) {
    const tp = sorted[i];

    // Insert wait node if there's a day gap (including before first touchpoint if day > 0)
    const dayGap = tp.day - prevDay;
    if (dayGap > 0) {
      const waitId = `__wait_${i}__`;
      nodes.push({
        id: waitId,
        type: 'waitNode',
        position: { x: NODE_X, y },
        data: { label: `Wait ${dayGap} day${dayGap !== 1 ? 's' : ''}`, days: dayGap },
        draggable: false,
      });
      edges.push({
        id: `e-${prevNodeId}-${waitId}`,
        source: prevNodeId,
        target: waitId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#475569' },
      });
      prevNodeId = waitId;
      y += WAIT_HEIGHT + NODE_GAP * 0.6;
    }

    // Insert decision node if condition differs from previous (skip first touchpoint — entry already implies start)
    const prevTp = i > 0 ? sorted[i - 1] : null;
    const hasNewCondition = i > 0 && tp.condition && tp.condition !== prevTp?.condition;
    if (hasNewCondition) {
      const decId = `__dec_${i}__`;
      nodes.push({
        id: decId,
        type: 'decisionNode',
        position: { x: NODE_X, y },
        data: { label: tp.condition || '', condition: tp.condition || '' },
        draggable: false,
      });
      edges.push({
        id: `e-${prevNodeId}-${decId}`,
        source: prevNodeId,
        target: decId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#475569' },
      });
      prevNodeId = decId;
      y += DECISION_HEIGHT + NODE_GAP * 0.6;
    }

    // Send node (the actual touchpoint)
    const sendId = `send_${tp.id}`;
    nodes.push({
      id: sendId,
      type: 'sendNode',
      position: { x: NODE_X, y },
      data: {
        label: tp.name,
        channel: tp.channel,
        day: tp.day,
        touchpointId: tp.id,
      },
      draggable: false,
    });
    edges.push({
      id: `e-${prevNodeId}-${sendId}`,
      source: prevNodeId,
      target: sendId,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#475569' },
    });

    prevNodeId = sendId;
    prevDay = tp.day;
    y += SEND_HEIGHT + NODE_GAP;
  }

  // Exit node
  const exitId = '__exit__';
  nodes.push({
    id: exitId,
    type: 'exitNode',
    position: { x: NODE_X, y },
    data: { label: 'Journey End' },
    draggable: false,
  });
  edges.push({
    id: `e-${prevNodeId}-${exitId}`,
    source: prevNodeId,
    target: exitId,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#475569' },
  });

  return { nodes, edges };
}
