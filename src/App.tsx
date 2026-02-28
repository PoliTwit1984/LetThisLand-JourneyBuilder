import React, { useState, useEffect, useMemo } from 'react';
import { Mail, FileText, Download, FolderDown, ShieldCheck, LayoutGrid, List, TableProperties, Sparkles, Loader2 } from 'lucide-react';
import Header from './components/Header.js';
import BriefForm from './components/BriefForm.js';
import JourneyTimeline from './components/JourneyTimeline.js';
import JourneyCanvas from './components/JourneyCanvas.js';
import JourneyLintPanel from './components/JourneyLintPanel.js';
import TouchpointEditor from './components/TouchpointEditor.js';
import TouchpointPreview from './components/TouchpointPreview.js';
import JourneyList from './components/JourneyList.js';
import CopyTableModal from './components/CopyTableModal.js';
import JourneyAnalysisPanel from './components/JourneyAnalysisPanel.js';
import FixChatModal from './components/FixChatModal.js';
import { lintJourney, applyAutoFix } from './services/journeyLint.js';
import type { LintIssue } from './services/journeyLint.js';
import { listJourneys, getJourney, generateJourney, deleteJourney as apiDeleteJourney, deleteTouchpoint as apiDeleteTouchpoint, cloneJourney as apiCloneJourney, reorderTouchpoints, refineCopy, regenerateTouchpoint as apiRegenerateTouchpoint, updateTouchpoint as apiUpdateTouchpoint, analyzeJourney as apiAnalyzeJourney, wiringGuideUrl, exportUrl, exportZipUrl } from './services/api.js';

type View = 'brief' | 'journey';
type RightView = 'canvas' | 'list';

interface JourneySummary {
  id: string; name: string; audience: string; goal: string;
  touchpoint_count: number; status: string; created_at: string;
}

interface TouchpointData {
  id: string; journey_id: string; sequence: number; day: number;
  channel: string; name: string; condition: string | null;
  ai_reasoning: string | null; content: Record<string, unknown>;
}

interface JourneyData {
  id: string; name: string; brief: string; audience: string; goal: string;
  duration_weeks: number; feature_focus: string | null; lifecycle_stage: string | null;
  touchpoint_count: number; status: string; touchpoints: TouchpointData[];
}

