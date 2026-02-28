import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, User, RefreshCw } from 'lucide-react';
import { previewUrl } from '../services/api.js';
import ChannelBadge from './ChannelBadge.js';

interface TouchpointData {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content?: Record<string, unknown>;
}

interface Props {
  touchpoint: TouchpointData;
}

// Common Iterable merge tags used in Rapsodo templates
const COMMON_TAGS: Array<{ key: string; label: string; example: string }> = [
  { key: 'firstName', label: 'First Name', example: 'Mike' },
  { key: 'mlm2numSessions', label: 'Sessions', example: '47' },
  { key: 'mlm2shotcount', label: 'Shot Count', example: '312' },
  { key: 'total_training_sessions', label: 'Practice Sessions', example: '28' },
  { key: 'total_course_sessions', label: 'Course Rounds', example: '12' },
  { key: 'sub_status', label: 'Sub Status', example: 'trial' },
  { key: 'MLM2 Latest Subscription Type', label: 'Sub Type', example: 'Premium Annual' },
];

export default function TouchpointPreview({ touchpoint }: Props) {
  const [showSampleData, setShowSampleData] = useState(false);
  const [sampleData, setSampleData] = useState<Record<string, string>>({});

  // Preview refreshes when content object reference changes (explicit Preview/Save from editor)
  const [previewKey, setPreviewKey] = useState(0);
  const contentRef = useRef(touchpoint.content);
  const prevIdRef = useRef(touchpoint.id);

  useEffect(() => {
    // Refresh on touchpoint switch or content update (from Preview/Save click)
    if (prevIdRef.current !== touchpoint.id || contentRef.current !== touchpoint.content) {
      prevIdRef.current = touchpoint.id;
      contentRef.current = touchpoint.content;
      setPreviewKey(k => k + 1);
    }
  }, [touchpoint.id, touchpoint.content]);

  // Detect merge tags in the touchpoint content
  const detectedTags = useMemo(() => {
    if (!touchpoint.content) return [];
    const text = JSON.stringify(touchpoint.content);
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  }, [touchpoint.content]);

  const updateSampleField = (key: string, value: string) => {
    setSampleData(prev => {
      if (value === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const fillDefaults = () => {
    const defaults: Record<string, string> = {};
    for (const tag of detectedTags) {
      const known = COMMON_TAGS.find(t => t.key === tag);
      defaults[tag] = known?.example || 'sample';
    }
    setSampleData(defaults);
  };

  const url = previewUrl(touchpoint.id, Object.keys(sampleData).length > 0 ? sampleData : undefined);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-slate-500">#{touchpoint.sequence}</span>
          <ChannelBadge channel={touchpoint.channel} />
          <span className="text-sm font-semibold text-slate-200">{touchpoint.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {detectedTags.length > 0 && (
            <button
              onClick={() => setShowSampleData(!showSampleData)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                showSampleData ? 'bg-cyan-600/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle sample data for merge tags"
            >
              <User className="w-3 h-3" />
              {detectedTags.length} tags
              {showSampleData ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
          <button
            onClick={() => setPreviewKey(k => k + 1)}
            className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <span className="text-xs text-slate-500">Day {touchpoint.day}</span>
        </div>
      </div>

      {/* Sample data panel */}
      {showSampleData && detectedTags.length > 0 && (
        <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sample User Data</span>
            <button
              onClick={fillDefaults}
              className="text-[10px] text-cyan-500 hover:text-cyan-400"
            >
              Fill defaults
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {detectedTags.map(tag => {
              const known = COMMON_TAGS.find(t => t.key === tag);
              return (
                <div key={tag} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 w-24 truncate flex-shrink-0" title={tag}>
                    {known?.label || tag}
                  </span>
                  <input
                    type="text"
                    value={sampleData[tag] || ''}
                    onChange={e => updateSampleField(tag, e.target.value)}
                    placeholder={known?.example || tag}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-700 placeholder-slate-600"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview iframe */}
      <div className="flex-1 overflow-hidden bg-slate-950">
        <iframe
          key={`${touchpoint.id}-${JSON.stringify(sampleData)}-${previewKey}`}
          src={url}
          className="w-full h-full border-none"
          style={touchpoint.channel === 'email' ? { background: '#f4f4f5' } : undefined}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
