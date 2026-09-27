import express from 'express';
import cors from 'cors';
import { productRouter } from './routes/productRoutes.js';
import { cronRouter } from './routes/cronRoutes.js';
import { exportRouter } from './routes/exportRoutes.js';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (for Render / uptime monitors)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/products', productRouter);
app.use('/api/cron', cronRouter);
app.use('/api/export', exportRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});