export default function App() {
  const [view, setView] = useState<View>('brief');
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [currentJourney, setCurrentJourney] = useState<JourneyData | null>(null);
  const [selectedTpId, setSelectedTpId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rightView, setRightView] = useState<RightView>('canvas');
  const [showLint, setShowLint] = useState(false);
  const [showCopyTable, setShowCopyTable] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, unknown> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fixingSequence, setFixingSequence] = useState<number | null>(null);
  const [chatContext, setChatContext] = useState<{ touchpointSequences: number[]; analysisDetail: string } | null>(null);

  // Lint result (recomputes when touchpoints change)
  const lintResult = useMemo(() => {
    if (!currentJourney) return null;
    return lintJourney(currentJourney.touchpoints);
  }, [currentJourney?.touchpoints]);

  // Load journeys on mount
  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      const data = await listJourneys();
      setJourneys(data);
    } catch (e) {
      console.error('Failed to load journeys:', e);
    }
  };

  const loadJourney = async (id: string) => {
    try {
      const data = await getJourney(id);
      setCurrentJourney(data);
      setView('journey');
      if (data.touchpoints.length > 0) {
        setSelectedTpId(data.touchpoints[0].id);
      }
    } catch (e) {
      console.error('Failed to load journey:', e);
    }
  };

  const handleGenerate = async (brief: {
    audience: string; goal: string; durationWeeks: number;
    featureFocus?: string; lifecycleStage?: string; additionalContext?: string;
  }) => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateJourney(brief);
      setCurrentJourney(data);
      setView('journey');
      if (data.touchpoints.length > 0) {
        setSelectedTpId(data.touchpoints[0].id);
      }
      await loadJourneys();
    } catch (e) {
      setError((e as Error).message);
    }
    setIsGenerating(false);
  };

  const handleDeleteJourney = async (id: string) => {
    try {
      await apiDeleteJourney(id);
      if (currentJourney?.id === id) {
        setCurrentJourney(null);
        setSelectedTpId(null);
        setView('brief');
      }
      await loadJourneys();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleCloneJourney = async (id: string) => {
    try {
      const cloned = await apiCloneJourney(id);
      await loadJourneys();
      setCurrentJourney(cloned);
      setView('journey');
      if (cloned.touchpoints.length > 0) {
        setSelectedTpId(cloned.touchpoints[0].id);
      }
    } catch (e) {
      console.error('Failed to clone:', e);
    }
  };

  const handleDeleteTouchpoint = async (id: string) => {
    try {
      await apiDeleteTouchpoint(id);
      if (currentJourney) {
        const updated = {
          ...currentJourney,
          touchpoints: currentJourney.touchpoints.filter(tp => tp.id !== id),
          touchpoint_count: currentJourney.touchpoint_count - 1,
        };
        setCurrentJourney(updated);
        if (selectedTpId === id) {
          setSelectedTpId(updated.touchpoints[0]?.id || null);
        }
      }
    } catch (e) {
      console.error('Failed to delete touchpoint:', e);
    }
  };

  const handleUpdateTouchpoint = (updated: TouchpointData) => {
    if (!currentJourney) return;
    setCurrentJourney({
      ...currentJourney,
      touchpoints: currentJourney.touchpoints.map(tp => tp.id === updated.id ? updated : tp),
    });
  };

  const handleMoveTouchpoint = async (id: string, direction: 'up' | 'down') => {
    if (!currentJourney) return;
    const sorted = [...currentJourney.touchpoints].sort((a, b) => a.sequence - b.sequence);
    const idx = sorted.findIndex(tp => tp.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    // Swap sequences
    const items = sorted.map((tp, i) => {
      if (i === idx) return { id: tp.id, sequence: sorted[swapIdx].sequence, day: tp.day };
      if (i === swapIdx) return { id: tp.id, sequence: sorted[idx].sequence, day: tp.day };
      return { id: tp.id, sequence: tp.sequence, day: tp.day };
    });

    // Optimistic update
    const newTouchpoints = currentJourney.touchpoints.map(tp => {
      const item = items.find(i => i.id === tp.id);
      return item ? { ...tp, sequence: item.sequence } : tp;
    });
    setCurrentJourney({ ...currentJourney, touchpoints: newTouchpoints });

    try {
      await reorderTouchpoints(items);
    } catch (e) {
      console.error('Reorder failed:', e);
    }
  };

  const handleLintFix = async (issue: LintIssue) => {
    if (!currentJourney) return;

    // Auto-fixes: apply locally + persist
    if (issue.fixType === 'auto') {
      const fixed = applyAutoFix(currentJourney.touchpoints, issue);
      if (!fixed) return;

      // Persist changed touchpoints
      const changed = fixed.filter(tp => {
        const orig = currentJourney.touchpoints.find(o => o.id === tp.id);
        if (!orig) return false;
        return tp.day !== orig.day || JSON.stringify(tp.content) !== JSON.stringify(orig.content);
      });

      // Optimistic update
      setCurrentJourney({ ...currentJourney, touchpoints: fixed });

      // Persist each change
      for (const tp of changed) {
        const orig = currentJourney.touchpoints.find(o => o.id === tp.id)!;
        if (tp.day !== orig.day) {
          await apiUpdateTouchpoint(tp.id, { day: tp.day });
        }
        if (JSON.stringify(tp.content) !== JSON.stringify(orig.content)) {
          await apiUpdateTouchpoint(tp.id, { content: tp.content });
        }
      }
      return;
    }

    // AI fixes
    if (issue.fixType === 'ai' && issue.touchpointId && issue.fixDetail) {
      const tp = currentJourney.touchpoints.find(t => t.id === issue.touchpointId);
      if (!tp) return;

      // Copy limit fix: refine the specific field to be shorter
      if (issue.rule === 'copy-limit') {
        const { field, channel, maxLen } = issue.fixDetail as { field: string; channel: string; maxLen: number };
        const text = tp.content[field] as string;
        if (!text) return;
        const { refined } = await refineCopy(text, field, channel);
        const updatedContent = { ...tp.content, [field]: refined };
        const updatedTp = { ...tp, content: updatedContent };
        setCurrentJourney({
          ...currentJourney,
          touchpoints: currentJourney.touchpoints.map(t => t.id === tp.id ? updatedTp : t),
        });
        await apiUpdateTouchpoint(tp.id, { content: updatedContent });
        return;
      }

      // Channel fix (first-email / last-email): regenerate as email
      if (issue.rule === 'first-email' || issue.rule === 'last-email') {
        const instruction = issue.fixDetail.instruction as string;
        const result = await apiRegenerateTouchpoint(tp.id, currentJourney.id, instruction);
        const updatedTp = {
          ...tp,
          ...(result.channel && { channel: result.channel }),
          ...(result.name && { name: result.name }),
          ...(result.condition !== undefined && { condition: result.condition }),
          ...(result.ai_reasoning !== undefined && { ai_reasoning: result.ai_reasoning }),
          content: result.content || tp.content,
        };
        setCurrentJourney({
          ...currentJourney,
          touchpoints: currentJourney.touchpoints.map(t => t.id === tp.id ? updatedTp : t),
        });
        return;
      }
    }
  };

  // Fix All: iterative loop that re-lints fresh between each fix
  const handleLintFixAll = async () => {
    if (!currentJourney) return;
    let tps = [...currentJourney.touchpoints];
    let maxIterations = 50; // safety cap
    while (maxIterations-- > 0) {
      const result = lintJourney(tps);
      const autoIssue = result.issues.find(i => i.fixType === 'auto');
      if (!autoIssue) break;
      const fixed = applyAutoFix(tps, autoIssue);
      if (!fixed) break;
      tps = fixed;
    }

    // Find all changed touchpoints and persist
    const changed = tps.filter(tp => {
      const orig = currentJourney.touchpoints.find(o => o.id === tp.id);
      if (!orig) return false;
      return tp.day !== orig.day || JSON.stringify(tp.content) !== JSON.stringify(orig.content);
    });

    setCurrentJourney({ ...currentJourney, touchpoints: tps });

    for (const tp of changed) {
      const orig = currentJourney.touchpoints.find(o => o.id === tp.id)!;
      if (tp.day !== orig.day) {
        await apiUpdateTouchpoint(tp.id, { day: tp.day });
      }
      if (JSON.stringify(tp.content) !== JSON.stringify(orig.content)) {
        await apiUpdateTouchpoint(tp.id, { content: tp.content });
      }
    }
  };

  const handleAnalyze = async () => {
    if (!currentJourney) return;
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setShowLint(false);
    setAnalysisResult(null);
    try {
      const result = await apiAnalyzeJourney(currentJourney.id);
      setAnalysisResult(result);
    } catch (e) {
      console.error('Analysis failed:', e);
      setAnalysisResult(null);
    }
    setIsAnalyzing(false);
  };

  const handleAnalysisFix = async (request: { touchpointSequence: number; analysisDetail: string; userComment: string }) => {
    if (!currentJourney) return;
    const tp = currentJourney.touchpoints.find(t => t.sequence === request.touchpointSequence);
    if (!tp) return;

    setFixingSequence(request.touchpointSequence);
    try {
      const instruction = `Analysis finding: ${request.analysisDetail}${request.userComment ? `\n\nUser instruction: ${request.userComment}` : ''}\n\nFix this touchpoint to address the above issue while maintaining the journey's overall goals and brand voice.`;
      const result = await apiRegenerateTouchpoint(tp.id, currentJourney.id, instruction);
      const updatedTp = {
        ...tp,
        ...(result.channel && { channel: result.channel }),
        ...(result.name && { name: result.name }),
        ...(result.condition !== undefined && { condition: result.condition }),
        ...(result.ai_reasoning !== undefined && { ai_reasoning: result.ai_reasoning }),
        content: result.content || tp.content,
      };
      setCurrentJourney({
        ...currentJourney,
        touchpoints: currentJourney.touchpoints.map(t => t.id === tp.id ? updatedTp : t),
      });
      // Select the fixed touchpoint so user can see the change
      setSelectedTpId(tp.id);
    } catch (e) {
      console.error('Analysis fix failed:', e);
    }
    setFixingSequence(null);
  };

  const handleOpenChat = (touchpointSequences: number[], detail: string) => {
    setChatContext({ touchpointSequences, analysisDetail: detail });
  };

  const handleChatApplyFix = async (touchpointSequence: number, instruction: string) => {
    if (!currentJourney) return;
    const tp = currentJourney.touchpoints.find(t => t.sequence === touchpointSequence);
    if (!tp) return;

    const fullInstruction = `Based on chat discussion, apply this fix:\n\n${instruction}\n\nFix this touchpoint to address the above while maintaining the journey's overall goals and brand voice.`;
    const result = await apiRegenerateTouchpoint(tp.id, currentJourney.id, fullInstruction);
    const updatedTp = {
      ...tp,
      ...(result.channel && { channel: result.channel }),
      ...(result.name && { name: result.name }),
      ...(result.condition !== undefined && { condition: result.condition }),
      ...(result.ai_reasoning !== undefined && { ai_reasoning: result.ai_reasoning }),
      content: result.content || tp.content,
    };
    setCurrentJourney({
      ...currentJourney,
      touchpoints: currentJourney.touchpoints.map(t => t.id === tp.id ? updatedTp : t),
    });
    setSelectedTpId(tp.id);
  };

  const selectedTp = currentJourney?.touchpoints.find(tp => tp.id === selectedTpId) || null;
  const sortedTouchpoints = currentJourney?.touchpoints ? [...currentJourney.touchpoints].sort((a, b) => a.sequence - b.sequence) : [];
  const selectedIdx = selectedTp ? sortedTouchpoints.findIndex(tp => tp.id === selectedTp.id) : -1;

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — journey list */}
        <div className="w-56 bg-slate-900 border-r border-slate-800 flex-shrink-0">
          <JourneyList
            journeys={journeys}
            selectedId={currentJourney?.id || null}
            onSelect={loadJourney}
            onNew={() => { setView('brief'); setCurrentJourney(null); setSelectedTpId(null); }}
            onDelete={handleDeleteJourney}
            onClone={handleCloneJourney}
          />
        </div>

        {/* Left panel — brief form or touchpoint editor */}
        <div className="w-[400px] bg-slate-900/50 border-r border-slate-800 flex-shrink-0 overflow-hidden flex flex-col">
          {view === 'brief' ? (
            <>
              <div className="px-5 py-3 border-b border-slate-800">
                <h2 className="text-sm font-bold text-slate-200">New Journey Brief</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Describe who, what, and why — AI builds the rest</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <BriefForm onGenerate={handleGenerate} isGenerating={isGenerating} />
                {error && (
                  <div className="mx-5 mb-4 px-3 py-2 bg-red-950/50 border border-red-900 rounded text-xs text-red-400">
                    {error}
                  </div>
                )}
              </div>
            </>
          ) : currentJourney ? (
            <>
              {/* Journey action bar */}
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 flex-shrink-0 flex-wrap">
                <a
                  href={wiringGuideUrl(currentJourney.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Wiring Guide
                </a>
                <a
                  href={exportUrl(currentJourney.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </a>
                <a
                  href={exportZipUrl(currentJourney.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-semibold transition-colors"
                >
                  <FolderDown className="w-3.5 h-3.5" />
                  ZIP
                </a>
                <button
                  onClick={() => setShowCopyTable(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 text-xs font-semibold transition-colors"
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  Copy Table
                </button>
                <button
                  onClick={() => { setShowLint(!showLint); if (!showLint) setShowAnalysis(false); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                    showLint
                      ? 'bg-purple-600/30 text-purple-300'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Lint
                  {lintResult && (
                    <span className={`ml-1 text-[10px] font-bold ${
                      lintResult.score >= 80 ? 'text-emerald-400' : lintResult.score >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {lintResult.score}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                    showAnalysis
                      ? 'bg-cyan-600/30 text-cyan-300'
                      : 'bg-slate-700/30 hover:bg-slate-700/50 text-slate-400'
                  } ${isAnalyzing ? 'opacity-60 cursor-wait' : ''}`}
                >
                  {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  {analysisResult && !isAnalyzing && (
                    <span className={`ml-1 text-[10px] font-bold ${
                      (analysisResult.overallScore as number) >= 80 ? 'text-emerald-400' : (analysisResult.overallScore as number) >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {analysisResult.overallScore as number}
                    </span>
                  )}
                </button>
              </div>

              {selectedTp ? (
                <TouchpointEditor
                  touchpoint={selectedTp}
                  journeyId={currentJourney.id}
                  onUpdate={handleUpdateTouchpoint}
                  onDelete={handleDeleteTouchpoint}
                  onMove={handleMoveTouchpoint}
                  canMoveUp={selectedIdx > 0}
                  canMoveDown={selectedIdx < sortedTouchpoints.length - 1}
                />
              ) : (
                <div className="px-5 py-3">
                  <h2 className="text-sm font-bold text-slate-200">Select a touchpoint</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Click any touchpoint in the timeline or canvas to edit</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Right panel — canvas/timeline + preview */}
        <div className="flex-1 flex overflow-hidden">
          {view === 'journey' && currentJourney ? (
            <>
              {/* Main content area (canvas or timeline) */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* View toggle toolbar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRightView('canvas')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        rightView === 'canvas' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      Canvas
                    </button>
                    <button
                      onClick={() => setRightView('list')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        rightView === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <List className="w-3 h-3" />
                      List
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-600">{currentJourney.touchpoints.length} touchpoints</span>
                </div>

                {/* Canvas or List view */}
                <div className="flex-1 overflow-hidden">
                  {rightView === 'canvas' ? (
                    <JourneyCanvas
                      touchpoints={currentJourney.touchpoints}
                      selectedId={selectedTpId}
                      onSelect={setSelectedTpId}
                    />
                  ) : (
                    <JourneyTimeline
                      touchpoints={currentJourney.touchpoints}
                      selectedId={selectedTpId}
                      onSelect={setSelectedTpId}
                      journeyName={currentJourney.name}
                    />
                  )}
                </div>
              </div>

              {/* Lint panel (overlay, shows when toggled) */}
              {showLint && lintResult && (
                <div className="w-[320px] bg-slate-900 border-l border-slate-800 flex-shrink-0 overflow-hidden">
                  <JourneyLintPanel
                    result={lintResult}
                    onSelectTouchpoint={setSelectedTpId}
                    onFix={handleLintFix}
                    onFixAll={handleLintFixAll}
                  />
                </div>
              )}

              {/* Analysis panel */}
              {showAnalysis && (
                <div className="w-[380px] bg-slate-900 border-l border-slate-800 flex-shrink-0 overflow-hidden">
                  {isAnalyzing ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-cyan-400" />
                        <p className="text-sm text-slate-400">Analyzing journey...</p>
                        <p className="text-[10px] text-slate-600 mt-1">This takes ~15 seconds</p>
                      </div>
                    </div>
                  ) : analysisResult ? (
                    <JourneyAnalysisPanel
                      analysis={analysisResult as any}
                      onSelectTouchpoint={(seq) => {
                        const tp = currentJourney?.touchpoints.find(t => t.sequence === seq);
                        if (tp) setSelectedTpId(tp.id);
                      }}
                      onFix={handleAnalysisFix}
                      onOpenChat={handleOpenChat}
                      fixingTouchpointId={fixingSequence}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                      Analysis failed. Try again.
                    </div>
                  )}
                </div>
              )}

              {/* Preview sidebar */}
              <div className={`${rightView === 'canvas' ? 'w-[520px]' : 'flex-1'} border-l border-slate-800 overflow-hidden flex-shrink-0`}>
                {selectedTp ? (
                  <TouchpointPreview touchpoint={selectedTp} />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600">
                    <div className="text-center">
                      <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select a touchpoint to preview</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center max-w-md">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h2 className="text-lg font-bold text-slate-400 mb-2">AI Journey Builder</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Describe your audience, goal, and duration. Claude will design a complete
                  multi-channel journey — emails, push notifications, in-app messages — with
                  all copy written and channel decisions made.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fix Chat Modal */}
      {chatContext && currentJourney && (
        <FixChatModal
          journeyId={currentJourney.id}
          touchpointSequences={chatContext.touchpointSequences}
          analysisDetail={chatContext.analysisDetail}
          journeyName={currentJourney.name}
          onApplyFix={handleChatApplyFix}
          onClose={() => setChatContext(null)}
        />
      )}

      {/* Copy Table Modal */}
      {showCopyTable && currentJourney && (
        <CopyTableModal
          touchpoints={currentJourney.touchpoints}
          journeyName={currentJourney.name}
          onClose={() => setShowCopyTable(false)}
        />
      )}
    </div>
  );
}
