import type { InAppContent } from '../types.js';
import { sanitizeUrl } from '../server/validation.js';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeAction(content: InAppContent): string {
  return escapeHtml(sanitizeUrl(content.buttonAction) || '#');
}

// Contextual SVG icons — each feature gets its own icon instead of one generic repeated icon
const FEATURE_ICONS: Record<string, { svg: string; bg?: string }> = {
  // Practice / session — bullseye target
  practice: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  },
  // Session Review — bar chart / data grid
  review: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>`,
  },
  // Session Insights — trend line
  insights: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  },
  // Courses — flag on green
  courses: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  },
  // Range — ruler / distance
  range: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M2 12h20M6 8v8M12 6v12M18 8v8"/></svg>`,
  },
  // Target Mode — crosshair
  target: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
  },
  // Combine — trophy
  combine: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  },
  // Video — play/camera
  video: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  },
  // Default / generic — Rapsodo bolt
  default: {
    svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
};

// Map button actions and message content to the right icon
function pickIcon(content: InAppContent): string {
  const action = (content.buttonAction || '').toLowerCase();
  const title = (content.title || '').toLowerCase();
  const body = (content.body || '').toLowerCase();
  const all = `${action} ${title} ${body}`;

  if (action.includes('session-review') || all.includes('session review') || all.includes('breakdown')) return FEATURE_ICONS.review.svg;
  if (action.includes('session-insights') || all.includes('insight') || all.includes('bigger picture') || all.includes('trend')) return FEATURE_ICONS.insights.svg;
  if (action.includes('courses') || all.includes('course') || all.includes('holes')) return FEATURE_ICONS.courses.svg;
  if (action.includes('target') || all.includes('target') || all.includes('accuracy') || all.includes('crosshair')) return FEATURE_ICONS.target.svg;
  if (action.includes('practice') || all.includes('range mode') || all.includes('through your bag')) return FEATURE_ICONS.range.svg;
  if (action.includes('combine') || all.includes('combine')) return FEATURE_ICONS.combine.svg;
  if (action.includes('export-video') || all.includes('video') || all.includes('swing captured')) return FEATURE_ICONS.video.svg;
  if (action.includes('practice') || all.includes('practice')) return FEATURE_ICONS.practice.svg;
  return FEATURE_ICONS.default.svg;
}

const BARLOW_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700;800&display=swap');`;
const FONT_STACK = `'Barlow', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;

// ============================================================
// PUBLIC API
// ============================================================

export const generateInAppHtml = (content: InAppContent): string => {
  if (content.messageType === 'banner') return generateBannerPreview(content);
  if (content.messageType === 'fullscreen') return generateFullscreenPreview(content);
  return generateModalPreview(content);
};

export const generateInAppIterableHtml = (content: InAppContent): string => {
  if (content.messageType === 'banner') return generateBannerIterable(content);
  if (content.messageType === 'fullscreen') return generateFullscreenIterable(content);
  return generateModalIterable(content);
};

// ============================================================
// MODAL — Feature discovery, actions requiring a decision
// ~35% interaction rate
// ============================================================

function generateModalPreview(content: InAppContent): string {
  const icon = pickIcon(content);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  ${BARLOW_IMPORT}
  body { margin: 0; padding: 40px; background: #1a1a1a; font-family: ${FONT_STACK}; }
</style></head><body>
  <div style="max-width: 375px; margin: 0 auto; background: #000; border-radius: 40px; padding: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
    <div style="background: #f2f2f2; border-radius: 32px; height: 700px; position: relative; overflow: hidden;">
      <!-- Scrim -->
      <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.6); border-radius: 32px;"></div>
      <!-- Modal card -->
      <div style="position: absolute; left: 20px; right: 20px; top: 50%; transform: translateY(-50%); background: #ffffff; border-radius: 22px; padding: 32px 32px 28px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 16px 48px rgba(0,0,0,0.18);">
        <!-- Dismiss X -->
        <div style="position: absolute; top: 14px; right: 16px; width: 28px; height: 28px; border-radius: 14px; background: #f4f4f5; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <!-- Icon -->
        <div style="width: 52px; height: 52px; background: #ce2029; border-radius: 16px; margin: 0 auto 22px; display: flex; align-items: center; justify-content: center;">
          ${icon}
        </div>
        <h2 style="font-family: ${FONT_STACK}; font-size: 22px; font-weight: 800; color: #18181b; margin: 0 0 10px; letter-spacing: -0.4px; line-height: 1.2;">${escapeHtml(content.title)}</h2>
        <p style="font-family: ${FONT_STACK}; font-size: 14px; line-height: 21px; color: #3f3f46; margin: 0 0 28px;">${escapeHtml(content.body)}</p>
        <a href="${safeAction(content)}" style="display: inline-block; background: #ce2029; color: #fff; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px; min-width: 200px; box-shadow: 0 2px 8px rgba(206,32,41,0.3);">${escapeHtml(content.buttonText)}</a>
        <div style="margin-top: 16px;">
          <span style="font-family: ${FONT_STACK}; font-size: 13px; color: #a1a1aa; cursor: pointer;">Not now</span>
        </div>
      </div>
    </div>
  </div>
</body></html>`;
}

