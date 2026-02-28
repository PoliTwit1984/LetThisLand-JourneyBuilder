import type { PushContent } from '../types.js';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Character limit zones: green (safe) | yellow (risk) | red (truncated)
function charColor(len: number, greenMax: number, yellowMax: number): string {
  if (len <= greenMax) return '#22c55e';
  if (len <= yellowMax) return '#eab308';
  return '#ef4444';
}

// Map deep links / content to contextual icons
function pickPushIcon(content: PushContent): { svg: string; label: string } {
  const link = (content.deepLink || '').toLowerCase();
  const all = `${link} ${content.title} ${content.body}`.toLowerCase();

  if (link.includes('session-review') || all.includes('session review') || all.includes('breakdown'))
    return { svg: `<rect x="3" y="12" width="3" height="7" rx="1" fill="white"/><rect x="8.5" y="8" width="3" height="11" rx="1" fill="white"/><rect x="14" y="4" width="3" height="15" rx="1" fill="white"/>`, label: 'Session Review' };
  if (link.includes('session-insights') || all.includes('insight') || all.includes('trend'))
    return { svg: `<polyline points="3 12 7 12 9 17 13 5 15 12 19 12" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`, label: 'Session Insights' };
  if (link.includes('courses') || all.includes('course'))
    return { svg: `<path d="M5 14s1-1 3.5-1 4 2 7 2 3.5-1 3.5-1V4s-1 1-3.5 1-4-2-7-2S5 4 5 4z" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="5" y1="19" x2="5" y2="14" stroke="white" stroke-width="1.8"/>`, label: 'Courses' };
  if (link.includes('target') || all.includes('target') || all.includes('accuracy'))
    return { svg: `<circle cx="11" cy="11" r="8" fill="none" stroke="white" stroke-width="1.8"/><line x1="19" y1="11" x2="15.5" y2="11" stroke="white" stroke-width="1.8"/><line x1="6.5" y1="11" x2="3" y2="11" stroke="white" stroke-width="1.8"/><line x1="11" y1="6.5" x2="11" y2="3" stroke="white" stroke-width="1.8"/><line x1="11" y1="19" x2="11" y2="15.5" stroke="white" stroke-width="1.8"/>`, label: 'Target Mode' };
  if (link.includes('combine') || all.includes('combine') || all.includes('challenge'))
    return { svg: `<path d="M6 8H5a2 2 0 0 1 0-4h1M16 8h1a2 2 0 0 0 0-4h-1M5 19h12M9 13v3c0 .5-.4.9-.9 1.1C7 17.6 6.3 18.7 6.3 19.5M13 13v3c0 .5.4.9.9 1.1C15 17.6 15.7 18.7 15.7 19.5M16 2H6v6a5 5 0 0 0 10 0V2Z" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`, label: 'Combine' };
  if (link.includes('stats') || all.includes('stats') || all.includes('history'))
    return { svg: `<path d="M3 3v16h16" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 13 10 9 13 12 18 5" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`, label: 'Stats' };
  if (link.includes('export-video') || all.includes('video') || all.includes('swing'))
    return { svg: `<polygon points="7 4 17 11 7 18" fill="white"/>`, label: 'Video' };
  if (link.includes('practice') || all.includes('practice') || all.includes('session'))
    return { svg: `<circle cx="11" cy="11" r="9" fill="none" stroke="white" stroke-width="1.8"/><circle cx="11" cy="11" r="5" fill="none" stroke="white" stroke-width="1.8"/><circle cx="11" cy="11" r="1.5" fill="white"/>`, label: 'Practice' };
  if (link.includes('subscription') || all.includes('upgrade') || all.includes('premium') || all.includes('trial'))
    return { svg: `<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="none" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>`, label: 'Subscription' };
  // Default — Rapsodo bolt
  return { svg: `<path d="M11 2L4 13h6l-1 7 8-11h-6l1-7z" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`, label: 'Rapsodo' };
}

// ============================================================
// PUBLIC API
// ============================================================

export const generatePushHtml = (content: PushContent): string => {
  return generatePushPreview(content);
};

// For the wiring guide / export — just the copy sheet data
export const generatePushCopySheet = (content: PushContent): { title: string; body: string; deepLink: string; titleLen: number; bodyLen: number } => {
  return {
    title: content.title,
    body: content.body,
    deepLink: content.deepLink || '',
    titleLen: content.title.length,
    bodyLen: content.body.length,
  };
};

// ============================================================
// PREVIEW — iOS + Android side by side in phone frames
// ============================================================

