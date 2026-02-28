import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

const LIFECYCLE_STAGES = [
  'Pre-Activation', 'Activated', 'Early Engagement', 'Progressing', 'Loyal', 'At-Risk', 'Churned'
];

const FEATURE_OPTIONS = [
  'Practice Mode', 'Session Review', 'Session Insights', 'Courses Mode',
  'Range Mode', 'Target Mode', 'Rapsodo Combine', 'R-Speed', 'Video Export'
];

interface BriefDefaults {
  audience?: string;
  goal?: string;
  durationWeeks?: number;
  features?: string[];
  lifecycleStage?: string;
  additionalContext?: string;
}

const PRESETS: Record<string, BriefDefaults & { label: string }> = {
  trial45: {
    label: '45-Day Trial Conversion',
    audience: 'MLM2PRO trial users in their first 45 days who registered and claimed their trial but have low feature adoption (fewer than 6 features explored)',
    goal: 'Drive feature adoption through the proven sequence (Practice → Session Review → Insights → Courses → Range → Target) to hit the magic number of 6 features, then convert to paid subscription before trial expiry',
    durationWeeks: 6,
    features: ['Practice Mode', 'Session Review', 'Session Insights', 'Courses Mode', 'Range Mode', 'Target Mode'],
    lifecycleStage: 'Early Engagement',
    additionalContext: 'This replaces the existing time-based drip journey (8 steps, no behavioral branching). Key gaps to fix: no Session Review nudges (the #1 conversion predictor), no InApp messages, no engagement-tier segmentation, modes introduced too early in old journey. Push open rates on existing journey are 3-7% so use push sparingly — InApp is our primary discovery channel. Email open rates are strong (52-65%). Include behavioral branching based on session activity and feature exploration depth.',
  },
  reengagement: {
    label: 'At-Risk Re-Engagement',
    audience: 'Paid MLM2PRO subscribers who haven\'t opened the app in 14+ days but have an active subscription',
    goal: 'Bring lapsed users back to the app by reminding them of features they haven\'t tried and progress they\'ve made, preventing churn before renewal',
    durationWeeks: 3,
    features: ['Session Insights', 'Courses Mode', 'Range Mode', 'Rapsodo Combine'],
    lifecycleStage: 'At-Risk',
    additionalContext: 'Focus on what they\'re missing — new features, stats they haven\'t seen, courses they haven\'t played. Use personalized data hooks (shot count, sessions, favorite mode). Don\'t guilt-trip about inactivity — frame as excitement about what\'s waiting for them.',
  },
  onboarding: {
    label: 'Day 0-7 Onboarding',
    audience: 'Brand new MLM2PRO owners who just completed registration and are setting up their device for the first time',
    goal: 'Get users from unboxing to their first successful practice session with data review — establish the core habit loop of shoot → review → improve',
    durationWeeks: 1,
    features: ['Practice Mode', 'Session Review', 'Video Export'],
    lifecycleStage: 'Pre-Activation',
    additionalContext: 'Critical first 7 days. Users need to: (1) complete device setup and calibration, (2) hit their first shots in Practice mode, (3) review their session data, (4) understand what the 15 metrics mean. Common drop-off: device connection issues and not understanding what to do after first session. Include club bag configuration prompt. Quick Connect guide link is essential.',
  },
};

interface Props {
  onGenerate: (brief: {
    audience: string; goal: string; durationWeeks: number;
    featureFocus?: string; lifecycleStage?: string; additionalContext?: string;
  }) => void;
  isGenerating: boolean;
}

export default function BriefForm({ onGenerate, isGenerating }: Props) {
  const defaultPreset = PRESETS.trial45;
  const [audience, setAudience] = useState(defaultPreset.audience || '');
  const [goal, setGoal] = useState(defaultPreset.goal || '');
  const [durationWeeks, setDurationWeeks] = useState(defaultPreset.durationWeeks || 4);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(defaultPreset.features || []);
  const [lifecycleStage, setLifecycleStage] = useState(defaultPreset.lifecycleStage || '');
  const [additionalContext, setAdditionalContext] = useState(defaultPreset.additionalContext || '');

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (!p) return;
    setAudience(p.audience || '');
    setGoal(p.goal || '');
    setDurationWeeks(p.durationWeeks || 4);
    setSelectedFeatures(p.features || []);
    setLifecycleStage(p.lifecycleStage || '');
    setAdditionalContext(p.additionalContext || '');
  };

  const toggleFeature = (f: string) => {
    setSelectedFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audience.trim() || !goal.trim()) return;
    onGenerate({
      audience: audience.trim(),
      goal: goal.trim(),
      durationWeeks,
      featureFocus: selectedFeatures.length > 0 ? selectedFeatures.join(', ') : undefined,
      lifecycleStage: lifecycleStage || undefined,
      additionalContext: additionalContext.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      {/* Preset buttons */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Quick Start</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Audience</label>
        <textarea
          value={audience}
          onChange={e => setAudience(e.target.value)}
          placeholder="e.g., Trial users in their first 14 days who have registered but haven't completed a session"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-600 resize-none"
          rows={2}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Goal</label>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="e.g., Drive feature adoption — get users to explore Practice, Session Review, and Courses"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-600 resize-none"
          rows={2}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Duration</label>
          <select
            value={durationWeeks}
            onChange={e => setDurationWeeks(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-600"
          >
            {[1,2,3,4,5,6,7,8].map(w => (
              <option key={w} value={w}>{w} week{w > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Lifecycle Stage</label>
          <select
            value={lifecycleStage}
            onChange={e => setLifecycleStage(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-600"
          >
            <option value="">Any / Not specified</option>
            {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Feature Focus</label>
        <div className="flex flex-wrap gap-2">
          {FEATURE_OPTIONS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFeature(f)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                selectedFeatures.includes(f)
                  ? 'bg-red-900/50 border-red-700 text-red-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Additional Context <span className="text-slate-600">(optional)</span></label>
        <textarea
          value={additionalContext}
          onChange={e => setAdditionalContext(e.target.value)}
          placeholder="Any extra instructions — tone, specific scenarios, things to avoid..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-600 resize-none"
          rows={3}
        />
      </div>

      <button
        type="submit"
        disabled={isGenerating || !audience.trim() || !goal.trim()}
        className="w-full bg-red-700 hover:bg-red-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Journey...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Journey
          </>
        )}
      </button>

      {isGenerating && (
        <p className="text-xs text-slate-500 text-center">
          Claude is designing your journey — this takes 15-30 seconds
        </p>
      )}
    </form>
  );
}
