import { Router } from 'express';
import archiver from 'archiver';
import { getJourney, getTouchpoints } from '../db.js';
import { generateEmailHtml } from '../../utils/emailGenerator.js';
import { generateInAppIterableHtml } from '../../utils/inAppGenerator.js';
import { ITERABLE_CHANNEL_IDS, ITERABLE_FOLDER_ID } from '../../services/rapsodoContext.js';
import type { EmailContent, PushContent, InAppContent } from '../../types.js';

const router = Router();

/*
 * Export routes — generates Iterable-importable assets.
 * NO API ACCESS. Just generates files Megan can manually import/paste.
 *
 * What Iterable supports for manual import:
 * - Email templates: Import HTML file via "Import Email Template" button
 * - In-App templates: Paste HTML into Side-by-Side editor when creating template
 * - Push templates: Copy-paste title + body (no file import needed)
 * - Campaigns: Must create manually (no import)
 * - Journeys: Must build manually in canvas (no import)
 */

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

function templateName(tp: ParsedTouchpoint, abbrev: string): string {
  const week = Math.floor(tp.day / 7) + 1;
  const purpose = tp.name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 3).join('');
  const ch = tp.channel === 'inapp' ? 'InApp' : tp.channel.charAt(0).toUpperCase() + tp.channel.slice(1);
  return `${abbrev}_W${week}_${purpose}_${ch}`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// GET /api/export/:journeyId/email/:touchpointId — download email HTML file
router.get('/:journeyId/email/:touchpointId', (req, res) => {
  const journey = getJourney(req.params.journeyId);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const tps = getTouchpoints(journey.id);
  const tp = tps.find(t => t.id === req.params.touchpointId);
  if (!tp || tp.channel !== 'email') return res.status(404).json({ error: 'Email touchpoint not found' });

  const content = JSON.parse(tp.content) as EmailContent;
  const html = generateEmailHtml(content);
  const abbrev = journey.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
  const filename = `${templateName({ ...tp, content } as any, abbrev)}.html`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(html);
});

// GET /api/export/:journeyId/inapp/:touchpointId — download in-app HTML
router.get('/:journeyId/inapp/:touchpointId', (req, res) => {
  const journey = getJourney(req.params.journeyId);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const tps = getTouchpoints(journey.id);
  const tp = tps.find(t => t.id === req.params.touchpointId);
  if (!tp || tp.channel !== 'inapp') return res.status(404).json({ error: 'InApp touchpoint not found' });

  const content = JSON.parse(tp.content) as InAppContent;
  const html = generateInAppIterableHtml(content);
  const abbrev = journey.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
  const filename = `${templateName({ ...tp, content } as any, abbrev)}.html`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(html);
});

