import dotenv from 'dotenv';

dotenv.config();
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Price Tracker Backend API listening on port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
});
