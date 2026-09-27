import { launchResilientBrowser } from './engine.js';

// In-memory cache for catalog search items to provide instant UI responsiveness
let cachedCatalog = null;
let lastCatalogFetch = 0;
const CATALOG_CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Scrapes catalog items from the mock store across multiple pages.
 * @returns {Promise<Array<{ storeProductId: string, productUrl: string, name: string, category: string, brand: string, sku: string, options: string[], imageUrl: string|null }>>}
 */
export async function fetchFullCatalog() {
  if (cachedCatalog && cachedCatalog.length > 0 && (Date.now() - lastCatalogFetch < CATALOG_CACHE_TTL)) {
    return cachedCatalog;
  }

  const browser = await launchResilientBrowser({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('article.card', { timeout: 15000 });

    const allProducts = [];

    // Scrape first 3 pages to cache ~60 diverse products
    for (let pageNum = 1; pageNum <= 3; pageNum++) {
      const pageProducts = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('article.card'));
        const items = [];

        cards.forEach((card) => {
          const titleEl = card.querySelector('.card-title');
          const deptEl = card.querySelector('.dept-label');
          const makerEl = card.querySelector('.card-maker');
          const codeEl = card.querySelector('.card-code');

          const title = titleEl ? titleEl.innerText.trim() : '';
          const category = deptEl ? deptEl.innerText.trim() : '';
          const brand = makerEl ? makerEl.innerText.trim() : '';
          const sku = codeEl ? codeEl.innerText.trim() : '';

          const skuMatch = sku.match(/SK-(\d+)-/i);
          const storeProductId = skuMatch ? skuMatch[1] : (sku ? sku.replace(/[^0-9]/g, '') : '');

          if (title && storeProductId) {
            items.push({
              storeProductId,
              productUrl: `https://demo.inelabteamdev.com/item/${storeProductId}`,
              name: title,
              category,
              brand,
              sku,
              options: ['Standard', 'Starter', 'Regular', 'Deluxe'],
              imageUrl: null
            });
          }
        });

        return items;
      });

      pageProducts.forEach(p => {
        if (!allProducts.some(existing => existing.storeProductId === p.storeProductId)) {
          allProducts.push(p);
        }
      });

      // Navigate to next page if available
      const nextBtn = page.locator('button.ctl:has-text("NEXT")');
      if (await nextBtn.count() > 0 && !(await nextBtn.isDisabled())) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      } else {
        break;
      }
    }

    if (allProducts.length > 0) {
      cachedCatalog = allProducts;
      lastCatalogFetch = Date.now();
      return allProducts;
    }

    return [];

  } catch (err) {
    console.error('[Catalog] Error fetching catalog:', err);
    return cachedCatalog || [];
  } finally {
    await browser.close();
  }
}

/**
 * Searches the mock store by partial or full title/brand/category.
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchCatalog(query) {
  const catalog = await fetchFullCatalog();
  if (!query || query.trim() === '') {
    return catalog;
  }

  const q = query.toLowerCase().trim();
  const filtered = catalog.filter((item) =>
    item.name.toLowerCase().includes(q) ||
    item.brand.toLowerCase().includes(q) ||
    item.category.toLowerCase().includes(q) ||
    item.sku.toLowerCase().includes(q) ||
    item.storeProductId.includes(q)
  );

  return filtered;
}

/**
 * Fetches accurate live details and available options for a specific product URL.
 * @param {string} productUrl 
 */
export async function fetchProductDetails(productUrl) {
  const browser = await launchResilientBrowser({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
