import { Router } from 'express';
import { getJourney, getTouchpoints } from '../db.js';
import { ITERABLE_CHANNEL_IDS, ITERABLE_FOLDER_ID } from '../../services/rapsodoContext.js';

const router = Router();

interface ParsedTouchpoint {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  ai_reasoning: string | null;
  content: Record<string, unknown>;
}

const channelColor: Record<string, { bg: string; text: string; border: string; label: string }> = {
  email:  { bg: 'bg-blue-500/20',    text: 'text-blue-400',    border: 'border-blue-500/30',    label: 'Email' },
  push:   { bg: 'bg-purple-500/20',  text: 'text-purple-400',  border: 'border-purple-500/30',  label: 'Push' },
  inapp:  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'In-App' },
};

const messageTypeId = (ch: string): number => {
  switch (ch) {
    case 'email': return ITERABLE_CHANNEL_IDS.marketingEmail;
    case 'push': return ITERABLE_CHANNEL_IDS.push;
    case 'inapp': return ITERABLE_CHANNEL_IDS.inApp;
    default: return 0;
  }
};

const campaignName = (tp: ParsedTouchpoint, journeyAbbrev: string): string => {
  const week = Math.floor(tp.day / 7) + 1;
  const purpose = tp.name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 3).join('');
  const ch = tp.channel === 'inapp' ? 'InApp' : tp.channel.charAt(0).toUpperCase() + tp.channel.slice(1);
  return `${journeyAbbrev}_W${week}_${purpose}_${ch}`;
};

const escHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function getKpiHtml(tp: ParsedTouchpoint): string {
  const kpis = tp.content.kpis as Record<string, unknown> | undefined;
  if (!kpis) return '<span class="text-slate-600">—</span>';
  const parts: string[] = [];
  if (kpis.openRate) parts.push(`Open: ${kpis.openRate}%`);
  if (kpis.ctr) parts.push(`CTR: ${kpis.ctr}%`);
  if (kpis.tapRate) parts.push(`Tap: ${kpis.tapRate}%`);
  if (kpis.interactionRate) parts.push(`Interact: ${kpis.interactionRate}%`);
  if (kpis.custom) parts.push(escHtml(String(kpis.custom)));
  return parts.length > 0 ? `<span class="text-amber-400">${parts.join(', ')}</span>` : '<span class="text-slate-600">—</span>';
}

function renderTemplateContent(tp: ParsedTouchpoint): string {
  const c = tp.content;
  if (tp.channel === 'email') {
    let html = `<div class="space-y-2 text-sm">`;
    html += `<div><span class="text-slate-500">Subject:</span> <span class="text-white font-mono">${escHtml(String(c.subject || ''))}</span></div>`;
    html += `<div><span class="text-slate-500">Preheader:</span> <span class="text-slate-300">${escHtml(String(c.preheader || ''))}</span></div>`;
    html += `<div><span class="text-slate-500">Headline:</span> <span class="text-slate-200 font-semibold">${escHtml(String(c.headline || ''))}</span></div>`;
    const body = String(c.body || '').split('\n\n').map(p => `<p class="text-slate-400 text-xs">${escHtml(p)}</p>`).join('');
    html += `<div class="mt-2">${body}</div>`;
    if (Array.isArray(c.bullets) && c.bullets.length > 0) {
      html += `<ul class="list-disc ml-5 text-xs text-slate-400 space-y-1">`;
      for (const b of c.bullets) html += `<li>${escHtml(String(b))}</li>`;
      html += `</ul>`;
    }
    html += `<div class="mt-2"><span class="text-slate-500">CTA:</span> <span class="text-blue-400">${escHtml(String(c.primaryCtaText || ''))}</span> → <code class="text-xs bg-slate-800 px-1 rounded text-slate-300">${escHtml(String(c.primaryCtaUrl || ''))}</code></div>`;
    if (c.secondaryCtaText) {
      html += `<div><span class="text-slate-500">CTA 2:</span> <span class="text-blue-400">${escHtml(String(c.secondaryCtaText))}</span> → <code class="text-xs bg-slate-800 px-1 rounded text-slate-300">${escHtml(String(c.secondaryCtaUrl || ''))}</code></div>`;
    }
    html += `</div>`;
    return html;
  }
  if (tp.channel === 'push') {
    return `<div class="space-y-1 text-sm">
      <div><span class="text-slate-500">Title:</span> <span class="text-white font-mono">${escHtml(String(c.title || ''))}</span></div>
      <div><span class="text-slate-500">Body:</span> <span class="text-slate-300">${escHtml(String(c.body || ''))}</span></div>
    </div>`;
  }
  if (tp.channel === 'inapp') {
    return `<div class="space-y-1 text-sm">
      <div><span class="text-slate-500">Type:</span> <span class="text-emerald-400">${escHtml(String(c.messageType || 'modal'))}</span></div>
      <div><span class="text-slate-500">Title:</span> <span class="text-white font-mono">${escHtml(String(c.title || ''))}</span></div>
      <div><span class="text-slate-500">Body:</span> <span class="text-slate-300">${escHtml(String(c.body || ''))}</span></div>
      <div><span class="text-slate-500">Button:</span> <span class="text-emerald-400 font-mono">${escHtml(String(c.buttonText || ''))}</span> → <code class="text-xs bg-slate-800 px-1 rounded text-slate-300">${escHtml(String(c.buttonAction || ''))}</code></div>
    </div>`;
  }
  return `<pre class="text-xs text-slate-400">${escHtml(JSON.stringify(c, null, 2))}</pre>`;
}

