import { Router } from 'express';
import { getTouchpoints, getTouchpoint, updateTouchpoint, deleteTouchpoint, updateJourney, reorderTouchpoints } from '../db.js';
import { validateTouchpointUpdate } from '../validation.js';

const router = Router();

// Get touchpoints for a journey
router.get('/journey/:journeyId', (req, res) => {
  const touchpoints = getTouchpoints(req.params.journeyId).map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));
  res.json(touchpoints);
});

// Get single touchpoint
router.get('/:id', (req, res) => {
  const tp = getTouchpoint(req.params.id);
  if (!tp) return res.status(404).json({ error: 'Touchpoint not found' });
  res.json({ ...tp, content: JSON.parse(tp.content) });
});

// Update touchpoint
router.put('/:id', (req, res) => {
  const { clean, errors } = validateTouchpointUpdate(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const success = updateTouchpoint(req.params.id, clean);
  if (!success) return res.status(404).json({ error: 'Touchpoint not found' });

  const tp = getTouchpoint(req.params.id);
  res.json({ ...tp, content: JSON.parse(tp!.content) });
});

// Batch reorder touchpoints (sequence + day) — atomic transaction
router.post('/reorder', (req, res) => {
  const { items } = req.body as { items: Array<{ id: string; sequence: number; day: number }> };
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required with {id, sequence, day}' });
  }

  // Validate each item before touching DB
  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') {
      return res.status(400).json({ error: `Invalid id in reorder item` });
    }
    if (typeof item.sequence !== 'number' || typeof item.day !== 'number' || item.day < 0) {
      return res.status(400).json({ error: `Invalid sequence/day for touchpoint ${item.id}` });
    }
  }

  try {
    reorderTouchpoints(items);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }

  // Return updated touchpoints for the journey — derive journeyId from first item
  const first = getTouchpoint(items[0].id);
  if (!first) return res.status(404).json({ error: 'Touchpoint not found after reorder' });
  const all = getTouchpoints(first.journey_id).map(tp => ({
    ...tp,
    content: JSON.parse(tp.content),
  }));
  res.json(all);
});

// Delete touchpoint
router.delete('/:id', (req, res) => {
  const tp = getTouchpoint(req.params.id);
  if (!tp) return res.status(404).json({ error: 'Touchpoint not found' });

  deleteTouchpoint(req.params.id);

  // Update touchpoint count
  const remaining = getTouchpoints(tp.journey_id);
  updateJourney(tp.journey_id, { touchpoint_count: remaining.length });

  res.json({ deleted: true });
});

export default router;
