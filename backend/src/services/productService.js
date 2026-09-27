import { supabase } from '../config/supabase.js';
import { scrapeProductVariant } from '../scraper/engine.js';
import { searchCatalog, fetchProductDetails } from '../scraper/catalog.js';

export const productService = {
  /**
   * Searches the store catalog by title/brand/category.
   */
  async search(query) {
    return await searchCatalog(query);
  },

  /**
   * Fetches full details and options for a specific product URL.
   */
  async getDetails(url) {
    return await fetchProductDetails(url);
  },

  /**
   * Returns all active tracked products with their latest price, stock, and scrape status.
   */
  async getTrackedProducts() {
    const { data: products, error } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enhance each product with latest price from price_history and last log from scrape_logs
    const enhanced = await Promise.all(
      products.map(async (prod) => {
        // Get latest price
        const { data: latestPriceRecord } = await supabase
          .from('price_history')
          .select('price, stock, recorded_at')
          .eq('product_id', prod.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get latest scrape log
        const { data: lastLog } = await supabase
          .from('scrape_logs')
          .select('outcome, retry_count, timestamp, error_message')
          .eq('product_id', prod.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...prod,
          latestPrice: latestPriceRecord ? latestPriceRecord.price : null,
          latestStock: latestPriceRecord ? latestPriceRecord.stock : null,
          lastScrapedAt: lastLog ? lastLog.timestamp : null,
          lastOutcome: lastLog ? lastLog.outcome : 'pending'
        };
      })
    );

    return enhanced;
  },

  /**
   * Adds a product variant to tracking and immediately performs an initial scrape.
   */
  async trackProduct({ storeProductId, productUrl, productName, selectedOption, imageUrl }) {
    // 1. Insert into tracked_products (or fetch if already exists)
    const { data: product, error: insertError } = await supabase
      .from('tracked_products')
      .upsert(
        {
          store_product_id: storeProductId,
          product_url: productUrl,
          product_name: productName,
          selected_option: selectedOption,
          image_url: imageUrl || null,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'store_product_id, selected_option' }
      )
      .select()
      .single();

    // 2. Perform initial scrape asynchronously in the background so frontend updates immediately
    (async () => {
      try {
        console.log(`[Tracking] Initiating background initial scrape for product ${storeProductId} (${selectedOption})...`);
        const scrapeResult = await scrapeProductVariant({
          url: productUrl,
          option: selectedOption
        });

        // 3. Log scrape attempt
        await supabase.from('scrape_logs').insert({
          product_id: product.id,
          store_product_id: storeProductId,
          product_name: productName,
          selected_option: selectedOption,
          timestamp: new Date().toISOString(),
          price: scrapeResult.price,
          stock: scrapeResult.stock,
          outcome: scrapeResult.outcome,
          retry_count: scrapeResult.retryCount,
          error_message: scrapeResult.errorMessage,
          duration_ms: scrapeResult.durationMs
        });

        // 4. Record in price_history if successful or retried
        if (scrapeResult.price !== null) {
          await supabase.from('price_history').insert({
            product_id: product.id,
            price: scrapeResult.price,
            stock: scrapeResult.stock || 'In Stock',
            recorded_at: new Date().toISOString()
          });
        }
        console.log(`[Tracking] Initial scrape finished for product ${storeProductId}: ${scrapeResult.outcome} (Price: ${scrapeResult.price})`);
      } catch (err) {
        console.error(`[Tracking] Error in initial background scrape for product ${storeProductId}:`, err);
      }
    })();

    return {
      product,
      message: 'Product added to tracking schedule'
    };
  },

  /**
   * Removes or deactivates a tracked product.
   */
  async untrackProduct(id) {
    const { error } = await supabase
      .from('tracked_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Retrieves historical price data and all scrape logs for a product.
   */
  async getProductHistory(id) {
    const { data: product, error: prodError } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('id', id)
      .single();

    if (prodError) throw prodError;

    const { data: priceHistory, error: histError } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', id)
      .order('recorded_at', { ascending: true });

    if (histError) throw histError;

    const { data: scrapeLogs, error: logError } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('product_id', id)
      .order('timestamp', { ascending: false });

    if (logError) throw logError;

    return {
      product,
      priceHistory: priceHistory || [],
      scrapeLogs: scrapeLogs || []
    };
  }
};
