import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function EntryNode({ data }: { data: { label: string } }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
      <span className="text-xs font-semibold text-emerald-400">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-2 !h-2 !border-0" />
    </div>
  );
}
