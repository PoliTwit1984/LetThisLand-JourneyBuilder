// ============ Shared Validation ============
// Single source of truth for channels, limits, deep links, URL schemes.
// Used by API routes, AI output parsing, and referenced by prompt generation.

import { DEEP_LINKS } from '../services/rapsodoContext.js';

// ---- Channels ----

export const VALID_CHANNELS = ['email', 'push', 'inapp'] as const;
export type ValidChannel = (typeof VALID_CHANNELS)[number];

export function isValidChannel(ch: unknown): ch is ValidChannel {
  return typeof ch === 'string' && (VALID_CHANNELS as readonly string[]).includes(ch);
}

// ---- Copy Limits (single source of truth) ----
// Prompt rules + UI counters + copyRefiner all derive from these.

export const COPY_LIMITS = {
  email: {
    subject: 40,
    preheader: 70,
    headlineWords: 8,
    bodyWords: { min: 75, max: 125 },
    bulletsMax: 3,
    bulletWords: 10,
  },
  push: {
    title: 40,       // Android safe: 30, iOS safe: 40
    body: 90,        // Android collapsed: ~50, iOS safe: 90
  },
  inapp: {
    title: 50,
    body: 150,
    buttonText: 20,
  },
} as const;

// ---- In-App message types ----

export const VALID_INAPP_TYPES = ['modal', 'banner', 'fullscreen'] as const;
export type ValidInAppType = (typeof VALID_INAPP_TYPES)[number];

// ---- URL Sanitization ----

const ALLOWED_SCHEMES = ['https:', 'http:', 'rapsodo:', 'iterable:', 'mailto:'];

export function sanitizeUrl(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (trimmed === '') return '';

  // Deep links — rapsodo:// and iterable:// don't parse as standard URLs
  if (trimmed.startsWith('rapsodo://') || trimmed.startsWith('iterable://')) {
    // Only allow known deep links or iterable://dismiss
    if (DEEP_LINKS.includes(trimmed) || trimmed === 'iterable://dismiss') return trimmed;
    // Allow rapsodo:// with unknown paths (future-proof) but block injection
    if (/^rapsodo:\/\/[a-z0-9-]+$/.test(trimmed)) return trimmed;
    if (/^iterable:\/\/[a-z0-9-]+$/.test(trimmed)) return trimmed;
    return '';
  }

  // Standard URLs
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_SCHEMES.includes(url.protocol)) return '';
    return url.toString();
  } catch {
    // Could be a relative path or malformed — reject
    return '';
  }
}

// ---- AI Output Validation ----

interface ValidationError {
  path: string;
  message: string;
}

interface ValidatedTouchpoint {
  sequence: number;
  day: number;
  channel: ValidChannel;
  name: string;
  condition: string;
  reasoning: string;
  content: Record<string, unknown>;
}

interface ValidatedJourneyOutput {
  journeyName: string;
  journeySummary: string;
  touchpoints: ValidatedTouchpoint[];
}

export function validateAIOutput(raw: unknown): { data: ValidatedJourneyOutput; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const obj = raw as Record<string, unknown>;

  // Top-level fields
  const journeyName = typeof obj.journeyName === 'string' ? obj.journeyName : 'Untitled Journey';
  if (typeof obj.journeyName !== 'string') errors.push({ path: 'journeyName', message: 'Missing or invalid journeyName' });

  const journeySummary = typeof obj.journeySummary === 'string' ? obj.journeySummary : '';

  // Touchpoints array
  if (!Array.isArray(obj.touchpoints) || obj.touchpoints.length === 0) {
    errors.push({ path: 'touchpoints', message: 'Missing or empty touchpoints array' });
    return { data: { journeyName, journeySummary, touchpoints: [] }, errors };
  }

  const touchpoints: ValidatedTouchpoint[] = [];
  for (let i = 0; i < obj.touchpoints.length; i++) {
    const tp = obj.touchpoints[i] as Record<string, unknown>;
    const prefix = `touchpoints[${i}]`;

    // Required fields
    const sequence = typeof tp.sequence === 'number' ? tp.sequence : i + 1;
    const day = typeof tp.day === 'number' ? tp.day : 0;
    const name = typeof tp.name === 'string' ? tp.name : `Touchpoint ${i + 1}`;
    const condition = typeof tp.condition === 'string' ? tp.condition : '';
    const reasoning = typeof tp.reasoning === 'string' ? tp.reasoning : '';

    // Channel validation — reject SMS, reject unknowns
    let channel: ValidChannel;
    if (typeof tp.channel === 'string' && isValidChannel(tp.channel)) {
      channel = tp.channel;
    } else if (tp.channel === 'sms') {
      errors.push({ path: `${prefix}.channel`, message: 'SMS channel is not supported — skipping touchpoint' });
      continue; // Drop SMS touchpoints entirely
    } else {
      errors.push({ path: `${prefix}.channel`, message: `Invalid channel "${tp.channel}" — defaulting to email` });
      channel = 'email';
    }

    // Content validation per channel
    const content = (tp.content && typeof tp.content === 'object' ? tp.content : {}) as Record<string, unknown>;
    const validatedContent = validateContent(channel, content, `${prefix}.content`, errors);

    touchpoints.push({ sequence, day, channel, name, condition, reasoning, content: validatedContent });
  }

  return { data: { journeyName, journeySummary, touchpoints }, errors };
}

