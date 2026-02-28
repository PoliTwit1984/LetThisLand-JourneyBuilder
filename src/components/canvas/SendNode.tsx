import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mail, Bell, Smartphone } from 'lucide-react';

const channelConfig: Record<string, { icon: typeof Mail; color: string; bg: string; border: string }> = {
  email: { icon: Mail, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  push: { icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  inapp: { icon: Smartphone, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

interface SendNodeData {
  label: string;
  channel?: string;
  day?: number;
  touchpointId?: string;
  onSelect?: (id: string) => void;
}

export default function SendNode({ data, selected }: { data: SendNodeData; selected?: boolean }) {
  const cfg = channelConfig[data.channel || 'email'] || channelConfig.email;
  const Icon = cfg.icon;

  return (
    <div
      className={`w-[220px] px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${cfg.bg} ${
        selected ? 'ring-2 ring-red-500/50 border-red-500/50' : cfg.border
      } hover:brightness-125`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${cfg.color} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-200 truncate">{data.label}</div>
          <div className="text-[10px] text-slate-500">Day {data.day ?? 0}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2 !border-0" />
    </div>
  );
}
