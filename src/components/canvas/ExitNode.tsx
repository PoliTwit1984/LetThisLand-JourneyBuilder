import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function ExitNode({ data }: { data: { label: string } }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-2 !h-2 !border-0" />
      <div className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-500/30" />
      <span className="text-xs font-semibold text-red-400">{data.label}</span>
    </div>
  );
}
