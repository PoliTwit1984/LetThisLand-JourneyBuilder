import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildGraph, type GraphNodeData } from '../services/touchpointGraph.js';
import EntryNode from './canvas/EntryNode.js';
import WaitNode from './canvas/WaitNode.js';
import SendNode from './canvas/SendNode.js';
import DecisionNode from './canvas/DecisionNode.js';
import ExitNode from './canvas/ExitNode.js';

interface TouchpointData {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content: Record<string, unknown>;
}

interface Props {
  touchpoints: TouchpointData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const nodeTypes = {
  entryNode: EntryNode,
  waitNode: WaitNode,
  sendNode: SendNode,
  decisionNode: DecisionNode,
  exitNode: ExitNode,
};

export default function JourneyCanvas({ touchpoints, selectedId, onSelect }: Props) {
  const { nodes, edges } = useMemo(() => buildGraph(touchpoints), [touchpoints]);

  // Mark selected node
  const nodesWithSelection = useMemo(() =>
    nodes.map(n => ({
      ...n,
      selected: n.data.touchpointId === selectedId,
    })),
    [nodes, selectedId]
  );

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as GraphNodeData;
    if (data.touchpointId) {
      onSelect(data.touchpointId);
    }
  }, [onSelect]);

  return (
    <div className="h-full w-full" style={{ background: '#0f172a' }}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const data = node.data as GraphNodeData;
            if (node.type === 'entryNode') return '#10b981';
            if (node.type === 'exitNode') return '#ef4444';
            if (node.type === 'waitNode') return '#475569';
            if (node.type === 'decisionNode') return '#f59e0b';
            if (data.channel === 'email') return '#3b82f6';
            if (data.channel === 'push') return '#a855f7';
            if (data.channel === 'inapp') return '#22c55e';
            return '#64748b';
          }}
          style={{ background: '#0f172a', border: '1px solid #1e293b' }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
        <Controls
          showInteractive={false}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
        />
      </ReactFlow>
    </div>
  );
}
