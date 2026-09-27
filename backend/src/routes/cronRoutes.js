import express from 'express';
import { cronService } from '../services/cronService.js';
import dotenv from 'dotenv';

dotenv.config();

export const cronRouter = express.Router();

/**
 * Scheduled trigger endpoint invoked by cron-job.org every 2 hours.
 * Protected by CRON_SECRET authorization header.
 */
cronRouter.post('/scrape', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const expectedSecret = process.env.CRON_SECRET;

  // Verify Bearer token or secret query parameter
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.query.secret;

  if (expectedSecret && token !== expectedSecret) {
    console.warn('[Cron Auth] Unauthorized trigger attempt with invalid token.');
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing cron secret.' });
  }

  try {
    const result = await cronService.runScheduledScrapes();
    res.json({
      status: 'ok',
      total: result.total,
      successful: result.successful,
      retried: result.retried,
      failed: result.failed,
      durationMs: result.durationMs
    });
  } catch (err) {
    console.error('[Cron Execution Error]:', err);
    res.status(500).json({ error: err.message });
  }
});
