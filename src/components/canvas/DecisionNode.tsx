import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export default function DecisionNode({ data }: { data: { label: string; condition?: string } }) {
  return (
    <div className="w-[200px] px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2 !h-2 !border-0" />
      <div className="flex items-start gap-2">
        <GitBranch className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <span className="text-[11px] text-amber-300 leading-snug line-clamp-2">{data.condition || data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2 !h-2 !border-0" />
    </div>
  );
}
