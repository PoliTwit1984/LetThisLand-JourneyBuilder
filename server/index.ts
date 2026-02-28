import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import express from 'express';
import cors from 'cors';

import journeysRouter from './routes/journeys.js';
import touchpointsRouter from './routes/touchpoints.js';
import aiRouter from './routes/ai.js';
import previewRouter from './routes/preview.js';
import wiringGuideRouter from './routes/wiringGuide.js';
import exportRouter from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/journeys', journeysRouter);
app.use('/api/touchpoints', touchpointsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/preview', previewRouter);
app.use('/api/wiring-guide', wiringGuideRouter);
app.use('/api/export', exportRouter);

// Static public files (best-practices page, etc.)
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Production static files
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
