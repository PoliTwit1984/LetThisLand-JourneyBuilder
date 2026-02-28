import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getAllJourneys, getJourney, createJourney, updateJourney, deleteJourney, getTouchpoints, createTouchpoints } from '../db.js';

const router = Router();

// List all journeys
router.get('/', (req, res) => {
  const journeys = getAllJourneys();
  res.json(journeys);
});

// Get journey with touchpoints
router.get('/:id', (req, res) => {
  const journey = getJourney(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const touchpoints = getTouchpoints(journey.id).map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));

  res.json({ ...journey, touchpoints });
});

// Create journey
router.post('/', (req, res) => {
  const { name, brief, audience, goal, durationWeeks, featureFocus, lifecycleStage } = req.body;
  if (!audience || !goal || !durationWeeks) {
    return res.status(400).json({ error: 'audience, goal, and durationWeeks are required' });
  }

  const id = uuid();
  createJourney({
    id,
    name: name || `${audience} — ${goal}`,
    brief: brief || `${audience}: ${goal}`,
    audience, goal,
    durationWeeks,
    featureFocus,
    lifecycleStage,
  });

  const journey = getJourney(id);
  res.status(201).json(journey);
});

// Update journey
router.put('/:id', (req, res) => {
  const success = updateJourney(req.params.id, req.body);
  if (!success) return res.status(404).json({ error: 'Journey not found' });
  res.json(getJourney(req.params.id));
});

// Clone journey
router.post('/:id/clone', (req, res) => {
  const source = getJourney(req.params.id);
  if (!source) return res.status(404).json({ error: 'Journey not found' });

  const sourceTouchpoints = getTouchpoints(source.id);
  const newId = uuid();

  createJourney({
    id: newId,
    name: `${source.name} (Copy)`,
    brief: source.brief,
    audience: source.audience,
    goal: source.goal,
    durationWeeks: source.duration_weeks,
    featureFocus: source.feature_focus || undefined,
    lifecycleStage: source.lifecycle_stage || undefined,
  });

  if (sourceTouchpoints.length > 0) {
    createTouchpoints(sourceTouchpoints.map(tp => ({
      id: uuid(),
      journeyId: newId,
      sequence: tp.sequence,
      day: tp.day,
      channel: tp.channel,
      name: tp.name,
      condition: tp.condition || '',
      content: tp.content,
      reasoning: tp.ai_reasoning || '',
    })));
    updateJourney(newId, { touchpoint_count: sourceTouchpoints.length });
  }

  const cloned = getJourney(newId);
  const touchpoints = getTouchpoints(newId).map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));
  res.status(201).json({ ...cloned, touchpoints });
});

// Delete journey
router.delete('/:id', (req, res) => {
  const success = deleteJourney(req.params.id);
  if (!success) return res.status(404).json({ error: 'Journey not found' });
  res.json({ deleted: true });
});

export default router;