function validateContent(channel: ValidChannel, content: Record<string, unknown>, prefix: string, errors: ValidationError[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...content };

  if (channel === 'email') {
    if (typeof out.subject !== 'string') { errors.push({ path: `${prefix}.subject`, message: 'Missing subject' }); out.subject = ''; }
    if (typeof out.preheader !== 'string') out.preheader = '';
    if (typeof out.headline !== 'string') { errors.push({ path: `${prefix}.headline`, message: 'Missing headline' }); out.headline = ''; }
    if (typeof out.body !== 'string') { errors.push({ path: `${prefix}.body`, message: 'Missing body' }); out.body = ''; }
    if (!Array.isArray(out.bullets)) out.bullets = [];
    if (typeof out.primaryCtaText !== 'string') out.primaryCtaText = '';
    if (typeof out.primaryCtaUrl !== 'string') out.primaryCtaUrl = '';
    // Sanitize URLs
    out.primaryCtaUrl = sanitizeUrl(out.primaryCtaUrl as string);
    if (out.secondaryCtaUrl) out.secondaryCtaUrl = sanitizeUrl(out.secondaryCtaUrl as string);
  }

  if (channel === 'push') {
    if (typeof out.title !== 'string') { errors.push({ path: `${prefix}.title`, message: 'Missing title' }); out.title = ''; }
    if (typeof out.body !== 'string') { errors.push({ path: `${prefix}.body`, message: 'Missing body' }); out.body = ''; }
    if (typeof out.deepLink === 'string') {
      out.deepLink = sanitizeUrl(out.deepLink as string);
    }
  }

  if (channel === 'inapp') {
    if (typeof out.title !== 'string') { errors.push({ path: `${prefix}.title`, message: 'Missing title' }); out.title = ''; }
    if (typeof out.body !== 'string') { errors.push({ path: `${prefix}.body`, message: 'Missing body' }); out.body = ''; }
    if (typeof out.buttonText !== 'string') out.buttonText = '';
    if (typeof out.buttonAction === 'string') {
      out.buttonAction = sanitizeUrl(out.buttonAction as string);
    }
    // Validate message type
    if (!(VALID_INAPP_TYPES as readonly string[]).includes(out.messageType as string)) {
      out.messageType = 'modal';
    }
  }

  return out;
}

// ---- Touchpoint Update Validation ----

export function validateTouchpointUpdate(updates: Record<string, unknown>): { clean: Record<string, unknown>; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const clean: Record<string, unknown> = {};

  // Channel change
  if ('channel' in updates) {
    if (isValidChannel(updates.channel)) {
      clean.channel = updates.channel;
    } else {
      errors.push({ path: 'channel', message: `Invalid channel "${updates.channel}"` });
    }
  }

  // Content — validate if present
  if ('content' in updates && typeof updates.content === 'object' && updates.content !== null) {
    const content = updates.content as Record<string, unknown>;
    // Sanitize any URL fields
    for (const key of ['primaryCtaUrl', 'secondaryCtaUrl', 'deepLink', 'buttonAction']) {
      if (typeof content[key] === 'string') {
        content[key] = sanitizeUrl(content[key] as string);
      }
    }
    clean.content = typeof updates.content === 'string' ? updates.content : JSON.stringify(updates.content);
  } else if ('content' in updates && typeof updates.content === 'string') {
    // Already stringified — parse, sanitize, re-stringify
    try {
      const parsed = JSON.parse(updates.content as string);
      for (const key of ['primaryCtaUrl', 'secondaryCtaUrl', 'deepLink', 'buttonAction']) {
        if (typeof parsed[key] === 'string') {
          parsed[key] = sanitizeUrl(parsed[key]);
        }
      }
      clean.content = JSON.stringify(parsed);
    } catch {
      errors.push({ path: 'content', message: 'Invalid JSON in content field' });
    }
  }

  // Pass through safe scalar fields
  for (const key of ['sequence', 'day', 'name', 'condition', 'ai_reasoning']) {
    if (key in updates) clean[key] = updates[key];
  }

  return { clean, errors };
}
