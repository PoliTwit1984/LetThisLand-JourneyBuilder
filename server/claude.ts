import { getPrompt } from './db.js';
import { DEFAULT_PROMPTS, type PromptKey } from '../services/promptDefaults.js';
import type { JourneyGenerationResult, JourneyAnalysis } from '../types.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'anthropic/claude-opus-4';

const getApiKey = () => process.env.OPENROUTER_API_KEY || '';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

const chatCompletion = async (
  messages: ChatMessage[],
  maxTokens: number = 1024
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Journey Builder'
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API Error:', response.status, errorText);
    throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as OpenRouterResponse;
  return data.choices[0]?.message?.content || '';
};

const cleanJsonResponse = (text: string): string => {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return text.trim();
};

const getPromptWithFallback = (key: PromptKey): string => {
  const custom = getPrompt(key);
  if (custom) return custom;
  return DEFAULT_PROMPTS[key];
};

// ============ Journey Generation ============

export const generateJourney = async (briefText: string): Promise<{ result: JourneyGenerationResult; raw: string }> => {
  const systemPrompt = getPromptWithFallback('journeyGenerator');

  const raw = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: briefText }
  ], 16384);

  try {
    const cleaned = cleanJsonResponse(raw);
    const result = JSON.parse(cleaned) as JourneyGenerationResult;
    return { result, raw };
  } catch (e) {
    // Retry once with explicit JSON instruction
    console.error('JSON parse failed, retrying...', e);
    const retry = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: briefText },
      { role: 'assistant', content: raw },
      { role: 'user', content: 'Your previous response was not valid JSON. Return ONLY a valid JSON object matching the schema. No markdown, no explanation.' }
    ], 16384);

    const cleaned = cleanJsonResponse(retry);
    const result = JSON.parse(cleaned) as JourneyGenerationResult;
    return { result, raw: retry };
  }
};

// ============ Single Touchpoint Regeneration ============

export const regenerateTouchpoint = async (
  journeyBrief: string,
  touchpointContext: string,
  instruction: string
): Promise<string> => {
  const systemPrompt = getPromptWithFallback('touchpointRegenerator');

  const userPrompt = `## Journey Brief
${journeyBrief}

## Current Touchpoint Context
${touchpointContext}

## Instruction
${instruction}`;

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], 2048);

  return cleanJsonResponse(result);
};

// ============ A/B Variant Generation ============

export const generateVariants = async (text: string, field: string, channel: string, count: number = 3): Promise<string[]> => {
  const systemPrompt = `You are an expert copywriter for Rapsodo Golf. Generate ${count} alternative versions of the given text.

Rules:
- Each variant must be meaningfully different in approach/angle (not just word swaps)
- Maintain Rapsodo brand voice: confident, data-informed, action-oriented
- Respect channel constraints:
  - Email subject: max 40 characters, sentence case, no emoji
  - Email preheader: max 70 characters
  - Push title: max 30 characters (Android safe)
  - Push body: max 90 characters
  - InApp title: max 50 characters
  - InApp body: max 150 characters
- Never use exclamation marks or ALL CAPS
- Return ONLY a JSON array of strings, no explanation`;

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Channel: ${channel}\nField: ${field}\nOriginal:\n"${text}"\n\nGenerate ${count} alternatives:` }
  ], 1024);

  try {
    const cleaned = cleanJsonResponse(result);
    const variants = JSON.parse(cleaned);
    if (Array.isArray(variants)) return variants.map(String);
  } catch {
    // Fallback: split by newlines and clean
    return result.split('\n').filter(l => l.trim().length > 0).slice(0, count).map(l => l.replace(/^\d+[\.\)]\s*["']?|["']?\s*$/g, ''));
  }
  return [];
};

// ============ Copy Refinement ============

export const refineCopy = async (text: string, field: string, channel: string): Promise<string> => {
  const systemPrompt = getPromptWithFallback('copyRefiner');

  const result = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Channel: ${channel}\nField: ${field}\nOriginal text:\n"${text}"\n\nRefined text:` }
  ], 512);

  return result.trim().replace(/^["']|["']$/g, '') || text;
};

// ============ Journey Analysis ============

interface AnalyzableJourney {
  name: string;
  brief: string;
  audience: string;
  goal: string;
  duration_weeks: number;
  feature_focus: string | null;
  lifecycle_stage: string | null;
}

interface AnalyzableTouchpoint {
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content: Record<string, unknown>;
  ai_reasoning: string | null;
}

export { type AnalyzableJourney, type AnalyzableTouchpoint };

// ============ Streaming Chat ============

export const chatCompletionStream = async (
  messages: ChatMessage[],
  maxTokens: number,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Journey Builder'
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, stream: true })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter Streaming Error:', response.status, errorText);
    throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch { /* skip malformed chunks */ }
      }
    }
  }
  onDone();
};