function generateModalIterable(content: InAppContent): string {
  const icon = pickIcon(content);
  return `<style>${BARLOW_IMPORT}</style>
<div style="font-family: ${FONT_STACK}; background: #ffffff; border-radius: 22px; padding: 32px 32px 28px; text-align: center; max-width: 320px; margin: 0 auto; position: relative;">
  <a href="iterable://dismiss" style="position: absolute; top: 14px; right: 16px; width: 28px; height: 28px; border-radius: 14px; background: #f4f4f5; display: flex; align-items: center; justify-content: center; text-decoration: none;">
    <span style="font-size: 18px; color: #71717a; line-height: 1;">&times;</span>
  </a>
  <div style="width: 52px; height: 52px; background: #ce2029; border-radius: 16px; margin: 0 auto 22px; display: flex; align-items: center; justify-content: center;">
    ${icon}
  </div>
  <h2 style="font-family: ${FONT_STACK}; font-size: 22px; font-weight: 800; color: #18181b; margin: 0 0 10px; letter-spacing: -0.4px; line-height: 1.2;">${escapeHtml(content.title)}</h2>
  <p style="font-family: ${FONT_STACK}; font-size: 14px; line-height: 21px; color: #3f3f46; margin: 0 0 28px;">${escapeHtml(content.body)}</p>
  <a href="${safeAction(content)}" style="display: inline-block; background: #ce2029; color: #fff; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; text-decoration: none; padding: 16px 36px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px; min-width: 200px;">${escapeHtml(content.buttonText)}</a>
  <div style="margin-top: 16px;">
    <a href="iterable://dismiss" style="font-family: ${FONT_STACK}; font-size: 13px; color: #a1a1aa; text-decoration: none;">Not now</a>
  </div>
</div>`;
}

// ============================================================
// BANNER — Subtle tips, focus suggestions, non-blocking
// ~12.5% interaction rate
// ============================================================

