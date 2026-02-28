import React from 'react';

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-600',
  push: 'bg-purple-600',
  inapp: 'bg-emerald-600',
  sms: 'bg-amber-600',
};

export default function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span className={`${CHANNEL_COLORS[channel] || 'bg-slate-600'} text-white text-[10px] font-bold uppercase px-1.5 py-0.5 rounded`}>
      {channel}
    </span>
  );
}
