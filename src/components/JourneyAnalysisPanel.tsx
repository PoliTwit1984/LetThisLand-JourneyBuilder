import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronRight, Target, Zap, Clock, FileText, Layers, ArrowUpRight, Loader2, MessageCircle } from 'lucide-react';

interface AnalysisItem {
  touchpointId?: number;
  detail: string;
  severity?: 'critical' | 'warning' | 'info';
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  touchpointIds?: number[];
}

interface JourneyAnalysis {
  overallScore: number;
  overallAssessment: string;
  goalAlignment: { score: number; assessment: string; gaps: string[] };
  strengths: string[];
  issues: AnalysisItem[];
  criticalProblems: AnalysisItem[];
  channelStrategy: { score: number; assessment: string; findings: AnalysisItem[] };
  cadenceTiming: { score: number; assessment: string; findings: AnalysisItem[] };
  copyQuality: { score: number; assessment: string; findings: AnalysisItem[] };
  featureProgression: { score: number; assessment: string; findings: AnalysisItem[] };
  recommendations: Recommendation[];
}

interface FixRequest {
  touchpointSequence: number;
  analysisDetail: string;
  userComment: string;
}

interface Props {
  analysis: JourneyAnalysis;
  onSelectTouchpoint: (sequence: number) => void;
  onFix: (request: FixRequest) => Promise<void>;
  onOpenChat: (touchpointSequences: number[], detail: string) => void;
  fixingTouchpointId?: number | null;
}

const scoreColor = (score: number) =>
  score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

const scoreBg = (score: number) =>
  score >= 80 ? 'bg-emerald-500/20' : score >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20';

const severityIcon = (severity?: string) => {
  switch (severity) {
    case 'critical': return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />;
    case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />;
    default: return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />;
  }
};

const priorityBadge = (priority: string) => {
  const colors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-blue-500/20 text-blue-400',
  };
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${colors[priority as keyof typeof colors] || colors.low}`}>
      {priority}
    </span>
  );
};

function TpLink({ id, onClick }: { id?: number; onClick: (seq: number) => void; key?: React.Key }) {
  if (!id) return null;
  return (
    <button
      onClick={() => onClick(id)}
      className="text-[10px] text-cyan-500 hover:text-cyan-300 font-mono ml-1 flex-shrink-0"
      title={`Go to touchpoint #${id}`}
    >
      #{id}
    </button>
  );
}

function FixActions({ touchpointId, detail, onFix, onChat, isFixing }: {
  touchpointId: number;
  detail: string;
  onFix: (request: FixRequest) => Promise<void>;
  onChat: (touchpointSequences: number[], detail: string) => void;
  isFixing: boolean;
}) {
  if (isFixing) {
    return (
      <div className="flex items-center gap-1 ml-auto flex-shrink-0">
        <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
        <span className="text-[9px] text-cyan-400">Fixing...</span>
      </div>
    );
  }

  return (
    <div className="ml-auto flex-shrink-0 flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onFix({ touchpointSequence: touchpointId, analysisDetail: detail, userComment: '' }); }}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[9px] font-semibold transition-colors"
        title="One-click AI fix"
      >
        <Zap className="w-2.5 h-2.5" />
        Fix
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onChat([touchpointId], detail); }}
        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[9px] font-semibold transition-colors"
        title="Chat with Claude about this issue"
      >
        <MessageCircle className="w-2.5 h-2.5" />
        Chat
      </button>
    </div>
  );
}

