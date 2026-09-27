import express from 'express';
import { csvExportService } from '../services/csvExportService.js';

export const exportRouter = express.Router();

/**
 * Downloads full historical scrape attempt logs as a standardized CSV file.
 */
exportRouter.get('/csv', async (req, res) => {
  try {
    const csvContent = await csvExportService.generateHistoryCSV();
    const filename = `scrape_history_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error generating CSV export:', err);
    res.status(500).json({ error: err.message });
  }
});