// ============ Journey Analysis ============

export const ANALYSIS_SYSTEM_PROMPT = `You are a Senior Lifecycle Marketing Strategist evaluating a Rapsodo Golf customer journey. You have deep expertise in lifecycle marketing, Iterable platform best practices, and Rapsodo Golf product data.

Evaluate the journey against three frameworks and return a structured Good/Bad/Ugly assessment.

## Framework 1: Lifecycle Manager Best Practices

**Welcome Sequence:**
- First touchpoint must be email (establishes trust, highest context channel)
- Welcome email should drive a clear first action, not just say "welcome"
- Follow-up within 24-48h for users who haven't activated

**Conversion Funnel Progression:**
- Journey should progress: Awareness → Activation → Engagement → Conversion
- Users must experience value before any conversion/upgrade messaging
- The "aha moment" must happen before pitching paid features
- For subscription products: feature discovery drives conversion, not discounts

**Re-engagement Timing:**
- 3-day dormancy: light push notification (low-commitment ask)
- 5-7 day dormancy: email with value reminder + data hook
- 14+ day dormancy: last-chance re-engagement with social proof or loss framing
- Never guilt-trip ("We miss you!") — data shows this increases churn

**Churn Prevention:**
- Single-feature dependency = high churn risk
- Journey should have condition-based decision splits, not just calendar-based sends
- Intervention touchpoints should adapt to behavioral signals

**Channel Orchestration:**
- Email → InApp → Push is the standard sequence for introducing features
- Never email + push same day on same topic
- InApp for feature discovery (highest engagement), Push for dormant users only
- Last touchpoint before conversion = email

## Framework 2: Iterable Best Practices

**Multi-Channel:**
- Minimum 2 channels; ideal is 3 (email + push + inapp)
- Channel selection should be behavioral-state-driven
- Same content should NOT be duplicated across channels — each channel has a role
- InApp should be event-triggered, not calendar-scheduled

**Personalization:**
- Merge tags ({{firstName}}, {{mlm2numSessions}}, etc.) should appear in 30%+ of touchpoints
- Dynamic content based on behavior >> generic copy
- Don't use first name in push (phone is already personal)

**Template Diversity:**
- Vary email layouts and tone across the journey
- InApp should use mix of modal/banner/fullscreen based on importance
- All modals = lazy. Banners for gentle nudges, fullscreen for milestones only

**A/B Testing Opportunities:**
- Subject lines are highest-leverage A/B test
- CTA text variations (action verb vs benefit verb)
- Flag obvious A/B testing opportunities in recommendations

**Send-Time:**
- Golfers most active 6-8pm weekdays, 8-10am weekends
- Post-session windows (within 2h) have highest engagement
- Never push before 8am or after 9pm

## Framework 3: Rapsodo-Specific Data

**Feature Adoption Order (data-driven, do NOT deviate):**
Practice Mode → Session Review → Session Insights → Courses Mode → Range Mode → Target Mode

**Conversion Multipliers (trial users only):**
- Courses Mode: 5.4x trial conversion
- Range Mode: 3.0x, +1,177% session lift
- Target Mode: 2.9x
- Video Export: 2.1x conversion signal
- Magic number: 6 features explored predicts conversion

**Channel Engagement Data:**
- InApp: 25-40% interaction (modals ~35%, banners ~12.5%)
- Push: 8-28% CTR (7-10x email)
- Email: 2-3% CTR (but essential for education)
- Deep-linked push gets 3.1x more feature activations
- 10% of users disable notifications after 1 irrelevant push/week

**Copy Rules:**
- Email subject: max 40 chars, sentence case, no exclamation marks
- Email body: 75-125 words, 2-3 paragraphs
- Push title: max 30 chars, no emoji, no first name
- Push body: max 50 ideal / 90 absolute
- InApp title: max 50 chars, InApp body: max 150 chars
- Never guilt-trip. No real golf course names (legal).

**Deep Links:**
Every push MUST have a deep link. Every InApp MUST have a buttonAction.
Available: rapsodo://practice, rapsodo://session-review, rapsodo://session-insights, rapsodo://courses, rapsodo://target-mode, rapsodo://combine, rapsodo://stats, rapsodo://export-video, rapsodo://subscription

## Scoring

Score each dimension 0-100:
- Goal Alignment (25%): Does the journey serve its stated goal?
- Channel Strategy (20%): Is channel selection state-driven and role-appropriate?
- Cadence & Timing (15%): Appropriate gaps? No fatigue risk?
- Copy Quality (15%): Within limits? On-brand? Personalized?
- Feature Progression (15%): Features in right order? Magic number pursued?
- Personalization (10%): Merge tags? Behavioral conditions?

Overall score = weighted average.

## Output Format

Return ONLY valid JSON matching this schema:

{
  "overallScore": number,
  "overallAssessment": "2-3 sentence summary",
  "goalAlignment": { "score": number, "assessment": "string", "gaps": ["string"] },
  "strengths": ["string"],
  "issues": [{ "touchpointId": number|null, "detail": "string", "severity": "warning"|"info" }],
  "criticalProblems": [{ "touchpointId": number|null, "detail": "string", "severity": "critical" }],
  "channelStrategy": { "score": number, "assessment": "string", "findings": [{ "touchpointId": number|null, "detail": "string", "severity": "critical"|"warning"|"info" }] },
  "cadenceTiming": { "score": number, "assessment": "string", "findings": [{ "touchpointId": number|null, "detail": "string", "severity": "critical"|"warning"|"info" }] },
  "copyQuality": { "score": number, "assessment": "string", "findings": [{ "touchpointId": number|null, "detail": "string", "severity": "critical"|"warning"|"info" }] },
  "featureProgression": { "score": number, "assessment": "string", "findings": [{ "touchpointId": number|null, "detail": "string", "severity": "critical"|"warning"|"info" }] },
  "recommendations": [{ "priority": "high"|"medium"|"low", "title": "string", "detail": "string", "touchpointIds": [number] }]
}

No markdown. No explanation outside JSON. touchpointId uses the sequence number (1-based).`;

