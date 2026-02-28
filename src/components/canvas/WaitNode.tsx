import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

export default function WaitNode({ data }: { data: { label: string; days?: number } }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-800/60 border border-slate-700 rounded-full">
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2 !border-0" />
      <Clock className="w-3 h-3 text-slate-500" />
      <span className="text-[11px] text-slate-400">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2 !border-0" />
    </div>
  );
}