function generatePushPreview(content: PushContent): string {
  const icon = pickPushIcon(content);
  const titleLen = content.title.length;
  const bodyLen = content.body.length;
  const titleColor = charColor(titleLen, 30, 40);
  const bodyColor = charColor(bodyLen, 50, 90);
  const deepLink = content.deepLink || '';

  // Truncated versions for Android (tighter limits)
  const androidTitle = content.title.length > 30 ? content.title.substring(0, 29) + '…' : content.title;
  const androidBody = content.body.length > 50 ? content.body.substring(0, 49) + '…' : content.body;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Roboto:wght@400;500&display=swap');
  body { margin: 0; padding: 32px 20px; background: #111113; font-family: 'Inter', -apple-system, sans-serif; }
  .platforms { display: flex; gap: 24px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
  .platform-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: #71717a; text-align: center; margin-bottom: 12px; }
  .char-bar { display: flex; justify-content: center; gap: 16px; margin-top: 20px; }
  .char-pill { font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 999px; background: #1e1e22; }
  .deep-link-tag { font-size: 11px; color: #a78bfa; background: rgba(167,139,250,0.1); padding: 4px 10px; border-radius: 999px; text-align: center; margin-top: 12px; display: inline-block; font-family: 'SF Mono', 'Fira Code', monospace; }
</style></head><body>

  <div class="platforms">

    <!-- ======== iOS ======== -->
    <div>
      <div class="platform-label">iOS — Lock Screen</div>
      <div style="width: 340px; background: #000; border-radius: 36px; padding: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
        <div style="background: linear-gradient(135deg, #1c1c1e, #2c2c2e); border-radius: 28px; min-height: 340px; position: relative; padding: 48px 16px 24px;">
          <!-- Status bar -->
          <div style="position: absolute; top: 14px; left: 28px; right: 28px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; font-weight: 600; color: #fff; font-family: -apple-system, 'SF Pro Display', sans-serif;">9:41</span>
            <div style="display: flex; gap: 5px; align-items: center;">
              <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="4" width="3" height="8" rx="0.5" fill="#fff" opacity="0.4"/><rect x="4.5" y="2.5" width="3" height="9.5" rx="0.5" fill="#fff" opacity="0.6"/><rect x="9" y="1" width="3" height="11" rx="0.5" fill="#fff"/><rect x="13.5" y="3" width="2" height="7" rx="0.5" fill="#fff" opacity="0.3"/></svg>
              <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0" y="0" width="19" height="11" rx="2" fill="none" stroke="#fff" stroke-width="1"/><rect x="2" y="2.5" width="13" height="6" rx="1" fill="#34d399"/><rect x="20" y="3.5" width="2" height="4" rx="1" fill="#fff" opacity="0.4"/></svg>
            </div>
          </div>

          <!-- Notification card -->
          <div style="margin-top: 24px; background: rgba(255,255,255,0.12); backdrop-filter: blur(40px); -webkit-backdrop-filter: blur(40px); border-radius: 16px; padding: 14px 14px 12px; border: 1px solid rgba(255,255,255,0.06);">
            <!-- App row -->
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 8px;">
              <div style="width: 20px; height: 20px; background: #ce2029; border-radius: 5px; display: flex; align-items: center; justify-content: center;">
                <svg width="12" height="12" viewBox="0 0 22 22">${icon.svg}</svg>
              </div>
              <span style="font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.55); font-family: -apple-system, 'SF Pro Text', sans-serif; text-transform: uppercase; letter-spacing: 0.3px;">RAPSODO GOLF</span>
              <span style="font-size: 12px; color: rgba(255,255,255,0.35); margin-left: auto; font-family: -apple-system, 'SF Pro Text', sans-serif;">now</span>
            </div>
            <!-- Title -->
            <div style="font-size: 15px; font-weight: 600; color: #fff; font-family: -apple-system, 'SF Pro Text', sans-serif; line-height: 1.3; margin-bottom: 3px;">${escapeHtml(content.title)}</div>
            <!-- Body -->
            <div style="font-size: 13px; color: rgba(255,255,255,0.7); font-family: -apple-system, 'SF Pro Text', sans-serif; line-height: 1.35;">${escapeHtml(content.body)}</div>
          </div>

          <!-- Older notification (context) -->
          <div style="margin-top: 10px; background: rgba(255,255,255,0.06); border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,0.03); opacity: 0.5;">
            <div style="display: flex; align-items: center; gap: 7px;">
              <div style="width: 20px; height: 20px; background: #3b82f6; border-radius: 5px;"></div>
              <span style="font-size: 13px; color: rgba(255,255,255,0.4); font-family: -apple-system, sans-serif;">Messages</span>
              <span style="font-size: 12px; color: rgba(255,255,255,0.2); margin-left: auto;">12m ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======== Android ======== -->
    <div>
      <div class="platform-label">Android — Notification Shade</div>
      <div style="width: 340px; background: #000; border-radius: 36px; padding: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
        <div style="background: #1a1a1f; border-radius: 28px; min-height: 340px; position: relative; padding: 48px 16px 24px;">
          <!-- Status bar -->
          <div style="position: absolute; top: 12px; left: 24px; right: 24px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 500; color: #fff; font-family: 'Roboto', sans-serif;">9:41</span>
            <div style="display: flex; gap: 6px; align-items: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9z" fill="#fff" opacity="0.3"/><path d="M5 13l2 2c2.76-2.76 7.24-2.76 10 0l2-2C14.34 8.34 9.66 8.34 5 13z" fill="#fff" opacity="0.6"/><path d="M9 17l3 3 3-3c-1.65-1.66-4.34-1.66-6 0z" fill="#fff"/></svg>
              <svg width="20" height="10" viewBox="0 0 20 10"><rect x="0" y="0" width="17" height="10" rx="1.5" fill="none" stroke="#fff" stroke-width="1"/><rect x="1.5" y="1.5" width="11" height="7" rx="0.5" fill="#34d399"/><rect x="18" y="3" width="2" height="4" rx="0.5" fill="#fff" opacity="0.4"/></svg>
            </div>
          </div>

          <!-- Notification card -->
          <div style="margin-top: 24px; background: #2a2a30; border-radius: 16px; padding: 16px; border: 1px solid rgba(255,255,255,0.04);">
            <!-- App row -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <div style="width: 16px; height: 16px; background: #ce2029; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                <svg width="10" height="10" viewBox="0 0 22 22">${icon.svg}</svg>
              </div>
              <span style="font-size: 12px; color: rgba(255,255,255,0.45); font-family: 'Roboto', sans-serif;">Rapsodo Golf</span>
              <span style="font-size: 10px; color: rgba(255,255,255,0.25); font-family: 'Roboto', sans-serif;">•</span>
              <span style="font-size: 12px; color: rgba(255,255,255,0.25); font-family: 'Roboto', sans-serif;">now</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="margin-left: auto; opacity: 0.3;"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="#fff"/></svg>
            </div>
            <!-- Title (Android truncation) -->
            <div style="font-size: 14px; font-weight: 500; color: #fff; font-family: 'Roboto', sans-serif; line-height: 1.3; margin-bottom: 4px;">${escapeHtml(androidTitle)}</div>
            <!-- Body (Android truncation) -->
            <div style="font-size: 14px; color: rgba(255,255,255,0.6); font-family: 'Roboto', sans-serif; line-height: 1.4;">${escapeHtml(androidBody)}</div>
          </div>

          <!-- Older notification (context) -->
          <div style="margin-top: 8px; background: #222228; border-radius: 16px; padding: 14px; border: 1px solid rgba(255,255,255,0.02); opacity: 0.4;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 16px; height: 16px; background: #10b981; border-radius: 4px;"></div>
              <span style="font-size: 12px; color: rgba(255,255,255,0.3); font-family: 'Roboto', sans-serif;">WhatsApp</span>
              <span style="font-size: 12px; color: rgba(255,255,255,0.15); margin-left: auto; font-family: 'Roboto', sans-serif;">5m</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Character counts & deep link -->
  <div style="text-align: center; margin-top: 24px;">
    <div class="char-bar">
      <span class="char-pill" style="color: ${titleColor};">Title: ${titleLen} chars${titleLen > 40 ? ' ⚠ truncated on Android' : titleLen > 30 ? ' ⚠ may truncate' : ''}</span>
      <span class="char-pill" style="color: ${bodyColor};">Body: ${bodyLen} chars${bodyLen > 90 ? ' ⚠ truncated' : bodyLen > 50 ? ' ⚠ truncated on Android' : ''}</span>
    </div>
    ${deepLink ? `<div style="margin-top: 12px;"><span class="deep-link-tag">→ ${escapeHtml(deepLink)}</span></div>` : '<div style="margin-top: 12px;"><span class="deep-link-tag" style="color: #ef4444; background: rgba(239,68,68,0.1);">⚠ No deep link — will open app home</span></div>'}
  </div>

</body></html>`;
}
