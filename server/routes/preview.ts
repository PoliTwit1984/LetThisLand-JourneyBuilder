import { Router } from 'express';
import { getTouchpoint } from '../db.js';
import { generateEmailHtml } from '../../utils/emailGenerator.js';
import { generatePushHtml } from '../../utils/pushGenerator.js';
import { generateInAppHtml } from '../../utils/inAppGenerator.js';
import type { EmailContent, PushContent, InAppContent } from '../../types.js';

const router = Router();

// Render preview HTML for any channel
router.get('/:id', (req, res) => {
  const tp = getTouchpoint(req.params.id);
  if (!tp) return res.status(404).json({ error: 'Touchpoint not found' });

  const content = JSON.parse(tp.content);
  let html: string;

  switch (tp.channel) {
    case 'email':
      html = generateEmailHtml(content as EmailContent);
      break;
    case 'push':
      html = generatePushHtml(content as PushContent);
      break;
    case 'inapp':
      html = generateInAppHtml(content as InAppContent);
      break;
    default:
      return res.status(400).json({ error: `Unsupported channel: ${tp.channel}` });
  }

  // Substitute Handlebars merge tags with sample data if provided
  const sampleData = req.query.sampleData as string | undefined;
  if (sampleData) {
    try {
      // Express already decodes query params — no decodeURIComponent needed
      const data = JSON.parse(sampleData) as Record<string, string>;
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          // Escape HTML entities in substitution values to prevent XSS
          const escaped = value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          html = html.replace(new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), escaped);
        }
      }
    } catch {
      // Invalid sample data — render without substitution
    }
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
