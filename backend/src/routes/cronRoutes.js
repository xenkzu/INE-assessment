import express from 'express';
import { cronService } from '../services/cronService.js';
import dotenv from 'dotenv';

dotenv.config();

export const cronRouter = express.Router();

/**
 * Scheduled trigger endpoint invoked by cron-job.org every 2 hours.
 * Accepts both GET and POST requests.
 * Protected by CRON_SECRET authorization header or ?secret= query parameter.
 * 
 * Returns 200 OK immediately (<50ms) to satisfy cron-job timeout limits,
 * while executing Playwright scraping batch asynchronously in the background.
 */
cronRouter.all('/scrape', (req, res) => {
  const authHeader = req.headers['authorization'];
  const expectedSecret = process.env.CRON_SECRET;

  // Verify Bearer token or secret query parameter
  const token = authHeader ? authHeader.replace('Bearer ', '').trim() : req.query.secret;

  if (expectedSecret && token !== expectedSecret) {
    console.warn('[Cron Auth] Unauthorized trigger attempt with invalid token.');
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing cron secret.' });
  }

  // Check if a batch is already currently executing
  if (cronService.isBusy()) {
    return res.status(200).json({
      status: 'busy',
      message: 'A batch scrape job is already in progress.',
      timestamp: new Date().toISOString()
    });
  }

  // Launch background scrape execution asynchronously
  cronService.runScheduledScrapes().catch((err) => {
    console.error('[Background Scheduled Scrape Error]:', err);
  });

  // Immediately return lightweight 200 OK to prevent cron-job.org 30s timeout
  return res.status(200).json({
    status: 'ok',
    message: 'Scheduled scrape job triggered and executing in background.',
    timestamp: new Date().toISOString()
  });
});
