import React from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';

interface JourneySummary {
  id: string;
  name: string;
  audience: string;
  goal: string;
  touchpoint_count: number;
  status: string;
  created_at: string;
}

interface Props {
  journeys: JourneySummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClone: (id: string) => void;
}

export default function JourneyList({ journeys, selectedId, onSelect, onNew, onDelete, onClone }: Props) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Journeys</span>
        <button
          onClick={onNew}
          className="text-slate-500 hover:text-red-500 p-1 transition-colors"
          title="New journey"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {journeys.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-600">
            No journeys yet. Create your first one.
          </div>
        ) : (
          journeys.map(j => (
            <div
              key={j.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(j.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(j.id); } }}
              className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-colors group cursor-pointer ${
                selectedId === j.id ? 'bg-slate-800' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 truncate">{j.name}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onClone(j.id); }}
                    className="text-slate-700 hover:text-blue-400 p-0.5"
                    title="Clone journey"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(j.id); }}
                    className="text-slate-700 hover:text-red-500 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {j.touchpoint_count} touchpoints &middot; {j.audience}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