function Section({ title, icon, count, defaultOpen, children }: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-slate-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/30 transition-colors"
      >
        {icon}
        <span className="text-[11px] font-semibold text-slate-300 flex-1 text-left">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] text-slate-500">{count}</span>
        )}
        {open ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function DimensionSection({ title, icon, score, assessment, findings, onSelect, onFix, onChat, fixingTouchpointId }: {
  title: string;
  icon: React.ReactNode;
  score: number;
  assessment: string;
  findings: AnalysisItem[];
  onSelect: (seq: number) => void;
  onFix: (request: FixRequest) => Promise<void>;
  onChat: (touchpointSequences: number[], detail: string) => void;
  fixingTouchpointId?: number | null;
}) {
  return (
    <Section
      title={title}
      icon={icon}
      count={findings.length}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-lg font-bold ${scoreColor(score)}`}>{score}</span>
          <div className={`flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden`}>
            <div className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{assessment}</p>
        {findings.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {findings.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {severityIcon(f.severity)}
                <span className="text-[11px] text-slate-300 leading-relaxed flex-1">{f.detail}</span>
                <TpLink id={f.touchpointId} onClick={onSelect} />
                {f.touchpointId && (
                  <FixActions
                    touchpointId={f.touchpointId}
                    detail={f.detail}
                    onFix={onFix}
                    onChat={onChat}
                    isFixing={fixingTouchpointId === f.touchpointId}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

export default function JourneyAnalysisPanel({ analysis, onSelectTouchpoint, onFix, onOpenChat, fixingTouchpointId }: Props) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky header with overall score */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${scoreBg(analysis.overallScore)}`}>
            <span className={`text-xl font-bold ${scoreColor(analysis.overallScore)}`}>{analysis.overallScore}</span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Journey Score</div>
            <div className={`text-xs font-semibold ${scoreColor(analysis.overallScore)}`}>
              {analysis.overallScore >= 80 ? 'Strong' : analysis.overallScore >= 50 ? 'Needs Work' : 'Major Issues'}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">{analysis.overallAssessment}</p>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Critical Problems — the ugly */}
        {analysis.criticalProblems.length > 0 && (
          <Section
            title="Critical Problems"
            icon={<AlertCircle className="w-3.5 h-3.5 text-red-400" />}
            count={analysis.criticalProblems.length}
            defaultOpen
          >
            <div className="space-y-2">
              {analysis.criticalProblems.map((p, i) => (
                <div key={i} className="bg-red-500/5 rounded px-2 py-1.5">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-red-200 leading-relaxed flex-1">{p.detail}</span>
                    <TpLink id={p.touchpointId} onClick={onSelectTouchpoint} />
                    {p.touchpointId && (
                      <FixActions
                        touchpointId={p.touchpointId}
                        detail={p.detail}
                        onFix={onFix}
                        onChat={onOpenChat}
                        isFixing={fixingTouchpointId === p.touchpointId}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Issues — the bad */}
        {analysis.issues.length > 0 && (
          <Section
            title="Issues"
            icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
            count={analysis.issues.length}
            defaultOpen={analysis.criticalProblems.length === 0}
          >
            <div className="space-y-1.5">
              {analysis.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  {severityIcon(issue.severity)}
                  <span className="text-[11px] text-slate-300 leading-relaxed flex-1">{issue.detail}</span>
                  <TpLink id={issue.touchpointId} onClick={onSelectTouchpoint} />
                  {issue.touchpointId && (
                    <FixActions
                      touchpointId={issue.touchpointId}
                      detail={issue.detail}
                      onFix={onFix}
                      onChat={onOpenChat}
                      isFixing={fixingTouchpointId === issue.touchpointId}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Strengths — the good */}
        {analysis.strengths.length > 0 && (
          <Section
            title="Strengths"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            count={analysis.strengths.length}
          >
            <div className="space-y-1.5">
              {analysis.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] text-emerald-200/80 leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Goal Alignment */}
        <DimensionSection
          title="Goal Alignment"
          icon={<Target className="w-3.5 h-3.5 text-purple-400" />}
          score={analysis.goalAlignment.score}
          assessment={analysis.goalAlignment.assessment}
          findings={analysis.goalAlignment.gaps.map(g => ({ detail: g, severity: 'warning' as const }))}
          onSelect={onSelectTouchpoint}
          onFix={onFix}
          onChat={onOpenChat}
          fixingTouchpointId={fixingTouchpointId}
        />

        {/* Channel Strategy */}
        <DimensionSection
          title="Channel Strategy"
          icon={<Layers className="w-3.5 h-3.5 text-blue-400" />}
          score={analysis.channelStrategy.score}
          assessment={analysis.channelStrategy.assessment}
          findings={analysis.channelStrategy.findings}
          onSelect={onSelectTouchpoint}
          onFix={onFix}
          onChat={onOpenChat}
          fixingTouchpointId={fixingTouchpointId}
        />

        {/* Cadence & Timing */}
        <DimensionSection
          title="Cadence & Timing"
          icon={<Clock className="w-3.5 h-3.5 text-orange-400" />}
          score={analysis.cadenceTiming.score}
          assessment={analysis.cadenceTiming.assessment}
          findings={analysis.cadenceTiming.findings}
          onSelect={onSelectTouchpoint}
          onFix={onFix}
          onChat={onOpenChat}
          fixingTouchpointId={fixingTouchpointId}
        />

        {/* Copy Quality */}
        <DimensionSection
          title="Copy Quality"
          icon={<FileText className="w-3.5 h-3.5 text-teal-400" />}
          score={analysis.copyQuality.score}
          assessment={analysis.copyQuality.assessment}
          findings={analysis.copyQuality.findings}
          onSelect={onSelectTouchpoint}
          onFix={onFix}
          onChat={onOpenChat}
          fixingTouchpointId={fixingTouchpointId}
        />

        {/* Feature Progression */}
        <DimensionSection
          title="Feature Progression"
          icon={<Zap className="w-3.5 h-3.5 text-yellow-400" />}
          score={analysis.featureProgression.score}
          assessment={analysis.featureProgression.assessment}
          findings={analysis.featureProgression.findings}
          onSelect={onSelectTouchpoint}
          onFix={onFix}
          onChat={onOpenChat}
          fixingTouchpointId={fixingTouchpointId}
        />

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <Section
            title="Recommendations"
            icon={<ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />}
            count={analysis.recommendations.length}
            defaultOpen
          >
            <div className="space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <div key={i} className="bg-slate-800/50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    {priorityBadge(rec.priority)}
                    <span className="text-[11px] font-semibold text-slate-200 flex-1">{rec.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{rec.detail}</p>
                  {rec.touchpointIds && rec.touchpointIds.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1 mt-1.5">
                      <span className="text-[10px] text-slate-500">Affects:</span>
                      {rec.touchpointIds.map(id => (
                        <TpLink key={id} id={id} onClick={onSelectTouchpoint} />
                      ))}
                      {rec.touchpointIds.length === 1 && (
                        <FixActions
                          touchpointId={rec.touchpointIds[0]}
                          detail={`${rec.title}: ${rec.detail}`}
                          onFix={onFix}
                          onChat={onOpenChat}
                          isFixing={fixingTouchpointId === rec.touchpointIds[0]}
                        />
                      )}
                      {rec.touchpointIds.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenChat(rec.touchpointIds!, `${rec.title}: ${rec.detail}`); }}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[9px] font-semibold transition-colors"
                          title="Chat with Claude about all affected touchpoints"
                        >
                          <MessageCircle className="w-2.5 h-2.5" />
                          Chat
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
