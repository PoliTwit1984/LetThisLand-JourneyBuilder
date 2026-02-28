import React, { useState } from 'react';
import { X, ClipboardCopy, Check } from 'lucide-react';

interface TouchpointData {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content: Record<string, unknown>;
}

interface Props {
  touchpoints: TouchpointData[];
  journeyName: string;
  onClose: () => void;
}

export default function CopyTableModal({ touchpoints, journeyName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const sorted = [...touchpoints].sort((a, b) => a.sequence - b.sequence);

  const getMainCopy = (tp: TouchpointData): { primary: string; secondary: string } => {
    const c = tp.content;
    switch (tp.channel) {
      case 'email':
        return { primary: (c.subject as string) || '', secondary: (c.headline as string) || '' };
      case 'push':
        return { primary: (c.title as string) || '', secondary: (c.body as string) || '' };
      case 'inapp':
        return { primary: (c.title as string) || '', secondary: (c.buttonText as string) || '' };
      default:
        return { primary: '', secondary: '' };
    }
  };

  const getCta = (tp: TouchpointData): string => {
    const c = tp.content;
    if (tp.channel === 'email') return (c.primaryCtaText as string) || '';
    if (tp.channel === 'push') return (c.deepLink as string) || '';
    if (tp.channel === 'inapp') return (c.buttonAction as string) || '';
    return '';
  };

  const getKpiSummary = (tp: TouchpointData): string => {
    const kpis = tp.content.kpis as Record<string, unknown> | undefined;
    if (!kpis) return '';
    const parts: string[] = [];
    if (kpis.openRate) parts.push(`Open: ${kpis.openRate}%`);
    if (kpis.ctr) parts.push(`CTR: ${kpis.ctr}%`);
    if (kpis.tapRate) parts.push(`Tap: ${kpis.tapRate}%`);
    if (kpis.interactionRate) parts.push(`Interact: ${kpis.interactionRate}%`);
    if (kpis.custom) parts.push(String(kpis.custom));
    return parts.join(', ');
  };

  const buildTsv = (): string => {
    const header = 'Seq\tDay\tChannel\tName\tSubject/Title\tHeadline/Body\tCTA/Deep Link\tCondition\tKPI Targets';
    const rows = sorted.map(tp => {
      const { primary, secondary } = getMainCopy(tp);
      return `${tp.sequence}\t${tp.day}\t${tp.channel}\t${tp.name}\t${primary}\t${secondary}\t${getCta(tp)}\t${tp.condition || ''}\t${getKpiSummary(tp)}`;
    });
    return `${journeyName}\n\n${header}\n${rows.join('\n')}`;
  };

  const buildMarkdown = (): string => {
    const header = '| # | Day | Channel | Name | Subject/Title | Headline/Body | CTA/Link | Condition | KPI Targets |';
    const sep = '|---|-----|---------|------|---------------|---------------|----------|-----------|-------------|';
    const rows = sorted.map(tp => {
      const { primary, secondary } = getMainCopy(tp);
      return `| ${tp.sequence} | ${tp.day} | ${tp.channel} | ${tp.name} | ${primary} | ${secondary} | ${getCta(tp)} | ${tp.condition || ''} | ${getKpiSummary(tp)} |`;
    });
    return `## ${journeyName}\n\n${header}\n${sep}\n${rows.join('\n')}`;
  };

  const handleCopy = async (format: 'tsv' | 'markdown') => {
    const text = format === 'tsv' ? buildTsv() : buildMarkdown();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[90vw] max-w-5xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-200">Copy Table — {journeyName}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy('markdown')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
            <button
              onClick={() => handleCopy('tsv')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold transition-colors"
            >
              <ClipboardCopy className="w-3 h-3" />
              Copy TSV
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Day</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Channel</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Subject / Title</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Headline / Body</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">CTA / Link</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">Condition</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500">KPI Targets</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(tp => {
                const { primary, secondary } = getMainCopy(tp);
                const channelColors: Record<string, string> = {
                  email: 'text-blue-400', push: 'text-purple-400', inapp: 'text-green-400',
                };
                return (
                  <tr key={tp.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-3 py-2 font-mono text-slate-500">{tp.sequence}</td>
                    <td className="px-3 py-2 text-slate-400">{tp.day}</td>
                    <td className={`px-3 py-2 font-semibold ${channelColors[tp.channel] || 'text-slate-400'}`}>{tp.channel}</td>
                    <td className="px-3 py-2 text-slate-200 font-medium">{tp.name}</td>
                    <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate">{primary}</td>
                    <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate">{secondary}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate font-mono text-[10px]">{getCta(tp)}</td>
                    <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate">{tp.condition}</td>
                    <td className="px-3 py-2 text-amber-400/80 max-w-[180px] truncate text-[10px]">{getKpiSummary(tp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
