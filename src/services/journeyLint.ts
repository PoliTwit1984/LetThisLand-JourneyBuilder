// Journey lint / scoring engine — pure function, no side effects.
// Checks generated journeys against PRD rules and best practices.

interface TouchpointData {
  id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content: Record<string, unknown>;
}

export interface LintIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  touchpointId?: string;
  fixType?: 'auto' | 'ai';
  fixDetail?: Record<string, unknown>;
}

export interface LintCheck {
  rule: string;
  label: string;
}

export interface LintResult {
  score: number;
  issues: LintIssue[];
  passed: LintCheck[];
}

// Copy limits — mirrors server/validation.ts COPY_LIMITS
const LIMITS = {
  email: { subject: 40, preheader: 70 },
  push: { title: 40, body: 90 },
  inapp: { title: 50, body: 150, buttonText: 20 },
};

export function lintJourney(touchpoints: TouchpointData[]): LintResult {
  const issues: LintIssue[] = [];
  const passed: LintCheck[] = [];
  const sorted = [...touchpoints].sort((a, b) => a.sequence - b.sequence);

  if (sorted.length === 0) {
    return { score: 0, issues: [{ severity: 'error', rule: 'empty', message: 'Journey has no touchpoints' }], passed: [] };
  }

  // ---- Bookends: first and last should be email ----
  if (sorted[0].channel === 'email') {
    passed.push({ rule: 'first-email', label: 'First touchpoint is email' });
  } else {
    issues.push({
      severity: 'warning', rule: 'first-email',
      message: `First touchpoint should be email, got ${sorted[0].channel}`,
      touchpointId: sorted[0].id,
      fixType: 'ai',
      fixDetail: { instruction: 'Regenerate this touchpoint as an email channel touchpoint. Keep the same purpose and messaging but adapt it to email format with subject, preheader, headline, body, and CTA.' },
    });
  }
  if (sorted[sorted.length - 1].channel === 'email') {
    passed.push({ rule: 'last-email', label: 'Last touchpoint is email' });
  } else {
    issues.push({
      severity: 'warning', rule: 'last-email',
      message: `Last touchpoint should be email, got ${sorted[sorted.length - 1].channel}`,
      touchpointId: sorted[sorted.length - 1].id,
      fixType: 'ai',
      fixDetail: { instruction: 'Regenerate this touchpoint as an email channel touchpoint. Keep the same purpose and messaging but adapt it to email format with subject, preheader, headline, body, and CTA.' },
    });
  }

  // ---- Channel mix ----
  const channels = new Set(sorted.map(tp => tp.channel));
  if (channels.size >= 2) {
    passed.push({ rule: 'channel-mix', label: 'Uses multiple channels' });
  } else {
    issues.push({ severity: 'warning', rule: 'channel-mix', message: 'Journey uses only one channel — consider diversifying' });
  }

  const emailCount = sorted.filter(tp => tp.channel === 'email').length;
  const emailRatio = emailCount / sorted.length;
  if (emailRatio >= 0.3 && emailRatio <= 0.7) {
    passed.push({ rule: 'email-ratio', label: 'Email ratio is 30-70%' });
  } else {
    const pct = Math.round(emailRatio * 100);
    issues.push({ severity: 'info', rule: 'email-ratio', message: `Email ratio is ${pct}% (ideal: 30-70%)` });
  }

  // ---- Cadence checks ----
  const emailsByDay = sorted.filter(tp => tp.channel === 'email').sort((a, b) => a.day - b.day);
  const pushByDay = sorted.filter(tp => tp.channel === 'push').sort((a, b) => a.day - b.day);

  let emailCadenceOk = true;
  for (let i = 1; i < emailsByDay.length; i++) {
    const gap = emailsByDay[i].day - emailsByDay[i - 1].day;
    if (gap < 3) {
      emailCadenceOk = false;
      issues.push({
        severity: 'error', rule: 'email-cadence',
        message: `Emails on day ${emailsByDay[i - 1].day} and ${emailsByDay[i].day} are ${gap} day(s) apart (min 3)`,
        touchpointId: emailsByDay[i].id,
        fixType: 'auto',
        fixDetail: { newDay: emailsByDay[i - 1].day + 3 },
      });
    }
  }
  if (emailCadenceOk && emailsByDay.length >= 2) {
    passed.push({ rule: 'email-cadence', label: 'Email cadence ≥ 3 days' });
  }

  let pushCadenceOk = true;
  for (let i = 1; i < pushByDay.length; i++) {
    const gap = pushByDay[i].day - pushByDay[i - 1].day;
    if (gap < 2) {
      pushCadenceOk = false;
      issues.push({
        severity: 'error', rule: 'push-cadence',
        message: `Push on day ${pushByDay[i - 1].day} and ${pushByDay[i].day} are ${gap} day(s) apart (min 2)`,
        touchpointId: pushByDay[i].id,
        fixType: 'auto',
        fixDetail: { newDay: pushByDay[i - 1].day + 2 },
      });
    }
  }
  if (pushCadenceOk && pushByDay.length >= 2) {
    passed.push({ rule: 'push-cadence', label: 'Push cadence ≥ 2 days' });
  }

  // ---- Same-day overload ----
  const dayMap = new Map<number, TouchpointData[]>();
  for (const tp of sorted) {
    if (!dayMap.has(tp.day)) dayMap.set(tp.day, []);
    dayMap.get(tp.day)!.push(tp);
  }
  let sameDayOk = true;
  for (const [day, tps] of dayMap) {
    const unique = new Set(tps.map(tp => tp.channel));
    if (unique.has('email') && unique.has('push') && unique.has('inapp')) {
      sameDayOk = false;
      // Bump the push to next day
      const pushTp = tps.find(tp => tp.channel === 'push');
      issues.push({
        severity: 'error', rule: 'same-day',
        message: `Day ${day} has email + push + inapp — never send all 3 same day`,
        touchpointId: pushTp?.id,
        fixType: 'auto',
        fixDetail: { newDay: day + 1 },
      });
    }
  }
  if (sameDayOk) {
    passed.push({ rule: 'same-day', label: 'No same-day channel overload' });
  }

  // ---- Copy limits ----
  let copyOk = true;
  for (const tp of sorted) {
    const c = tp.content;
    if (tp.channel === 'email') {
      if (typeof c.subject === 'string' && c.subject.length > LIMITS.email.subject) {
        copyOk = false;
        issues.push({
          severity: 'warning', rule: 'copy-limit',
          message: `Subject is ${c.subject.length} chars (max ${LIMITS.email.subject})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'subject', channel: 'email', maxLen: LIMITS.email.subject },
        });
      }
      if (typeof c.preheader === 'string' && c.preheader.length > LIMITS.email.preheader) {
        copyOk = false;
        issues.push({
          severity: 'info', rule: 'copy-limit',
          message: `Preheader is ${c.preheader.length} chars (max ${LIMITS.email.preheader})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'preheader', channel: 'email', maxLen: LIMITS.email.preheader },
        });
      }
    }
    if (tp.channel === 'push') {
      if (typeof c.title === 'string' && c.title.length > LIMITS.push.title) {
        copyOk = false;
        issues.push({
          severity: 'warning', rule: 'copy-limit',
          message: `Push title is ${c.title.length} chars (max ${LIMITS.push.title})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'title', channel: 'push', maxLen: LIMITS.push.title },
        });
      }
      if (typeof c.body === 'string' && c.body.length > LIMITS.push.body) {
        copyOk = false;
        issues.push({
          severity: 'warning', rule: 'copy-limit',
          message: `Push body is ${c.body.length} chars (max ${LIMITS.push.body})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'body', channel: 'push', maxLen: LIMITS.push.body },
        });
      }
    }
    if (tp.channel === 'inapp') {
      if (typeof c.title === 'string' && c.title.length > LIMITS.inapp.title) {
        copyOk = false;
        issues.push({
          severity: 'warning', rule: 'copy-limit',
          message: `InApp title is ${c.title.length} chars (max ${LIMITS.inapp.title})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'title', channel: 'inapp', maxLen: LIMITS.inapp.title },
        });
      }
      if (typeof c.body === 'string' && c.body.length > LIMITS.inapp.body) {
        copyOk = false;
        issues.push({
          severity: 'warning', rule: 'copy-limit',
          message: `InApp body is ${c.body.length} chars (max ${LIMITS.inapp.body})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'body', channel: 'inapp', maxLen: LIMITS.inapp.body },
        });
      }
      if (typeof c.buttonText === 'string' && c.buttonText.length > LIMITS.inapp.buttonText) {
        copyOk = false;
        issues.push({
          severity: 'warning', rule: 'copy-limit',
          message: `InApp button text is ${c.buttonText.length} chars (max ${LIMITS.inapp.buttonText})`,
          touchpointId: tp.id,
          fixType: 'ai',
          fixDetail: { field: 'buttonText', channel: 'inapp', maxLen: LIMITS.inapp.buttonText },
        });
      }
    }
  }
  if (copyOk) {
    passed.push({ rule: 'copy-limit', label: 'All copy within limits' });
  }

  // ---- Deep links ----
  let deepLinkOk = true;
  for (const tp of sorted) {
    if (tp.channel === 'push' && !tp.content.deepLink) {
      deepLinkOk = false;
      issues.push({
        severity: 'warning', rule: 'deep-link',
        message: `Push "${tp.name}" has no deep link`,
        touchpointId: tp.id,
        fixType: 'auto',
        fixDetail: { field: 'deepLink', value: 'rapsodo://practice' },
      });
    }
    if (tp.channel === 'inapp' && !tp.content.buttonAction) {
      deepLinkOk = false;
      issues.push({
        severity: 'warning', rule: 'deep-link',
        message: `InApp "${tp.name}" has no button action`,
        touchpointId: tp.id,
        fixType: 'auto',
        fixDetail: { field: 'buttonAction', value: 'rapsodo://practice' },
      });
    }
  }
  if (deepLinkOk) {
    passed.push({ rule: 'deep-link', label: 'All push/inapp have deep links' });
  }

  // ---- Duration coverage ----
  if (sorted.length >= 3) {
    const maxDay = Math.max(...sorted.map(tp => tp.day));
    const minDay = Math.min(...sorted.map(tp => tp.day));
    const span = maxDay - minDay;
    // Check if touchpoints cluster in first half
    const midDay = minDay + span / 2;
    const firstHalf = sorted.filter(tp => tp.day <= midDay).length;
    const ratio = firstHalf / sorted.length;
    if (ratio <= 0.75) {
      passed.push({ rule: 'duration-spread', label: 'Touchpoints spread across journey' });
    } else {
      issues.push({
        severity: 'info', rule: 'duration-spread',
        message: `${Math.round(ratio * 100)}% of touchpoints cluster in the first half of the journey`,
        fixType: 'auto',
        fixDetail: { type: 'redistribute' },
      });
    }
  }

  // ---- Score ----
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 10;
    else if (issue.severity === 'warning') score -= 5;
    else score -= 1;
  }
  score = Math.max(0, score);

  return { score, issues, passed };
}