function generateBannerPreview(content: InAppContent): string {
  const icon = pickIcon(content);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  ${BARLOW_IMPORT}
  body { margin: 0; padding: 40px; background: #1a1a1a; font-family: ${FONT_STACK}; }
</style></head><body>
  <div style="max-width: 375px; margin: 0 auto; background: #000; border-radius: 40px; padding: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
    <div style="background: #f2f2f2; border-radius: 32px; height: 700px; position: relative; overflow: hidden;">
      <!-- Banner -->
      <div style="margin: 52px 12px 0; background: #ffffff; border-radius: 16px; padding: 16px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.08);">
        <div style="width: 40px; height: 40px; background: #ce2029; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
          ${icon}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; color: #18181b; line-height: 1.3;">${escapeHtml(content.title)}</div>
          <div style="font-family: ${FONT_STACK}; font-size: 13px; color: #52525b; margin-top: 3px; line-height: 1.35;">${escapeHtml(content.body)}</div>
        </div>
        <div style="font-family: ${FONT_STACK}; font-size: 12px; color: #ce2029; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; padding: 8px 14px; background: rgba(206,32,41,0.08); border-radius: 999px;">${escapeHtml(content.buttonText)}</div>
      </div>
      <div style="padding: 24px; color: #a1a1aa; font-size: 13px; text-align: center; margin-top: 120px;">App content below...</div>
    </div>
  </div>
</body></html>`;
}

function generateBannerIterable(content: InAppContent): string {
  const icon = pickIcon(content);
  return `<style>${BARLOW_IMPORT}</style>
<div style="font-family: ${FONT_STACK}; background: #ffffff; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 14px; margin: 8px; box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.08);">
  <div style="width: 40px; height: 40px; background: #ce2029; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
    ${icon}
  </div>
  <div style="flex: 1; min-width: 0;">
    <div style="font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; color: #18181b;">${escapeHtml(content.title)}</div>
    <div style="font-family: ${FONT_STACK}; font-size: 13px; color: #52525b; margin-top: 3px;">${escapeHtml(content.body)}</div>
  </div>
  <a href="${safeAction(content)}" style="font-family: ${FONT_STACK}; font-size: 12px; color: #ce2029; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-decoration: none; padding: 8px 14px; background: rgba(206,32,41,0.08); border-radius: 999px; flex-shrink: 0;">${escapeHtml(content.buttonText)}</a>
</div>`;
}

// ============================================================
// FULLSCREEN — Major milestones, celebrations (dark variant)
// Rare — only for journey completion, big achievements
// ============================================================

function generateFullscreenPreview(content: InAppContent): string {
  const icon = pickIcon(content);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  ${BARLOW_IMPORT}
  body { margin: 0; padding: 40px; background: #1a1a1a; font-family: ${FONT_STACK}; }
</style></head><body>
  <div style="max-width: 375px; margin: 0 auto; background: #000; border-radius: 40px; padding: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
    <div style="background: #111113; border-radius: 32px; height: 700px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 36px;">
      <!-- Dismiss X -->
      <div style="position: absolute; top: 18px; right: 22px; width: 32px; height: 32px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <!-- Glow behind icon -->
      <div style="width: 64px; height: 64px; background: #ce2029; border-radius: 20px; margin-bottom: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 40px rgba(206,32,41,0.4);">
        ${icon}
      </div>
      <h2 style="font-family: ${FONT_STACK}; font-size: 28px; font-weight: 800; color: #ffffff; margin: 0 0 14px; letter-spacing: -0.5px; line-height: 1.15;">${escapeHtml(content.title)}</h2>
      <p style="font-family: ${FONT_STACK}; font-size: 15px; line-height: 23px; color: rgba(255,255,255,0.6); margin: 0 0 36px; max-width: 280px;">${escapeHtml(content.body)}</p>
      <a href="${safeAction(content)}" style="display: inline-block; background: #ce2029; color: #fff; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; text-decoration: none; padding: 18px 44px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 4px 20px rgba(206,32,41,0.4);">${escapeHtml(content.buttonText)}</a>
      <div style="margin-top: 18px;">
        <span style="font-family: ${FONT_STACK}; font-size: 14px; color: rgba(255,255,255,0.35); cursor: pointer;">Dismiss</span>
      </div>
    </div>
  </div>
</body></html>`;
}

function generateFullscreenIterable(content: InAppContent): string {
  const icon = pickIcon(content);
  return `<style>${BARLOW_IMPORT}</style>
<div style="font-family: ${FONT_STACK}; background: #111113; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 48px 36px; min-height: 100vh; position: relative;">
  <a href="iterable://dismiss" style="position: absolute; top: 18px; right: 22px; width: 32px; height: 32px; border-radius: 16px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; text-decoration: none;">
    <span style="font-size: 20px; color: rgba(255,255,255,0.5); line-height: 1;">&times;</span>
  </a>
  <div style="width: 64px; height: 64px; background: #ce2029; border-radius: 20px; margin-bottom: 28px; display: flex; align-items: center; justify-content: center;">
    ${icon}
  </div>
  <h2 style="font-family: ${FONT_STACK}; font-size: 28px; font-weight: 800; color: #ffffff; margin: 0 0 14px; letter-spacing: -0.5px; line-height: 1.15;">${escapeHtml(content.title)}</h2>
  <p style="font-family: ${FONT_STACK}; font-size: 15px; line-height: 23px; color: rgba(255,255,255,0.6); margin: 0 0 36px; max-width: 280px;">${escapeHtml(content.body)}</p>
  <a href="${safeAction(content)}" style="display: inline-block; background: #ce2029; color: #fff; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; text-decoration: none; padding: 18px 44px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px;">${escapeHtml(content.buttonText)}</a>
  <div style="margin-top: 18px;">
    <a href="iterable://dismiss" style="font-family: ${FONT_STACK}; font-size: 14px; color: rgba(255,255,255,0.35); text-decoration: none;">Dismiss</a>
  </div>
</div>`;
}