// GET /api/export/:journeyId/all — full export page with all assets
router.get('/:journeyId/all', (req, res) => {
  const journey = getJourney(req.params.journeyId);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const rawTouchpoints = getTouchpoints(journey.id);
  const touchpoints: ParsedTouchpoint[] = rawTouchpoints.map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));

  const abbrev = journey.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);

  const emails = touchpoints.filter(t => t.channel === 'email');
  const pushes = touchpoints.filter(t => t.channel === 'push');
  const inapps = touchpoints.filter(t => t.channel === 'inapp');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(journey.name)} — Export Assets</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #0f172a; color: #e2e8f0; font-family: 'Inter', system-ui, sans-serif; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
    .copy-btn { cursor: pointer; transition: all 0.2s; }
    .copy-btn:hover { background: #334155; }
    .copy-btn.copied { background: #166534; color: #4ade80; }
    pre.code-block { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; max-height: 300px; overflow-y: auto; }
  </style>
</head>
<body class="min-h-screen">
<div class="max-w-5xl mx-auto px-8 py-12">

  <div class="mb-10">
    <div class="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-2">Export Assets</div>
    <h1 class="text-3xl font-bold text-white mb-2">${escHtml(journey.name)}</h1>
    <p class="text-slate-400 text-sm">Download HTML files and copy content to import into Iterable. No API required.</p>
    <div class="mt-3 bg-amber-950/30 border border-amber-800/30 rounded-lg px-4 py-3 text-sm text-amber-400">
      All templates go in folder: <strong>Journey Builder (ID: ${ITERABLE_FOLDER_ID})</strong>
    </div>
  </div>

  <!-- Email Templates -->
  <section class="mb-12">
    <h2 class="text-xl font-bold text-white mb-1">${emails.length} Email Templates</h2>
    <p class="text-slate-500 text-sm mb-4">Download each HTML file, then in Iterable: Content → Templates → Import Email Template → Upload file</p>

    <div class="space-y-4">
      ${emails.map(tp => {
        const c = tp.content as Record<string, unknown>;
        const tName = templateName(tp, abbrev);
        return `
      <div class="bg-slate-900/60 border border-blue-500/20 rounded-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <code class="mono text-blue-400 text-sm">${escHtml(tName)}</code>
            <span class="text-slate-500 text-xs ml-2">Day ${tp.day} · Message Type: ${ITERABLE_CHANNEL_IDS.marketingEmail}</span>
          </div>
          <a href="/api/export/${journey.id}/email/${tp.id}" class="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-md transition-colors" download>
            Download HTML
          </a>
        </div>
        <div class="text-sm space-y-1">
          <div><span class="text-slate-500">Subject:</span> <span class="text-white mono">${escHtml(String(c.subject || ''))}</span></div>
          <div><span class="text-slate-500">Preheader:</span> <span class="text-slate-300">${escHtml(String(c.preheader || ''))}</span></div>
        </div>
      </div>`;
      }).join('')}
    </div>
  </section>

  <!-- In-App Templates -->
  <section class="mb-12">
    <h2 class="text-xl font-bold text-white mb-1">${inapps.length} In-App Templates</h2>
    <p class="text-slate-500 text-sm mb-4">In Iterable: Content → Templates → New Template → In-App → Side-by-Side editor → Paste HTML below</p>

    <div class="space-y-4">
      ${inapps.map(tp => {
        const c = tp.content as unknown as InAppContent;
        const tName = templateName(tp, abbrev);
        const iterableHtml = generateInAppIterableHtml(c);
        const escapedForPre = escHtml(iterableHtml);
        return `
      <div class="bg-slate-900/60 border border-emerald-500/20 rounded-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <code class="mono text-emerald-400 text-sm">${escHtml(tName)}</code>
            <span class="text-slate-500 text-xs ml-2">Day ${tp.day} · ${escHtml(String(c.messageType || 'modal'))} · Message Type: ${ITERABLE_CHANNEL_IDS.inApp}</span>
          </div>
          <div class="flex gap-2">
            <button onclick="copyCode(this, '${tp.id}')" class="copy-btn px-3 py-1.5 bg-slate-800 text-emerald-400 text-xs font-semibold rounded-md">
              Copy HTML
            </button>
            <a href="/api/export/${journey.id}/inapp/${tp.id}" class="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold rounded-md transition-colors" download>
              Download
            </a>
          </div>
        </div>
        <div class="text-sm space-y-1 mb-3">
          <div><span class="text-slate-500">Title:</span> <span class="text-white">${escHtml(c.title)}</span></div>
          <div><span class="text-slate-500">Body:</span> <span class="text-slate-300">${escHtml(c.body)}</span></div>
          <div><span class="text-slate-500">Button:</span> <span class="text-emerald-400 mono">${escHtml(c.buttonText)}</span> → <code class="text-xs bg-slate-800 px-1 rounded text-slate-400">${escHtml(c.buttonAction)}</code></div>
          <div><span class="text-slate-500">Trigger:</span> <span class="text-amber-400">${escHtml(tp.condition || 'Always')}</span></div>
        </div>
        <details>
          <summary class="text-xs text-slate-500 cursor-pointer hover:text-slate-400">View HTML</summary>
          <pre class="code-block mt-2 text-slate-300" id="code-${tp.id}">${escapedForPre}</pre>
        </details>
      </div>`;
      }).join('')}
    </div>
  </section>

  <!-- Push Copy Sheet -->
  <section class="mb-12">
    <h2 class="text-xl font-bold text-white mb-1">${pushes.length} Push Notifications</h2>
    <p class="text-slate-500 text-sm mb-4">In Iterable: Content → Templates → New Template → Push → Paste title and body below</p>

    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-800">
            <th class="py-2 pr-3 text-left text-slate-500 font-semibold text-xs">Template Name</th>
            <th class="py-2 pr-3 text-left text-slate-500 font-semibold text-xs">Day</th>
            <th class="py-2 pr-3 text-left text-slate-500 font-semibold text-xs">Title</th>
            <th class="py-2 pr-3 text-left text-slate-500 font-semibold text-xs">Body</th>
            <th class="py-2 pr-3 text-left text-slate-500 font-semibold text-xs">Deep Link</th>
            <th class="py-2 text-left text-slate-500 font-semibold text-xs">Condition</th>
          </tr>
        </thead>
        <tbody>
          ${pushes.map(tp => {
            const c = tp.content as Record<string, unknown>;
            return `
          <tr class="border-b border-slate-800/50">
            <td class="py-3 pr-3"><code class="mono text-purple-400 text-xs">${escHtml(templateName(tp, abbrev))}</code></td>
            <td class="py-3 pr-3 text-slate-400">${tp.day}</td>
            <td class="py-3 pr-3 text-white text-xs">${escHtml(String(c.title || ''))}</td>
            <td class="py-3 pr-3 text-slate-300 text-xs">${escHtml(String(c.body || ''))}</td>
            <td class="py-3 pr-3"><code class="mono text-purple-400 text-[10px]">${escHtml(String(c.deepLink || '—'))}</code></td>
            <td class="py-3 text-amber-400/80 text-xs">${escHtml(tp.condition || 'Always')}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="mt-4 bg-slate-900/40 border border-slate-800/50 rounded-lg p-4 text-xs text-slate-400">
      <strong class="text-slate-200">All push templates:</strong> Message Type ID ${ITERABLE_CHANNEL_IDS.push} · Folder: Journey Builder (${ITERABLE_FOLDER_ID})
    </div>
  </section>

  <!-- Campaign Settings -->
  <section class="mb-12">
    <h2 class="text-xl font-bold text-white mb-1">Campaign Settings (All ${touchpoints.length})</h2>
    <p class="text-slate-500 text-sm mb-4">Create one triggered campaign per template with these settings:</p>

    <div class="bg-slate-900/60 border border-slate-800/50 rounded-lg p-5 space-y-3 text-sm">
      <div><span class="text-slate-500">Campaign Type:</span> <span class="text-white">Triggered</span></div>
      <div><span class="text-slate-500">Skip Duplicate:</span> <span class="text-emerald-400">Yes</span></div>
      <div><span class="text-slate-500">Respect Frequency Cap:</span> <span class="text-emerald-400">Yes</span></div>
      <div><span class="text-slate-500">Quiet Hours (Push):</span> <span class="text-white">9 PM — 8 AM user local time</span></div>
    </div>
  </section>

</div>

<script>
function copyCode(btn, tpId) {
  const pre = document.getElementById('code-' + tpId);
  if (!pre) return;
  // Decode HTML entities back to raw HTML for clipboard
  const tmp = document.createElement('textarea');
  tmp.innerHTML = pre.textContent;
  navigator.clipboard.writeText(tmp.value).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy HTML';
      btn.classList.remove('copied');
    }, 2000);
  });
}
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// GET /api/export/:journeyId/zip — download all assets as a ZIP folder
router.get('/:journeyId/zip', (req, res) => {
  const journey = getJourney(req.params.journeyId);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const rawTouchpoints = getTouchpoints(journey.id);
  const touchpoints: ParsedTouchpoint[] = rawTouchpoints.map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));

  const abbrev = journey.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4);
  const folderName = journey.name.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/ /g, '_');

  const archive = archiver('zip', { zlib: { level: 9 } });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${folderName}_Export.zip"`);
  archive.pipe(res);

  // Email HTML files
  const emails = touchpoints.filter(t => t.channel === 'email');
  for (const tp of emails) {
    const html = generateEmailHtml(tp.content as unknown as EmailContent);
    const fname = `${templateName(tp, abbrev)}.html`;
    archive.append(html, { name: `emails/${fname}` });
  }

  // InApp HTML files
  const inapps = touchpoints.filter(t => t.channel === 'inapp');
  for (const tp of inapps) {
    const html = generateInAppIterableHtml(tp.content as unknown as InAppContent);
    const fname = `${templateName(tp, abbrev)}.html`;
    archive.append(html, { name: `inapp/${fname}` });
  }

  // Push copy sheet as CSV
  const pushes = touchpoints.filter(t => t.channel === 'push');
  if (pushes.length > 0) {
    const csvRows = ['Template Name,Day,Title,Body,Deep Link,Condition'];
    for (const tp of pushes) {
      const c = tp.content as Record<string, unknown>;
      const csvEsc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      csvRows.push([
        csvEsc(templateName(tp, abbrev)),
        String(tp.day),
        csvEsc(String(c.title || '')),
        csvEsc(String(c.body || '')),
        csvEsc(String(c.deepLink || '')),
        csvEsc(tp.condition || 'Always'),
      ].join(','));
    }
    archive.append(csvRows.join('\n'), { name: `push/${abbrev}_Push_Copy_Sheet.csv` });
  }

  // Journey summary README
  const readme = `# ${journey.name} — Iterable Export

## Journey Summary
- **Audience:** ${journey.audience}
- **Goal:** ${journey.goal}
- **Duration:** ${journey.duration_weeks} weeks
- **Touchpoints:** ${touchpoints.length} total (${emails.length} email, ${pushes.length} push, ${inapps.length} in-app)
- **Folder:** Journey Builder (ID: ${ITERABLE_FOLDER_ID})

## File Structure
- \`emails/\` — HTML files ready for Iterable "Import Email Template"
- \`inapp/\` — HTML files for Iterable Side-by-Side editor (paste into custom HTML)
- \`push/\` — CSV copy sheet with title, body, and conditions

## Campaign Settings
- Campaign Type: Triggered
- Skip Duplicate: Yes
- Respect Frequency Cap: Yes
- Quiet Hours (Push): 9 PM — 8 AM user local time

## Message Type IDs
- Marketing Email: ${ITERABLE_CHANNEL_IDS.marketingEmail}
- Push: ${ITERABLE_CHANNEL_IDS.push}
- In-App: ${ITERABLE_CHANNEL_IDS.inApp}

## Touchpoint List
${touchpoints.map(tp => {
  const ch = tp.channel.toUpperCase().padEnd(5);
  return `- Day ${String(tp.day).padStart(2)} | ${ch} | ${tp.name}${tp.condition ? ` (${tp.condition})` : ''}`;
}).join('\n')}
`;
  archive.append(readme, { name: 'README.md' });

  archive.finalize();
});

export default router;