// ---- Auto-fix engine ----
// Applies a single auto-fix to the touchpoint array, returns updated copy.
export function applyAutoFix(
  touchpoints: TouchpointData[],
  issue: LintIssue
): TouchpointData[] | null {
  if (issue.fixType !== 'auto' || !issue.fixDetail) return null;

  const updated = touchpoints.map(tp => ({ ...tp, content: { ...tp.content } }));

  // Cadence fix: bump a single touchpoint's day
  if ((issue.rule === 'email-cadence' || issue.rule === 'push-cadence' || issue.rule === 'same-day') && issue.touchpointId) {
    const newDay = issue.fixDetail.newDay as number;
    return updated.map(tp => tp.id === issue.touchpointId ? { ...tp, day: newDay } : tp);
  }

  // Deep link fix: set a content field
  if (issue.rule === 'deep-link' && issue.touchpointId) {
    const field = issue.fixDetail.field as string;
    const value = issue.fixDetail.value as string;
    return updated.map(tp => {
      if (tp.id !== issue.touchpointId) return tp;
      return { ...tp, content: { ...tp.content, [field]: value } };
    });
  }

  // Duration spread: redistribute touchpoints evenly
  if (issue.rule === 'duration-spread' && issue.fixDetail.type === 'redistribute') {
    const sorted = [...updated].sort((a, b) => a.sequence - b.sequence);
    const maxDay = Math.max(...sorted.map(tp => tp.day));
    const count = sorted.length;
    if (count <= 1) return null;
    const step = maxDay / (count - 1);
    const newDays = new Map<string, number>();
    sorted.forEach((tp, i) => {
      newDays.set(tp.id, Math.round(i * step));
    });
    return updated.map(tp => {
      const newDay = newDays.get(tp.id);
      return newDay !== undefined ? { ...tp, day: newDay } : tp;
    });
  }

  return null;
}
