import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { generateJourney, regenerateTouchpoint, refineCopy, generateVariants, analyzeJourney, chatCompletionStream, ANALYSIS_SYSTEM_PROMPT, buildAnalysisUserPrompt } from '../claude.js';
import { createJourney, createTouchpoints, getJourney, getTouchpoints, getTouchpoint, updateJourney, updateTouchpoint as updateTouchpointDb, saveGeneration } from '../db.js';
import { validateAIOutput, validateTouchpointUpdate, isValidChannel, sanitizeUrl, VALID_CHANNELS } from '../validation.js';

const router = Router();

// Generate full journey from brief
router.post('/generate-journey', async (req, res) => {
  const { audience, goal, durationWeeks, featureFocus, lifecycleStage, additionalContext } = req.body;

  if (!audience || !goal || !durationWeeks) {
    return res.status(400).json({ error: 'audience, goal, and durationWeeks are required' });
  }

  // Build brief text for the AI
  let briefText = `## Journey Brief

**Audience:** ${audience}
**Goal:** ${goal}
**Duration:** ${durationWeeks} weeks (${durationWeeks * 7} days)`;

  if (featureFocus) briefText += `\n**Feature Focus:** ${featureFocus}`;
  if (lifecycleStage) briefText += `\n**Lifecycle Stage:** ${lifecycleStage}`;
  if (additionalContext) briefText += `\n**Additional Context:** ${additionalContext}`;

  try {
    console.log('Generating journey...', { audience, goal, durationWeeks });
    const { result, raw } = await generateJourney(briefText);

    // Validate AI output — strips SMS, validates channels, sanitizes URLs
    const { data: validated, errors: validationErrors } = validateAIOutput(result);
    if (validationErrors.length > 0) {
      console.warn('AI output validation warnings:', validationErrors);
    }
    if (validated.touchpoints.length === 0) {
      return res.status(422).json({ error: 'AI generated no valid touchpoints', validationErrors });
    }

    // Create journey in DB
    const journeyId = uuid();
    createJourney({
      id: journeyId,
      name: validated.journeyName || `${audience} — ${goal}`,
      brief: briefText,
      audience, goal,
      durationWeeks,
      featureFocus,
      lifecycleStage,
    });

    // Create touchpoints
    const tpRows = validated.touchpoints.map(tp => ({
      id: uuid(),
      journeyId,
      sequence: tp.sequence,
      day: tp.day,
      channel: tp.channel,
      name: tp.name,
      condition: tp.condition || '',
      content: JSON.stringify(tp.content),
      reasoning: tp.reasoning || '',
    }));

    createTouchpoints(tpRows);
    updateJourney(journeyId, { touchpoint_count: tpRows.length });

    // Save generation for audit
    saveGeneration({ id: uuid(), journeyId, rawResponse: raw, model: 'anthropic/claude-opus-4' });

    // Return full journey
    const journey = getJourney(journeyId);
    const touchpoints = getTouchpoints(journeyId).map(tp => ({
      ...tp,
      content: JSON.parse(tp.content),
    }));

    console.log(`Journey generated: ${validated.journeyName} — ${tpRows.length} touchpoints`);
    res.json({ ...journey, touchpoints, _validationWarnings: validationErrors.length > 0 ? validationErrors : undefined });
  } catch (e) {
    console.error('Journey generation failed:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// Regenerate a single touchpoint
router.post('/regenerate-touchpoint', async (req, res) => {
  const { touchpointId, journeyId, instruction } = req.body;

  try {
    const journey = getJourney(journeyId);
    if (!journey) return res.status(404).json({ error: 'Journey not found' });

    const touchpoints = getTouchpoints(journeyId);
    const currentTp = touchpoints.find(tp => tp.id === touchpointId);
    if (!currentTp) return res.status(404).json({ error: 'Touchpoint not found' });

    const adjacentContext = touchpoints
      .filter(tp => Math.abs(tp.sequence - currentTp.sequence) <= 2 && tp.id !== touchpointId)
      .map(tp => `Day ${tp.day}: ${tp.channel} — ${tp.name} (${tp.condition})`)
      .join('\n');

    const tpContext = `Current touchpoint: Sequence ${currentTp.sequence}, Day ${currentTp.day}, Channel: ${currentTp.channel}, Name: ${currentTp.name}
Condition: ${currentTp.condition}
Current content: ${currentTp.content}

Adjacent touchpoints:
${adjacentContext}`;

    const resultJson = await regenerateTouchpoint(journey.brief, tpContext, instruction || 'Regenerate this touchpoint');
    const parsed = JSON.parse(resultJson);

    // Validate AI output before saving — enforce channel constraints, sanitize URLs
    const updatePayload: Record<string, unknown> = {};

    if (parsed.channel) {
      if ((VALID_CHANNELS as readonly string[]).includes(parsed.channel)) {
        updatePayload.channel = parsed.channel;
      } else {
        // Reject invalid channels (SMS, unknown) — keep original
        console.warn(`Regeneration returned invalid channel "${parsed.channel}" — keeping original`);
      }
    }

    if (parsed.content && typeof parsed.content === 'object') {
      // Run through validateTouchpointUpdate to sanitize URLs in content
      const channel = (updatePayload.channel as string) || currentTp.channel;
      const { clean } = validateTouchpointUpdate({ content: parsed.content, channel });
      if (clean.content) updatePayload.content = clean.content;
    }

    if (parsed.name && typeof parsed.name === 'string') updatePayload.name = parsed.name;
    if (parsed.condition !== undefined) updatePayload.condition = typeof parsed.condition === 'string' ? parsed.condition : '';
    if (parsed.reasoning) updatePayload.ai_reasoning = parsed.reasoning;

    if (Object.keys(updatePayload).length > 0) {
      updateTouchpointDb(touchpointId, updatePayload);
    }

    // Return full touchpoint with parsed content
    const updated = getTouchpoint(touchpointId);
    if (updated) {
      res.json({ ...updated, content: JSON.parse(updated.content) });
    } else {
      res.json(parsed);
    }
  } catch (e) {
    console.error('Touchpoint regeneration failed:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// Refine copy for a field
router.post('/refine-copy', async (req, res) => {
  const { text, field, channel } = req.body;
  if (!text || !field) return res.status(400).json({ error: 'text and field are required' });

  try {
    const refined = await refineCopy(text, field, channel || 'email');
    res.json({ refined });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Generate A/B variants for a text field
router.post('/generate-variants', async (req, res) => {
  const { text, field, channel, count } = req.body;
  if (!text || !field) return res.status(400).json({ error: 'text and field are required' });

  try {
    const variants = await generateVariants(text, field, channel || 'email', count || 3);
    res.json({ variants });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Analyze a journey — AI-powered evaluation against best practices
router.post('/analyze-journey', async (req, res) => {
  const { journeyId } = req.body;

  if (!journeyId) {
    return res.status(400).json({ error: 'journeyId is required' });
  }

  try {
    const journey = getJourney(journeyId);
    if (!journey) return res.status(404).json({ error: 'Journey not found' });

    const touchpointRows = getTouchpoints(journeyId);
    if (touchpointRows.length === 0) {
      return res.status(422).json({ error: 'Journey has no touchpoints to analyze' });
    }

    const touchpoints = touchpointRows.map(tp => ({
      sequence: tp.sequence,
      day: tp.day,
      channel: tp.channel,
      name: tp.name,
      condition: tp.condition,
      content: JSON.parse(tp.content),
      ai_reasoning: tp.ai_reasoning,
    }));

    console.log(`Analyzing journey: ${journey.name} (${touchpoints.length} touchpoints)`);
    const { analysis, raw } = await analyzeJourney(journey, touchpoints);

    // Save generation for audit trail
    saveGeneration({ id: uuid(), journeyId, rawResponse: raw, model: 'anthropic/claude-opus-4' });

    console.log(`Analysis complete: score ${analysis.overallScore}`);
    res.json(analysis);
  } catch (e) {
    console.error('Journey analysis failed:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// Streaming chat about an analysis finding
router.post('/chat', async (req, res) => {
  const { journeyId, touchpointSequences, analysisDetail, messages } = req.body;

  if (!journeyId || !analysisDetail) {
    return res.status(400).json({ error: 'journeyId and analysisDetail are required' });
  }

  try {
    const journey = getJourney(journeyId);
    if (!journey) return res.status(404).json({ error: 'Journey not found' });

    const touchpointRows = getTouchpoints(journeyId);
    const touchpoints = touchpointRows.map(tp => ({
      sequence: tp.sequence,
      day: tp.day,
      channel: tp.channel,
      name: tp.name,
      condition: tp.condition,
      content: JSON.parse(tp.content),
      ai_reasoning: tp.ai_reasoning,
    }));

    // Build chat system prompt: conversational instructions + full analysis frameworks
    const chatPrefix = `You are having a conversation with a lifecycle marketing director about fixing a specific finding in a journey analysis. You have full context of the journey, all touchpoints, and evaluation frameworks.

Your role:
- Discuss the finding and help the user understand the issue
- Suggest specific, actionable changes (reference touchpoint numbers, actual copy, and specific data)
- If the user proposes an approach, evaluate it against best practices
- When recommending a fix, describe exactly what should change (new copy, new timing, new channel, etc.)
- Your final recommendation should be concrete enough to directly regenerate the touchpoint
- Be direct and concise — 2-4 paragraphs max unless the user asks for more detail
- Respond in natural conversational text with markdown formatting. NO JSON.

`;

    // Strip the JSON output format section from analysis prompt (not needed for chat)
    const frameworksOnly = ANALYSIS_SYSTEM_PROMPT.replace(/## Output Format[\s\S]*$/, '').trim();
    const systemPrompt = chatPrefix + frameworksOnly;

    // Build the journey context as an initial user message
    const journeyContext = buildAnalysisUserPrompt(journey, touchpoints)
      .replace(/---\s*\nAnalyze this journey.*$/, '') // strip the "analyze" instruction
      .trim();

    const seqList = (touchpointSequences || []).map((s: number) => `#${s}`).join(', ');
    const contextMessage = `${journeyContext}\n\n---\n\n**Finding to discuss:** ${analysisDetail}\n**Affected touchpoints:** ${seqList || 'General'}\n\nWhat do you recommend?`;

    // Assemble full message array
    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextMessage },
    ];

    // Append conversation history
    if (messages && Array.isArray(messages)) {
      for (const msg of messages) {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    console.log(`Chat stream: ${journey.name} — finding: ${analysisDetail.slice(0, 80)}...`);

    await chatCompletionStream(
      chatMessages,
      2048,
      (delta) => {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      },
      () => {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    );
  } catch (e) {
    console.error('Chat stream failed:', e);
    // If headers already sent, try to send error in SSE format
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: (e as Error).message });
    }
  }
});

export default router;
