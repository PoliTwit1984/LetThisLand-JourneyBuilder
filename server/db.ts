import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Verify FK enforcement is active
const fkCheck = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
if (!fkCheck[0] || fkCheck[0].foreign_keys !== 1) {
  throw new Error('FATAL: SQLite foreign_keys pragma failed to enable. Data integrity is not guaranteed.');
}

// ============ Schema ============

const initSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS journeys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brief TEXT NOT NULL,
      audience TEXT NOT NULL,
      goal TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL,
      feature_focus TEXT,
      lifecycle_stage TEXT,
      touchpoint_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS touchpoints (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      day INTEGER NOT NULL,
      channel TEXT NOT NULL,
      name TEXT NOT NULL,
      condition TEXT,
      content TEXT NOT NULL,
      ai_reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      journey_id TEXT NOT NULL,
      raw_response TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prompts (
      key TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_touchpoints_journey ON touchpoints(journey_id, sequence);
    CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);
  `);
};

initSchema();

// ============ Journeys ============

export interface JourneyRow {
  id: string;
  name: string;
  brief: string;
  audience: string;
  goal: string;
  duration_weeks: number;
  feature_focus: string | null;
  lifecycle_stage: string | null;
  touchpoint_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const getAllJourneys = (): JourneyRow[] => {
  return db.prepare(
    'SELECT * FROM journeys ORDER BY updated_at DESC'
  ).all() as JourneyRow[];
};

export const getJourney = (id: string): JourneyRow | null => {
  return (db.prepare('SELECT * FROM journeys WHERE id = ?').get(id) as JourneyRow) || null;
};

export const createJourney = (j: {
  id: string; name: string; brief: string; audience: string; goal: string;
  durationWeeks: number; featureFocus?: string; lifecycleStage?: string;
}): void => {
  db.prepare(`
    INSERT INTO journeys (id, name, brief, audience, goal, duration_weeks, feature_focus, lifecycle_stage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(j.id, j.name, j.brief, j.audience, j.goal, j.durationWeeks, j.featureFocus || null, j.lifecycleStage || null);
};

export const updateJourney = (id: string, updates: Record<string, unknown>): boolean => {
  const allowed = ['name', 'brief', 'audience', 'goal', 'duration_weeks', 'feature_focus', 'lifecycle_stage', 'touchpoint_count', 'status'];
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (sets.length === 0) return false;
  sets.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(id);
  const result = db.prepare(`UPDATE journeys SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return result.changes > 0;
};

export const deleteJourney = (id: string): boolean => {
  const result = db.prepare('DELETE FROM journeys WHERE id = ?').run(id);
  return result.changes > 0;
};

// ============ Touchpoints ============

export interface TouchpointRow {
  id: string;
  journey_id: string;
  sequence: number;
  day: number;
  channel: string;
  name: string;
  condition: string | null;
  content: string;
  ai_reasoning: string | null;
  created_at: string;
  updated_at: string;
}

export const getTouchpoints = (journeyId: string): TouchpointRow[] => {
  return db.prepare(
    'SELECT * FROM touchpoints WHERE journey_id = ? ORDER BY sequence'
  ).all(journeyId) as TouchpointRow[];
};

export const getTouchpoint = (id: string): TouchpointRow | null => {
  return (db.prepare('SELECT * FROM touchpoints WHERE id = ?').get(id) as TouchpointRow) || null;
};

export const createTouchpoints = (touchpoints: Array<{
  id: string; journeyId: string; sequence: number; day: number;
  channel: string; name: string; condition: string;
  content: string; reasoning: string;
}>): void => {
  const insert = db.prepare(`
    INSERT INTO touchpoints (id, journey_id, sequence, day, channel, name, condition, content, ai_reasoning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((items: typeof touchpoints) => {
    for (const tp of items) {
      insert.run(tp.id, tp.journeyId, tp.sequence, tp.day, tp.channel, tp.name, tp.condition, tp.content, tp.reasoning);
    }
  });
  tx(touchpoints);
};

export const updateTouchpoint = (id: string, updates: Record<string, unknown>): boolean => {
  const allowed = ['sequence', 'day', 'channel', 'name', 'condition', 'content', 'ai_reasoning'];
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (sets.length === 0) return false;
  sets.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(id);
  const result = db.prepare(`UPDATE touchpoints SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return result.changes > 0;
};

export const deleteTouchpoint = (id: string): boolean => {
  const result = db.prepare('DELETE FROM touchpoints WHERE id = ?').run(id);
  return result.changes > 0;
};

export const reorderTouchpoints = (items: Array<{ id: string; sequence: number; day: number }>): void => {
  const stmt = db.prepare('UPDATE touchpoints SET sequence = ?, day = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const tx = db.transaction((rows: typeof items) => {
    for (const item of rows) {
      if (typeof item.sequence !== 'number' || typeof item.day !== 'number' || item.day < 0) {
        throw new Error(`Invalid reorder data for touchpoint ${item.id}`);
      }
      const result = stmt.run(item.sequence, item.day, item.id);
      if (result.changes === 0) throw new Error(`Touchpoint ${item.id} not found`);
    }
  });
  tx(items);
};

export const replaceTouchpoints = (journeyId: string, touchpoints: Array<{
  id: string; journeyId: string; sequence: number; day: number;
  channel: string; name: string; condition: string;
  content: string; reasoning: string;
}>): void => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM touchpoints WHERE journey_id = ?').run(journeyId);
    const insert = db.prepare(`
      INSERT INTO touchpoints (id, journey_id, sequence, day, channel, name, condition, content, ai_reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const tp of touchpoints) {
      insert.run(tp.id, tp.journeyId, tp.sequence, tp.day, tp.channel, tp.name, tp.condition, tp.content, tp.reasoning);
    }
  });
  tx();
};

// ============ Generations ============

export const saveGeneration = (gen: { id: string; journeyId: string; rawResponse: string; model: string }): void => {
  db.prepare(`
    INSERT INTO generations (id, journey_id, raw_response, model)
    VALUES (?, ?, ?, ?)
  `).run(gen.id, gen.journeyId, gen.rawResponse, gen.model);
};

// ============ Prompts ============

export const getPrompt = (key: string): string | null => {
  const row = db.prepare('SELECT content FROM prompts WHERE key = ?').get(key) as { content: string } | undefined;
  return row?.content || null;
};

export const setPrompt = (key: string, content: string): void => {
  db.prepare(`
    INSERT INTO prompts (key, content, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET content = ?, updated_at = CURRENT_TIMESTAMP
  `).run(key, content, content);
};

export default db;
