const API = '/api';

const json = async (url: string, opts?: RequestInit) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// Journeys
export const listJourneys = () => json(`${API}/journeys`);
export const getJourney = (id: string) => json(`${API}/journeys/${id}`);
export const deleteJourney = (id: string) => json(`${API}/journeys/${id}`, { method: 'DELETE' });
export const cloneJourney = (id: string) => json(`${API}/journeys/${id}/clone`, { method: 'POST' });

// AI
export const generateJourney = (brief: {
  audience: string; goal: string; durationWeeks: number;
  featureFocus?: string; lifecycleStage?: string; additionalContext?: string;
}) => json(`${API}/ai/generate-journey`, { method: 'POST', body: JSON.stringify(brief) });

export const regenerateTouchpoint = (touchpointId: string, journeyId: string, instruction?: string) =>
  json(`${API}/ai/regenerate-touchpoint`, {
    method: 'POST',
    body: JSON.stringify({ touchpointId, journeyId, instruction })
  });

export const refineCopy = (text: string, field: string, channel: string) =>
  json(`${API}/ai/refine-copy`, { method: 'POST', body: JSON.stringify({ text, field, channel }) });

export const generateVariants = (text: string, field: string, channel: string, count?: number) =>
  json(`${API}/ai/generate-variants`, { method: 'POST', body: JSON.stringify({ text, field, channel, count }) });

export const analyzeJourney = (journeyId: string) =>
  json(`${API}/ai/analyze-journey`, { method: 'POST', body: JSON.stringify({ journeyId }) });

// Streaming chat — returns raw Response for SSE reading
export const chatStream = (body: {
  journeyId: string;
  touchpointSequences: number[];
  analysisDetail: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<Response> =>
  fetch(`${API}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

// Touchpoints
export const updateTouchpoint = (id: string, updates: Record<string, unknown>) =>
  json(`${API}/touchpoints/${id}`, { method: 'PUT', body: JSON.stringify(updates) });

export const deleteTouchpoint = (id: string) =>
  json(`${API}/touchpoints/${id}`, { method: 'DELETE' });

export const reorderTouchpoints = (items: Array<{ id: string; sequence: number; day: number }>) =>
  json(`${API}/touchpoints/reorder`, { method: 'POST', body: JSON.stringify({ items }) });

// Preview URL (for iframes) — optionally with sample data for Handlebars
export const previewUrl = (id: string, sampleData?: Record<string, string>) => {
  const base = `${API}/preview/${id}`;
  if (sampleData && Object.keys(sampleData).length > 0) {
    return `${base}?sampleData=${encodeURIComponent(JSON.stringify(sampleData))}`;
  }
  return base;
};

// Wiring guide URL (opens in new tab)
export const wiringGuideUrl = (journeyId: string) => `${API}/wiring-guide/${journeyId}`;

// Export assets URL (opens in new tab)
export const exportUrl = (journeyId: string) => `${API}/export/${journeyId}/all`;

// Download all assets as ZIP
export const exportZipUrl = (journeyId: string) => `${API}/export/${journeyId}/zip`;
