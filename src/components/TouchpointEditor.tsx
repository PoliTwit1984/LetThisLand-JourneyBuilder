import React, { useState, useEffect } from 'react';
import { Wand2, Loader2, Trash2, RotateCcw, Split, ChevronUp, ChevronDown, Target, Eye, Save } from 'lucide-react';
import { refineCopy, regenerateTouchpoint as apiRegenerate, updateTouchpoint as apiUpdateTouchpoint, generateVariants } from '../services/api.js';
import ChannelBadge from './ChannelBadge.js';
import { DEEP_LINKS } from '../../services/rapsodoContext.js';

interface TouchpointData {
  id: string;
  journey_id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  ai_reasoning: string | null;
  content: Record<string, unknown>;
}

interface Props {
  touchpoint: TouchpointData;
  journeyId: string;
  onUpdate: (tp: TouchpointData) => void;
  onDelete: (id: string) => void;
  onMove?: (id: string, direction: 'up' | 'down') => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

// Channel-specific KPI fields
const KPI_FIELDS: Record<string, Array<{ key: string; label: string; suffix: string; placeholder: string }>> = {
  email: [
    { key: 'openRate', label: 'Target Open Rate', suffix: '%', placeholder: '25' },
    { key: 'ctr', label: 'Target CTR', suffix: '%', placeholder: '3' },
  ],
  push: [
    { key: 'tapRate', label: 'Target Tap Rate', suffix: '%', placeholder: '12' },
  ],
  inapp: [
    { key: 'interactionRate', label: 'Target Interaction Rate', suffix: '%', placeholder: '30' },
  ],
};

function KpiEditor({ channel, kpis, onChange }: { channel: string; kpis: Record<string, unknown>; onChange: (kpis: Record<string, unknown>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const fields = KPI_FIELDS[channel] || [];
  const customKpi = (kpis.custom as string) || '';
  const hasValues = fields.some(f => kpis[f.key]) || customKpi;

  return (
    <div className="border-t border-slate-800 pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
          hasValues ? 'text-amber-500' : 'text-slate-500 hover:text-slate-400'
        }`}
      >
        <Target className="w-3 h-3" />
        KPI Targets
        {hasValues && <span className="text-amber-500/60 normal-case font-normal">({fields.filter(f => kpis[f.key]).length + (customKpi ? 1 : 0)} set)</span>}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {fields.map(f => (
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-[10px] text-slate-500 w-32 flex-shrink-0">{f.label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={(kpis[f.key] as number) || ''}
                  onChange={e => onChange({ ...kpis, [f.key]: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={f.placeholder}
                  className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-100 text-right focus:outline-none focus:border-amber-700 placeholder-slate-600"
                />
                <span className="text-[10px] text-slate-500">{f.suffix}</span>
              </div>
            </div>
          ))}
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">Custom KPI</label>
            <input
              type="text"
              value={customKpi}
              onChange={e => onChange({ ...kpis, custom: e.target.value || undefined })}
              placeholder="e.g., 50% feature adoption by day 7"
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:border-amber-700 placeholder-slate-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TouchpointEditor({ touchpoint, journeyId, onUpdate, onDelete, onMove, canMoveUp, canMoveDown }: Props) {
  const [content, setContent] = useState<Record<string, unknown>>(touchpoint.content);
  const [refining, setRefining] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenInput, setShowRegenInput] = useState(false);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [variants, setVariants] = useState<{ field: string; options: string[] } | null>(null);
  const [loadingVariants, setLoadingVariants] = useState<string | null>(null);

  // Reset when touchpoint changes
  useEffect(() => {
    setContent(touchpoint.content);
    setDirty(false);
  }, [touchpoint.id]);

  const updateField = (field: string, value: unknown) => {
    const updated = { ...content, [field]: value };
    setContent(updated);
    setDirty(true);
  };

  // Push current edits to preview (no DB save)
  const handlePreview = () => {
    onUpdate({ ...touchpoint, content });
  };

  // Save to DB, reconcile with server response
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apiUpdateTouchpoint(touchpoint.id, { content });
      const canonical = result.content || content;
      setContent(canonical);
      onUpdate({ ...touchpoint, content: canonical });
      setDirty(false);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  const handleRefine = async (field: string) => {
    const text = content[field] as string;
    if (!text) return;
    setRefining(field);
    try {
      const { refined } = await refineCopy(text, field, touchpoint.channel);
      updateField(field, refined);
    } catch (e) {
      console.error('Refine failed:', e);
    }
    setRefining(null);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await apiRegenerate(touchpoint.id, journeyId, regenInstruction || undefined);
      const updated = {
        ...touchpoint,
        ...(result.channel && { channel: result.channel }),
        ...(result.name && { name: result.name }),
        ...(result.condition !== undefined && { condition: result.condition }),
        ...(result.ai_reasoning !== undefined && { ai_reasoning: result.ai_reasoning }),
        content: result.content || touchpoint.content,
      };
      setContent(updated.content);
      onUpdate(updated);
      setShowRegenInput(false);
      setRegenInstruction('');
    } catch (e) {
      console.error('Regeneration failed:', e);
    }
    setIsRegenerating(false);
  };

  const handleGenerateVariants = async (field: string) => {
    const text = content[field] as string;
    if (!text) return;
    setLoadingVariants(field);
    try {
      const { variants: opts } = await generateVariants(text, field, touchpoint.channel);
      setVariants({ field, options: opts });
    } catch (e) {
      console.error('Variant generation failed:', e);
    }
    setLoadingVariants(null);
  };

  const pickVariant = (field: string, value: string) => {
    updateField(field, value);
    setVariants(null);
  };

  const handleDayChange = (newDay: number) => {
    if (newDay < 0) return;
    const updated = { ...touchpoint, day: newDay };
    onUpdate(updated);
    apiUpdateTouchpoint(touchpoint.id, { day: newDay }).catch(e => console.error('Day update failed:', e));
  };

  const TextField = ({ field, label, rows = 1, maxLen }: { field: string; label: string; rows?: number; maxLen?: number }) => {
    const value = (content[field] as string) || '';
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
          <div className="flex items-center gap-2">
            {maxLen && <span className="text-[10px] text-slate-600">{value.length}/{maxLen}</span>}
            <button
              onClick={() => handleGenerateVariants(field)}
              disabled={loadingVariants === field || !value}
              className="text-slate-600 hover:text-cyan-400 disabled:opacity-30 transition-colors"
              title="Generate A/B variants"
            >
              {loadingVariants === field ? <Loader2 className="w-3 h-3 animate-spin" /> : <Split className="w-3 h-3" />}
            </button>
            <button
              onClick={() => handleRefine(field)}
              disabled={refining === field || !value}
              className="text-slate-600 hover:text-red-500 disabled:opacity-30 transition-colors"
              title="AI refine"
            >
              {refining === field ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
        {rows > 1 ? (
          <textarea
            value={value}
            onChange={e => updateField(field, e.target.value)}
            rows={rows}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-red-700 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => updateField(field, e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-red-700"
          />
        )}
        {/* A/B Variant picker */}
        {variants && variants.field === field && variants.options.length > 0 && (
          <div className="mt-1.5 space-y-1">
            <div className="text-[10px] text-cyan-500 font-semibold">Pick a variant:</div>
            {variants.options.map((v, i) => (
              <button
                key={i}
                onClick={() => pickVariant(field, v)}
                className="w-full text-left px-2.5 py-1.5 rounded border border-slate-700 hover:border-cyan-600 hover:bg-cyan-600/10 text-xs text-slate-300 transition-colors"
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setVariants(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  };

  const BulletEditor = () => {
    const bullets = (content.bullets as string[]) || [];
    return (
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Bullets</label>
        <div className="space-y-1.5">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-red-600 text-sm">&bull;</span>
              <input
                value={b}
                onChange={e => {
                  const newBullets = [...bullets];
                  newBullets[i] = e.target.value;
                  updateField('bullets', newBullets);
                }}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:border-red-700"
              />
              <button
                onClick={() => updateField('bullets', bullets.filter((_, j) => j !== i))}
                className="text-slate-600 hover:text-red-500 p-0.5"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {bullets.length < 3 && (
            <button
              onClick={() => updateField('bullets', [...bullets, ''])}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              + Add bullet
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-bold text-slate-500">#{touchpoint.sequence}</span>
          <ChannelBadge channel={touchpoint.channel} />
          <span className="text-sm font-semibold text-slate-200">{touchpoint.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRegenInput(!showRegenInput)}
            disabled={isRegenerating}
            className="text-slate-600 hover:text-purple-400 p-1 transition-colors disabled:opacity-30"
            title="Regenerate touchpoint"
          >
            {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(touchpoint.id)}
            className="text-slate-600 hover:text-red-500 p-1"
            title="Delete touchpoint"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <span>Day</span>
          <input
            type="number"
            min={0}
            value={touchpoint.day}
            onChange={e => handleDayChange(parseInt(e.target.value) || 0)}
            className="w-10 bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[11px] text-slate-300 text-center focus:outline-none focus:border-red-700"
          />
        </div>
        {onMove && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onMove(touchpoint.id, 'up')}
              disabled={!canMoveUp}
              className="text-slate-600 hover:text-slate-300 disabled:opacity-20 p-0.5"
              title="Move up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMove(touchpoint.id, 'down')}
              disabled={!canMoveDown}
              className="text-slate-600 hover:text-slate-300 disabled:opacity-20 p-0.5"
              title="Move down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {touchpoint.condition && <span>&middot; {touchpoint.condition}</span>}
      </div>

      {/* Regeneration input */}
      {showRegenInput && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-2">
          <textarea
            value={regenInstruction}
            onChange={e => setRegenInstruction(e.target.value)}
            placeholder="Optional: describe what to change (e.g. 'make it more urgent' or 'switch to push')..."
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-700 resize-none placeholder-slate-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button
              onClick={() => { setShowRegenInput(false); setRegenInstruction(''); }}
              className="px-3 py-1.5 rounded text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Channel-specific fields */}
      {touchpoint.channel === 'email' && (
        <div className="space-y-3">
          <TextField field="subject" label="Subject" maxLen={40} />
          <TextField field="preheader" label="Preheader / Context Label" maxLen={70} />
          <TextField field="headline" label="Headline" />
          <TextField field="body" label="Body" rows={5} />
          <BulletEditor />
          <div className="grid grid-cols-2 gap-3">
            <TextField field="primaryCtaText" label="Primary CTA" />
            <TextField field="primaryCtaUrl" label="CTA URL" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField field="secondaryCtaText" label="Secondary CTA" />
            <TextField field="secondaryCtaUrl" label="Secondary URL" />
          </div>
        </div>
      )}

      {touchpoint.channel === 'push' && (
        <div className="space-y-3">
          <TextField field="title" label="Title" maxLen={40} />
          <TextField field="body" label="Body" maxLen={90} rows={2} />
          <TextField field="deepLink" label="Deep Link" />
          <div className="flex flex-wrap gap-1.5">
            {DEEP_LINKS.map(link => (
              <button
                key={link}
                onClick={() => updateField('deepLink', link)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  (content.deepLink as string) === link
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'
                }`}
              >
                {link.replace('rapsodo://', '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {touchpoint.channel === 'inapp' && (
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Message Type</label>
            <select
              value={(content.messageType as string) || 'modal'}
              onChange={e => updateField('messageType', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-red-700"
            >
              <option value="modal">Modal</option>
              <option value="banner">Banner</option>
              <option value="fullscreen">Fullscreen</option>
            </select>
          </div>
          <TextField field="title" label="Title" maxLen={50} />
          <TextField field="body" label="Body" maxLen={150} rows={2} />
          <TextField field="buttonText" label="Button Text" maxLen={20} />
          <TextField field="buttonAction" label="Button Action (deep link or URL)" />
        </div>
      )}

      {/* KPI Targets */}
      <KpiEditor channel={touchpoint.channel} kpis={(content.kpis as Record<string, unknown>) || {}} onChange={kpis => updateField('kpis', kpis)} />

      {/* Preview + Save buttons */}
      {dirty && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 text-xs font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

    </div>
  );
}
