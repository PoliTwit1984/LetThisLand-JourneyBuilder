import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import ChannelBadge from './ChannelBadge.js';

interface TouchpointData {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  ai_reasoning: string | null;
  content: Record<string, unknown>;
}

interface Props {
  touchpoints: TouchpointData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  journeyName: string;
}

export default function JourneyTimeline({ touchpoints, selectedId, onSelect, journeyName }: Props) {
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);

  // Group by week
  const weeks = new Map<number, TouchpointData[]>();
  for (const tp of touchpoints) {
    const week = Math.floor(tp.day / 7);
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(tp);
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Journey header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 py-3 z-10">
        <h2 className="text-sm font-bold text-slate-100 truncate">{journeyName}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{touchpoints.length} touchpoints</p>
      </div>

      {/* Timeline */}
      <div className="px-5 py-3">
        {Array.from(weeks.entries()).sort(([a], [b]) => a - b).map(([week, tps]) => (
          <div key={week} className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              {week === 0 ? 'Day 0 — Entry' : `Week ${week} — Days ${week * 7}-${week * 7 + 6}`}
            </div>
            <div className="space-y-1">
              {tps.sort((a, b) => a.sequence - b.sequence).map(tp => (
                <div key={tp.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(tp.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(tp.id); } }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5 group cursor-pointer ${
                      selectedId === tp.id
                        ? 'bg-slate-800 border border-red-800/50 ring-1 ring-red-900/30'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    {/* Day badge */}
                    <span className="text-[11px] font-mono font-bold text-slate-500 w-6 text-right flex-shrink-0">
                      D{tp.day}
                    </span>

                    {/* Channel */}
                    <ChannelBadge channel={tp.channel} />

                    {/* Name + condition */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{tp.name}</div>
                      {tp.condition && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{tp.condition}</div>
                      )}
                    </div>

                    {/* Reasoning toggle */}
                    {tp.ai_reasoning && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedReasoning(expandedReasoning === tp.id ? null : tp.id);
                        }}
                        className="text-slate-600 hover:text-slate-400 p-0.5"
                        title="AI reasoning"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Expanded reasoning */}
                  {expandedReasoning === tp.id && tp.ai_reasoning && (
                    <div className="ml-[72px] mr-3 mb-2 px-3 py-2 bg-slate-800/50 rounded text-[11px] text-slate-400 leading-relaxed border-l-2 border-red-800/30">
                      {tp.ai_reasoning}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
