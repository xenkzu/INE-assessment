import { supabase } from '../config/supabase.js';
import { scrapeProductVariant } from '../scraper/engine.js';

let isScrapeRunning = false;

export const cronService = {
  /**
   * Check if a scrape job is currently executing
   */
  isBusy() {
    return isScrapeRunning;
  },

  /**
   * Executes scheduled scrape for all actively tracked products.
   */
  async runScheduledScrapes() {
    if (isScrapeRunning) {
      console.log('[Cron] Scrape cycle already in progress. Skipping duplicate run.');
      return { status: 'skipped', reason: 'already_running' };
    }

    isScrapeRunning = true;
    console.log('[Cron] Starting scheduled batch scrape cycle...');
    const startTime = Date.now();

    try {
      // 1. Fetch all active tracked products
      const { data: products, error } = await supabase
        .from('tracked_products')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (!products || products.length === 0) {
        console.log('[Cron] No active products found to scrape.');
        return { total: 0, successful: 0, retried: 0, failed: 0, durationMs: Date.now() - startTime };
      }

      console.log(`[Cron] Found ${products.length} active products to scrape.`);

      let successful = 0;
      let retried = 0;
      let failed = 0;
      const summaries = [];

      // 2. Sequential scrape with polite 1.5s intervals between products
      for (const prod of products) {
        console.log(`[Cron] Scraping product ${prod.store_product_id} (${prod.selected_option})...`);

        const result = await scrapeProductVariant({
          url: prod.product_url,
          option: prod.selected_option
        });

        if (result.outcome === 'success') successful++;
        else if (result.outcome === 'retried') retried++;
        else failed++;

        // 3. Log attempt
        await supabase.from('scrape_logs').insert({
          product_id: prod.id,
          store_product_id: prod.store_product_id,
          product_name: prod.product_name,
          selected_option: prod.selected_option,
          timestamp: new Date().toISOString(),
          price: result.price,
          stock: result.stock,
          outcome: result.outcome,
          retry_count: result.retryCount,
          error_message: result.errorMessage,
          duration_ms: result.durationMs
        });

        // 4. Update price_history if not failed
        if (result.price !== null) {
          await supabase.from('price_history').insert({
            product_id: prod.id,
            price: result.price,
            stock: result.stock || 'In Stock',
            recorded_at: new Date().toISOString()
          });
        }

        summaries.push({
          storeProductId: prod.store_product_id,
          productName: prod.product_name,
          selectedOption: prod.selected_option,
          outcome: result.outcome,
          price: result.price,
          stock: result.stock,
          retryCount: result.retryCount
        });

        // Polite pause between requests to prevent storefront throttling
        await new Promise((res) => setTimeout(res, 1500));
      }

      const durationMs = Date.now() - startTime;
      console.log(`[Cron] Batch scrape cycle finished in ${(durationMs / 1000).toFixed(2)}s: ${successful} success, ${retried} retried, ${failed} failed.`);

      return {
        total: products.length,
        successful,
        retried,
        failed,
        durationMs
      };
    } finally {
      isScrapeRunning = false;
    }
  }
};
