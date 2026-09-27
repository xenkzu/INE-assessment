import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

/**
 * Normalizes and extracts numeric price from text (handles currency symbols, commas, decimals).
 * @param {string} text 
 * @returns {number|null}
 */
export function parsePrice(text) {
  if (!text) return null;
  // Match currency patterns like ₹31,349, $199.99, €45.00, etc.
  const match = text.match(/[₹$€£]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/);
  if (match && match[1]) {
    const cleanNum = match[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    return isNaN(val) ? null : val;
  }
  return null;
}

/**
 * Extracts stock information from the offer panel text.
 * @param {string} text 
 * @returns {string}
 */
export function parseStock(text) {
  if (!text) return 'In Stock';
  if (/out of stock/i.test(text)) return 'Out of Stock';
  const lastFewMatch = text.match(/LAST FEW:\s*(\d+)/i);
  if (lastFewMatch) return `Last Few (${lastFewMatch[1]})`;
  const leftMatch = text.match(/(\d+)\s+left/i);
  if (leftMatch) return `${leftMatch[1]} left`;
  if (/in stock/i.test(text) || /delivery/i.test(text) || /seller:/i.test(text)) return 'In Stock';
  return 'In Stock';
}

/**
 * Helper to dismiss the cookie consent popup if present on the mock store.
 */
async function dismissConsentIfPresent(page) {
  try {
    const consentBtn = page.locator('button:has-text("Allow"), button:has-text("Reject")').first();
    if (await consentBtn.isVisible({ timeout: 1000 })) {
      await consentBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  } catch {
    // No consent popup, proceed
  }
}

/**
 * Resiliently scrapes price and stock for a given product and option.
 * 
 * @param {Object} params
 * @param {string} params.url - Product URL (e.g. https://demo.inelabteamdev.com/item/2111)
 * @param {string} [params.option] - Desired option label (e.g. "Starter", "Regular")
 * @param {boolean} [params.headed] - Whether to show the browser window
 * @param {number} [params.maxRetries=3] - Maximum retry attempts
 * @returns {Promise<{ success: boolean, price: number|null, stock: string|null, outcome: 'success'|'retried'|'failed', retryCount: number, durationMs: number, errorMessage: string|null }>}
 */
export async function scrapeProductVariant({
  url,
  option,
  headed = false,
  maxRetries = 3
}) {
  const startTime = Date.now();
  let retryCount = 0;
  let lastError = null;

  const isHeadless = headed ? false : (process.env.HEADLESS_MODE !== 'false');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser = null;
    try {
      browser = await chromium.launch({
        headless: isHeadless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      page.setDefaultTimeout(25000);

      // 1. Navigate to target URL
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await dismissConsentIfPresent(page);

      // 2. Select option if specified
      if (option) {
        const optionLocator = page.locator(`button.opt-chip:has-text("${option}")`).first();
        if (await optionLocator.count() > 0) {
          await dismissConsentIfPresent(page);
          await optionLocator.click({ timeout: 5000 });
          await page.waitForTimeout(400);
        }
      }

      // 3. Unlock Price by hovering / moving mouse across .offer-panel
      const offerPanel = page.locator('.offer-panel');
      await offerPanel.waitFor({ state: 'visible', timeout: 15000 });
      const box = await offerPanel.boundingBox();

      if (box) {
        // Move mouse across panel with intervals (>40ms) to satisfy movement requirements
        for (let i = 0; i < 15; i++) {
          await page.mouse.move(box.x + 10 + (i * 12), box.y + 10 + (i % 2 === 0 ? 6 : -6));
          await page.waitForTimeout(50);
        }
        // Dwell
        await page.waitForTimeout(1200);
      }

      await dismissConsentIfPresent(page);

      // 4. Click "Check today's price" button
      const checkBtn = page.locator('button:has-text("Check today’s price"), button.ctl-main').first();
      if (await checkBtn.count() > 0) {
        await dismissConsentIfPresent(page);
        await checkBtn.click({ force: true, timeout: 8000 });
      }

      // 5. Wait for price quote to reveal (handling loading / retrying states from store)
      await page.waitForFunction(() => {
        const panel = document.querySelector('.offer-panel');
        if (!panel) return false;
        const text = panel.innerText || '';
        return !text.includes('Price locked') &&
               !text.includes('Loading current price') &&
               !text.includes('Retrying') &&
               /[₹$€£\d]/.test(text);
      }, { timeout: 25000 });

      // 6. Extract price and stock details
      const extraction = await page.evaluate(() => {
        const panel = document.querySelector('.offer-panel');
        const text = panel ? panel.innerText : '';
        const title = document.querySelector('h1')?.innerText || '';
        const selectedOpt = document.querySelector('button.opt-chip.opt-chip-on')?.innerText || '';
        return { text, title, selectedOpt };
      });

      const parsedPrice = parsePrice(extraction.text);
      const parsedStock = parseStock(extraction.text);

      if (parsedPrice === null) {
        throw new Error(`Could not parse numeric price from panel text: "${extraction.text.slice(0, 100)}"`);
      }

      await browser.close();

      const durationMs = Date.now() - startTime;
      const outcome = retryCount > 0 ? 'retried' : 'success';

      return {
        success: true,
        price: parsedPrice,
        stock: parsedStock,
        outcome,
        retryCount,
        durationMs,
        errorMessage: null
      };

    } catch (err) {
      lastError = err;
      if (browser) {
        try { await browser.close(); } catch {}
      }

      if (attempt < maxRetries) {
        retryCount++;
        // Exponential backoff with random jitter: (1000ms * 2^attempt) + random jitter
        const backoffMs = (1000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
        console.warn(`[Scraper] Attempt ${attempt} failed: ${err.message}. Retrying in ${backoffMs}ms...`);
        await new Promise((res) => setTimeout(res, backoffMs));
      }
    }
  }

  // If all retries failed
  const durationMs = Date.now() - startTime;
  return {
    success: false,
    price: null,
    stock: null,
    outcome: 'failed',
    retryCount,
    durationMs,
    errorMessage: lastError ? lastError.message : 'Unknown scraper error'
  };
}
