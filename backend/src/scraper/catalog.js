import { chromium } from 'playwright';

// In-memory cache for catalog search items to provide instant UI responsiveness
let cachedCatalog = null;
let lastCatalogFetch = 0;
const CATALOG_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Scrapes catalog items from the mock store homepage / items.
 * @returns {Promise<Array<{ storeProductId: string, productUrl: string, name: string, category: string, brand: string, sku: string, options: string[], imageUrl: string|null }>>}
 */
export async function fetchFullCatalog() {
  if (cachedCatalog && (Date.now() - lastCatalogFetch < CATALOG_CACHE_TTL)) {
    return cachedCatalog;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'networkidle', timeout: 30000 });

    // Extract product cards from the current page
    const products = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.card, article, [class*="card"]'));
      const items = [];

      // If cards are found
      cards.forEach((card) => {
        const titleEl = card.querySelector('h2, h3, .card-title, strong');
        const deptEl = card.querySelector('.dept-label, .category, span');
        const makerEl = card.querySelector('.card-maker, .maker, p');
        const skuEl = card.querySelector('.card-sku, .sku');
        const btnEl = card.querySelector('button.card-open, a');

        const title = titleEl ? titleEl.innerText.trim() : '';
        const dept = deptEl ? deptEl.innerText.trim() : '';
        const maker = makerEl ? makerEl.innerText.trim() : '';
        const sku = skuEl ? skuEl.innerText.trim() : '';

        // Extract ID from SKU or button
        const skuMatch = sku.match(/SK-(\d+)-/i);
        const storeProductId = skuMatch ? skuMatch[1] : (sku ? sku.replace(/[^0-9]/g, '') : '');

        if (title && storeProductId) {
          items.push({
            storeProductId,
            productUrl: `https://demo.inelabteamdev.com/item/${storeProductId}`,
            name: title,
            category: dept,
            brand: maker,
            sku,
            options: ['Starter', 'Regular', 'Standard'], // Default options baseline
            imageUrl: null
          });
        }
      });

      return items;
    });

    if (products.length > 0) {
      cachedCatalog = products;
      lastCatalogFetch = Date.now();
      return products;
    }

    // Fallback: If cards had distinct selectors, extract directly from text/DOM
    return [];

  } catch (err) {
    console.error('[Catalog] Error fetching catalog:', err);
    return cachedCatalog || [];
  } finally {
    await browser.close();
  }
}

/**
 * Searches the mock store by partial or full title.
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchCatalog(query) {
  const catalog = await fetchFullCatalog();
  if (!query || query.trim() === '') {
    return catalog.slice(0, 20);
  }

  const q = query.toLowerCase().trim();
  const filtered = catalog.filter((item) =>
    item.name.toLowerCase().includes(q) ||
    item.brand.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    item.sku.toLowerCase().includes(q) ||
    item.storeProductId.includes(q)
  );

  return filtered.slice(0, 30);
}

/**
 * Fetches accurate live details and available options for a specific product URL.
 * @param {string} productUrl 
 */
export async function fetchProductDetails(productUrl) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const details = await page.evaluate(() => {
      const title = document.querySelector('h1')?.innerText?.trim() || '';
      const maker = document.querySelector('.pdp-maker')?.innerText?.trim() || '';
      const category = document.querySelector('.dept-label')?.innerText?.trim() || '';
      const blurb = document.querySelector('.pdp-blurb')?.innerText?.trim() || '';
      
      const optionButtons = Array.from(document.querySelectorAll('.opt-chip')).map(b => b.innerText.trim());
      const activeOption = document.querySelector('.opt-chip.opt-chip-on')?.innerText?.trim() || (optionButtons[0] || 'Standard');

      return {
        title,
        maker,
        category,
        blurb,
        options: optionButtons.length > 0 ? optionButtons : ['Standard'],
        activeOption
      };
    });

    return details;

  } catch (err) {
    console.error('[ProductDetails] Error fetching details:', err);
    return null;
  } finally {
    await browser.close();
  }
}