export const buildAnalysisUserPrompt = (
  journey: AnalyzableJourney,
  touchpoints: AnalyzableTouchpoint[]
): string => {
  const sorted = [...touchpoints].sort((a, b) => a.sequence - b.sequence);
  const tpList = sorted.map(tp => {
    const contentLines = Object.entries(tp.content)
      .map(([k, v]) => `    ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n');
    return `### Touchpoint ${tp.sequence} — Day ${tp.day} — ${tp.channel.toUpperCase()}
  Name: ${tp.name}
  Condition: ${tp.condition || 'None'}
  AI Reasoning: ${tp.ai_reasoning || 'None'}
  Content:
${contentLines}`;
  }).join('\n\n');

  return `## Journey to Analyze

**Name:** ${journey.name}
**Audience:** ${journey.audience}
**Goal:** ${journey.goal}
**Duration:** ${journey.duration_weeks} weeks
**Feature Focus:** ${journey.feature_focus || 'None specified'}
**Lifecycle Stage:** ${journey.lifecycle_stage || 'Not specified'}
**Total Touchpoints:** ${touchpoints.length}

**Original Brief:**
${journey.brief}

## Touchpoints

${tpList}

---

Analyze this journey against all three evaluation frameworks. Return structured JSON only.`;
};

export const analyzeJourney = async (
  journey: AnalyzableJourney,
  touchpoints: AnalyzableTouchpoint[]
): Promise<{ analysis: JourneyAnalysis; raw: string }> => {
  const userPrompt = buildAnalysisUserPrompt(journey, touchpoints);

  const raw = await chatCompletion([
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ], 8192);

  try {
    const cleaned = cleanJsonResponse(raw);
    const analysis = JSON.parse(cleaned) as JourneyAnalysis;
    return { analysis, raw };
  } catch (e) {
    console.error('Analysis JSON parse failed, retrying...', e);
    const retry = await chatCompletion([
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: raw },
      { role: 'user', content: 'Your previous response was not valid JSON. Return ONLY a valid JSON object matching the schema. No markdown, no explanation.' }
    ], 8192);
    const cleaned = cleanJsonResponse(retry);
    const analysis = JSON.parse(cleaned) as JourneyAnalysis;
    return { analysis, raw: retry };
  }
};