// GET /api/wiring-guide/:journeyId — generates full wiring guide HTML
router.get('/:journeyId', (req, res) => {
  const journey = getJourney(req.params.journeyId);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const rawTouchpoints = getTouchpoints(journey.id);
  const touchpoints: ParsedTouchpoint[] = rawTouchpoints.map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));

  const abbrev = journey.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);

  const emailCount = touchpoints.filter(t => t.channel === 'email').length;
  const pushCount = touchpoints.filter(t => t.channel === 'push').length;
  const inappCount = touchpoints.filter(t => t.channel === 'inapp').length;
  const totalWeeks = journey.duration_weeks;

  // Group by week
  const weeks: Map<number, ParsedTouchpoint[]> = new Map();
  for (const tp of touchpoints) {
    const week = Math.floor(tp.day / 7) + 1;
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(tp);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(journey.name)} — Iterable Wiring Guide</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #0f172a; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
    @media print { body { background: white; color: black; } }
  </style>
</head>
<body class="min-h-screen">
<div class="max-w-5xl mx-auto px-8 py-12">

  <!-- Header -->
  <div class="mb-12">
    <div class="text-xs font-semibold text-red-500 uppercase tracking-widest mb-2">Iterable Wiring Guide</div>
    <h1 class="text-3xl font-bold text-white mb-2">${escHtml(journey.name)}</h1>
    <p class="text-slate-400 text-sm">${escHtml(journey.audience)} — ${escHtml(journey.goal)}</p>
    <div class="flex gap-4 mt-4 text-xs">
      <span class="px-2 py-1 rounded ${channelColor.email.bg} ${channelColor.email.text}">${emailCount} Email</span>
      <span class="px-2 py-1 rounded ${channelColor.push.bg} ${channelColor.push.text}">${pushCount} Push</span>
      <span class="px-2 py-1 rounded ${channelColor.inapp.bg} ${channelColor.inapp.text}">${inappCount} In-App</span>
      <span class="px-2 py-1 rounded bg-slate-800 text-slate-400">${touchpoints.length} Total</span>
      <span class="px-2 py-1 rounded bg-slate-800 text-slate-400">${totalWeeks} Weeks</span>
    </div>
    <div class="mt-4 text-xs text-slate-600">
      Folder: Journey Builder (${ITERABLE_FOLDER_ID}) · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>

  <!-- Entry / Exit -->
  <div class="mb-12 grid grid-cols-2 gap-4">
    <div class="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-5">
      <h3 class="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-2">Entry Trigger</h3>
      <p class="text-sm text-slate-300">List: <strong class="text-white">"Active Paid — 1+ session in 14 days"</strong></p>
      <p class="text-xs text-slate-500 mt-1">Filter: NOT in journey "Churn Risk"</p>
    </div>
    <div class="bg-red-950/20 border border-red-800/30 rounded-lg p-5">
      <h3 class="text-red-400 font-semibold text-sm uppercase tracking-wider mb-2">Exit Conditions</h3>
      <ul class="text-sm text-slate-300 space-y-1">
        <li>14+ days no login → move to At-Risk journey</li>
        <li>Subscription cancelled → exit journey</li>
        <li>Day ${journey.duration_weeks * 7} → natural journey end</li>
      </ul>
    </div>
  </div>

  <!-- ===== SECTION 1: TEMPLATES ===== -->
  <section class="mb-16">
    <div class="mb-6">
      <div class="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Step 1</div>
      <h2 class="text-2xl font-bold text-white">Create Templates</h2>
      <p class="text-slate-500 text-sm">Create these templates in Iterable under folder "Journey Builder" (ID: ${ITERABLE_FOLDER_ID})</p>
    </div>

    ${Array.from(weeks.entries()).map(([week, tps]) => `
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-800 pb-2">Week ${week}</h3>
      <div class="space-y-4">
        ${tps.map(tp => {
          const cc = channelColor[tp.channel] || channelColor.email;
          const cName = campaignName(tp, abbrev);
          return `
        <div class="bg-slate-900/60 border ${cc.border} rounded-lg p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-500">#${tp.sequence}</span>
              <span class="px-2 py-0.5 rounded text-xs font-semibold ${cc.bg} ${cc.text}">${cc.label}</span>
              <span class="text-sm font-semibold text-white">${escHtml(tp.name)}</span>
            </div>
            <div class="flex items-center gap-3 text-xs text-slate-500">
              <span>Day ${tp.day}</span>
              <span>MsgType: ${messageTypeId(tp.channel)}</span>
            </div>
          </div>
          <div class="mb-2 text-xs"><span class="text-slate-500">Template name:</span> <code class="mono ${cc.text} bg-slate-800 px-1.5 py-0.5 rounded">${escHtml(cName)}</code></div>
          <div class="mb-3 text-xs"><span class="text-slate-500">Condition:</span> <span class="text-amber-400">${escHtml(tp.condition || 'Always send')}</span></div>
          ${renderTemplateContent(tp)}
          ${tp.content.kpis ? `<div class="mt-3 text-xs"><span class="text-amber-500 font-semibold">KPI Targets:</span> ${getKpiHtml(tp)}</div>` : ''}
          ${tp.ai_reasoning ? `<div class="mt-3 text-xs text-slate-600 italic">AI: ${escHtml(tp.ai_reasoning)}</div>` : ''}
        </div>`;
        }).join('')}
      </div>
    </div>`).join('')}
  </section>

  <!-- ===== SECTION 2: CAMPAIGNS ===== -->
  <section class="mb-16">
    <div class="mb-6">
      <div class="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Step 2</div>
      <h2 class="text-2xl font-bold text-white">Create Campaigns</h2>
      <p class="text-slate-500 text-sm">Create a triggered campaign for each template, linking to the template above</p>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-800 text-left">
            <th class="py-2 pr-3 text-slate-500 font-semibold text-xs">#</th>
            <th class="py-2 pr-3 text-slate-500 font-semibold text-xs">Campaign Name</th>
            <th class="py-2 pr-3 text-slate-500 font-semibold text-xs">Channel</th>
            <th class="py-2 pr-3 text-slate-500 font-semibold text-xs">Day</th>
            <th class="py-2 pr-3 text-slate-500 font-semibold text-xs">Message Type</th>
            <th class="py-2 pr-3 text-slate-500 font-semibold text-xs">Condition</th>
            <th class="py-2 text-slate-500 font-semibold text-xs">KPI Targets</th>
          </tr>
        </thead>
        <tbody>
          ${touchpoints.map(tp => {
            const cc = channelColor[tp.channel] || channelColor.email;
            return `
          <tr class="border-b border-slate-800/50">
            <td class="py-2 pr-3 text-slate-500 font-mono text-xs">${tp.sequence}</td>
            <td class="py-2 pr-3"><code class="mono text-xs ${cc.text}">${escHtml(campaignName(tp, abbrev))}</code></td>
            <td class="py-2 pr-3"><span class="px-1.5 py-0.5 rounded text-xs ${cc.bg} ${cc.text}">${cc.label}</span></td>
            <td class="py-2 pr-3 text-slate-400">${tp.day}</td>
            <td class="py-2 pr-3 text-slate-400 font-mono text-xs">${messageTypeId(tp.channel)}</td>
            <td class="py-2 pr-3 text-xs text-amber-400/80">${escHtml(tp.condition || 'Always')}</td>
            <td class="py-2 text-xs">${getKpiHtml(tp)}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="mt-4 bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 text-xs text-slate-400 space-y-1">
      <div><strong class="text-slate-200">All campaigns:</strong> Type = Triggered</div>
      <div><strong class="text-slate-200">Skip Duplicate:</strong> Yes</div>
      <div><strong class="text-slate-200">Respect Frequency Cap:</strong> Yes</div>
    </div>
  </section>

  <!-- ===== SECTION 3: CANVAS BUILD ===== -->
  <section class="mb-16">
    <div class="mb-6">
      <div class="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Step 3</div>
      <h2 class="text-2xl font-bold text-white">Build Journey Canvas</h2>
      <p class="text-slate-500 text-sm">Build the canvas in Iterable with these nodes in order</p>
    </div>

    <div class="mb-6 bg-slate-900/40 border border-slate-800/50 rounded-lg p-5 space-y-2 text-sm">
      <div><strong class="text-slate-200">1.</strong> Create journey: <span class="text-white font-semibold">"${escHtml(journey.name)}"</span></div>
      <div><strong class="text-slate-200">2.</strong> Entry: List <span class="text-emerald-400">"Active Paid — 1+ session in 14 days"</span></div>
      <div><strong class="text-slate-200">3.</strong> Re-entry: <span class="text-red-400">Disabled</span></div>
    </div>

    ${Array.from(weeks.entries()).map(([week, tps]) => `
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-slate-200 mb-4">Week ${week} <span class="text-slate-600 text-sm font-normal">(Days ${(week-1)*7}-${week*7-1})</span></h3>
      <div class="bg-slate-900/60 border border-slate-800/50 rounded-lg p-5 space-y-3">
        ${tps.map((tp, i) => {
          const cc = channelColor[tp.channel] || channelColor.email;
          const isConditional = tp.condition && tp.condition !== 'Always send' && tp.condition !== 'On journey entry';
          const letter = String.fromCharCode(65 + i);
          return `
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded ${isConditional ? 'bg-amber-500/20' : 'bg-slate-800'} flex items-center justify-center flex-shrink-0 mt-0.5">
            <span class="${isConditional ? 'text-amber-400' : 'text-slate-400'} font-mono text-xs">${letter}</span>
          </div>
          <div>
            <span class="text-sm text-slate-200"><strong>Send:</strong> <code class="mono text-xs ${cc.text}">${escHtml(campaignName(tp, abbrev))}</code></span>
            ${isConditional ? `<div class="text-xs text-amber-400 mt-0.5">Condition: ${escHtml(tp.condition || '')}</div>` : ''}
          </div>
        </div>`;
        }).join('')}
        ${week < totalWeeks ? `
        <div class="flex items-center gap-3 text-sm text-slate-500">
          <div class="w-6 h-6 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
            <span class="text-slate-500 font-mono text-xs">W</span>
          </div>
          <span>Wait until Day ${week * 7}</span>
        </div>` : ''}
      </div>
    </div>`).join('')}
  </section>

  <!-- ===== SECTION 4: TESTING CHECKLIST ===== -->
  <section class="mb-16">
    <div class="mb-6">
      <div class="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Step 4</div>
      <h2 class="text-2xl font-bold text-white">Testing Checklist</h2>
    </div>

    <div class="bg-slate-900/60 border border-slate-800/50 rounded-lg p-5 space-y-2">
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">All ${emailCount} email templates created</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">All ${pushCount} push templates created</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">All ${inappCount} in-app templates created</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">All ${touchpoints.length} campaigns created as Triggered type</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">Journey canvas built with correct node order</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">Decision conditions use correct user fields</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">InApp triggers use correct events</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">Exit conditions configured (14d no login, sub cancelled)</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">Frequency caps set</span></label>
      <label class="flex items-center gap-3 text-sm cursor-pointer"><input type="checkbox"><span class="text-slate-300">Test user sent through journey</span></label>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-slate-800/40 pt-8 pb-16 text-center text-xs text-slate-600">
    <div>${escHtml(journey.name)} — Iterable Wiring Guide</div>
    <div>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </footer>

</div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
