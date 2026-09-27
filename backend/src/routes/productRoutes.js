import express from 'express';
import { productService } from '../services/productService.js';

export const productRouter = express.Router();

/**
 * Search the mock store catalog
 */
productRouter.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await productService.search(q);
    res.json(results);
  } catch (err) {
    console.error('Error in /search:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Fetch product options and details from direct URL
 */
productRouter.get('/details', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL parameter is required.' });
    const details = await productService.getDetails(url);
    res.json(details);
  } catch (err) {
    console.error('Error in /details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all actively tracked products with latest status
 */
productRouter.get('/tracked', async (req, res) => {
  try {
    const tracked = await productService.getTrackedProducts();
    res.json(tracked);
  } catch (err) {
    console.error('Error in /tracked:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Add a product to tracking + trigger initial scrape
 */
productRouter.post('/track', async (req, res) => {
  try {
    const { storeProductId, productUrl, productName, selectedOption, imageUrl } = req.body;
    if (!storeProductId || !productUrl || !productName || !selectedOption) {
      return res.status(400).json({ error: 'Missing required product parameters.' });
    }

    const result = await productService.trackProduct({
      storeProductId,
      productUrl,
      productName,
      selectedOption,
      imageUrl
    });

    res.status(201).json(result);
  } catch (err) {
    console.error('Error in /track:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Untrack / remove a product
 */
productRouter.delete('/track/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productService.untrackProduct(id);
    res.json(result);
  } catch (err) {
    console.error('Error in DELETE /track/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get historical price records and full audit logs for a product
 */
productRouter.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await productService.getProductHistory(id);
    res.json(history);
  } catch (err) {
    console.error('Error in /:id/history:', err);
    res.status(500).json({ error: err.message });
  }
});
