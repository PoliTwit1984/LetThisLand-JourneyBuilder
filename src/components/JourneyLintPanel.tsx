import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronDown, ChevronRight, Wrench, Loader2 } from 'lucide-react';
import type { LintResult, LintIssue } from '../services/journeyLint.js';

interface Props {
  result: LintResult;
  onSelectTouchpoint: (id: string) => void;
  onFix: (issue: LintIssue) => Promise<void>;
  onFixAll: () => Promise<void>;
}

const severityIcon = (s: LintIssue['severity']) => {
  if (s === 'error') return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
  if (s === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
};

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
  if (score >= 50) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
  return 'text-red-400 bg-red-500/15 border-red-500/30';
};

export default function JourneyLintPanel({ result, onSelectTouchpoint, onFix, onFixAll }: Props) {
  const [showPassed, setShowPassed] = useState(false);
  const [fixingIndex, setFixingIndex] = useState<number | null>(null);
  const [fixingAll, setFixingAll] = useState(false);

  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');
  const infos = result.issues.filter(i => i.severity === 'info');
  const allIssues = [...errors, ...warnings, ...infos];

  const handleFix = async (issue: LintIssue, index: number) => {
    setFixingIndex(index);
    try {
      await onFix(issue);
    } catch (e) {
      console.error('Fix failed:', e);
    }
    setFixingIndex(null);
  };

  // Fix All delegates to parent which re-lints fresh between each fix
  const handleFixAll = async () => {
    setFixingAll(true);
    try {
      await onFixAll();
    } catch (e) {
      console.error('Fix all failed:', e);
    }
    setFixingAll(false);
  };

  const autoFixCount = allIssues.filter(i => i.fixType === 'auto').length;
  const fixableCount = allIssues.filter(i => i.fixType).length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header with score */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">Journey Lint</h3>
          <div className={`px-3 py-1 rounded-full border text-sm font-bold ${scoreColor(result.score)}`}>
            {result.score}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex gap-3 text-[10px] text-slate-500">
            {errors.length > 0 && <span className="text-red-400">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span className="text-amber-400">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>}
            {infos.length > 0 && <span className="text-blue-400">{infos.length} info</span>}
            {result.issues.length === 0 && <span className="text-emerald-400">All checks passed</span>}
          </div>
          {autoFixCount > 0 && (
            <button
              onClick={handleFixAll}
              disabled={fixingIndex !== null || fixingAll}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors disabled:opacity-50"
            >
              {fixingAll ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wrench className="w-2.5 h-2.5" />}
              {fixingAll ? 'Fixing...' : `Fix all (${autoFixCount})`}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-1">
        {/* Issues grouped by severity */}
        {allIssues.map((issue, i) => (
          <div
            key={i}
            className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 group"
          >
            {severityIcon(issue.severity)}
            <button
              onClick={() => issue.touchpointId && onSelectTouchpoint(issue.touchpointId)}
              disabled={!issue.touchpointId}
              className={`flex-1 text-left text-xs text-slate-300 leading-relaxed ${
                issue.touchpointId ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              {issue.message}
            </button>
            {issue.fixType && (
              <button
                onClick={() => handleFix(issue, i)}
                disabled={fixingIndex !== null}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex-shrink-0 ${
                  issue.fixType === 'auto'
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
                    : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-400'
                } disabled:opacity-50`}
                title={issue.fixType === 'auto' ? 'Auto-fix' : 'AI fix (uses Claude)'}
              >
                {fixingIndex === i ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Wrench className="w-2.5 h-2.5" />
                )}
                {issue.fixType === 'ai' ? 'AI Fix' : 'Fix'}
              </button>
            )}
          </div>
        ))}

        {/* Passed checks */}
        {result.passed.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowPassed(!showPassed)}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-400"
            >
              {showPassed ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {result.passed.length} passed checks
            </button>
            {showPassed && (
              <div className="mt-2 space-y-1">
                {result.passed.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/50 flex-shrink-0" />
                    <span className="text-[11px] text-slate-500">{check.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
