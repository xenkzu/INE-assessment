import { chromium } from 'playwright';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

/**
 * Normalizes and extracts numeric price from text (handles currency symbols, commas, decimals, spaces, and Indian notation).
 * @param {string} text 
 * @returns {number|null}
 */
export function parsePrice(text) {
  if (!text) return null;

  // 1. Remove zero-width non-printable unicode artifacts
  let clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 2. Filter out non-price tags like savings, member prices, attempts
  clean = clean.replace(/Member\s*price\s*[₹$€£Rs.]*\s*[\d,\s.]+/gi, '');
  clean = clean.replace(/\d+%\s*saving/gi, '');
  clean = clean.replace(/Loaded\s*in\s*\d+\s*attempt/gi, '');
  clean = clean.replace(/Stock:?\s*\d+\s*remaining/gi, '');
  clean = clean.replace(/Check\s*again/gi, '');

  // 3. Match currency expressions
  const matches = Array.from(clean.matchAll(/(?:₹|Rs\.?|\$|€|£)\s*([\d\s,]+(?:\.\d{1,2})?)/gi));

  if (matches.length > 0) {
    // Take the last/active matched price
    const rawVal = matches[matches.length - 1][1];
    const normalized = rawVal.replace(/,/g, '').replace(/\s+/g, '');
    const num = parseFloat(normalized);
    if (!isNaN(num) && num > 0) return num;
  }

  // Fallback: extract any valid numeric token
  const fallbackMatch = clean.match(/([\d\s,]+(?:\.\d{1,2})?)/);
  if (fallbackMatch) {
    const normalized = fallbackMatch[1].replace(/,/g, '').replace(/\s+/g, '');
    const num = parseFloat(normalized);
    if (!isNaN(num) && num > 0) return num;
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
  const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (/out of stock|sold out/i.test(clean)) return 'Out of Stock';

  const remMatch = clean.match(/(?:Stock:?\s*)?(\d+)\s*(?:remaining|available|left)/i);
  if (remMatch) {
    const count = parseInt(remMatch[1], 10);
    return count <= 5 ? `Low Stock (${count} left)` : `In Stock (${count} left)`;
  }

  const lastFewMatch = clean.match(/LAST\s*FEW:\s*(\d+)/i);
  if (lastFewMatch) return `Low Stock (${lastFewMatch[1]} left)`;

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
 * Launches Chromium with automatic self-healing fallback if binary is missing.
 */
export async function launchResilientBrowser(options = {}) {
  try {
    return await chromium.launch(options);
  } catch (err) {
    if (err.message.includes("doesn't exist") || err.message.includes("Executable") || err.message.includes("Please run")) {
      console.warn('[Scraper Auto-Heal] Chromium missing at runtime. Installing Chromium now...');
      try {
        execSync('cross-env PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium || npx playwright install chromium', {
          stdio: 'inherit',
          env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' }
        });
        return await chromium.launch(options);
      } catch (installErr) {
        console.error('[Scraper Auto-Heal] Failed to auto-install chromium:', installErr);
      }
    }
    throw err;
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
      browser = await launchResilientBrowser({
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

      // 4. Click "Check today's price" button with retry loop to defeat storefront random drop barrier
      const checkBtn = page.locator('button:has-text("Check today"), button.ctl-main').first();
      if (await checkBtn.count() > 0) {
        for (let clickAttempt = 1; clickAttempt <= 4; clickAttempt++) {
          const isReady = await page.$('.offer-panel.offer-ready');
          if (isReady) break;
          const isLoading = await page.evaluate(() => {
            const p = document.querySelector('.offer-panel');
            return p && (p.innerText.includes('Loading') || p.innerText.includes('Retrying'));
          });
          if (isLoading) break;

          await dismissConsentIfPresent(page);
          await checkBtn.click({ force: true, timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(800);
        }
      }

      // 5. Wait for price quote to reveal (handling loading / retrying states from store)
      await page.waitForFunction(() => {
        const panel = document.querySelector('.offer-panel');
        if (!panel) return false;
        if (panel.classList.contains('offer-ready')) return true;
        const text = panel.innerText || '';
        return !text.includes('Price locked') &&
               !text.includes('Loading current price') &&
               !text.includes('Retrying') &&
               /[₹$€£\d]/.test(text);
      }, { timeout: 25000 });

      // 6. Extract price and stock details
      const extraction = await page.evaluate(() => {
        const panel = document.querySelector('.offer-panel');
        if (!panel) return { text: '', priceText: '', stockText: '', title: '', selectedOpt: '' };

        // Clone offer-row to safely clean elements without mutating live DOM
        const row = panel.querySelector('.offer-row');
        let priceText = '';
        if (row) {
          const clone = row.cloneNode(true);
          // Remove hidden honeypot tags
          clone.querySelectorAll('[style*="display: none"], [aria-hidden="true"]').forEach(e => e.remove());
          // Remove strikethrough / original prices
          clone.querySelectorAll('[style*="line-through"], .vbt-n6').forEach(e => e.remove());
          // Remove member price and savings labels
          clone.querySelectorAll('.zon-n6, .yfo-n6, [class*="saving"]').forEach(e => e.remove());

          // The remaining bold tag is the exact active selling price
          const boldEl = clone.querySelector('b, .dpe-n6, .vtdmtfm') || clone;
          priceText = boldEl.innerText.trim();
        }

        const availEl = panel.querySelector('.avail-pill, [class*="avail"], .sjl-n6');
        const stockText = availEl ? availEl.innerText.trim() : '';

        const title = document.querySelector('h1')?.innerText?.trim() || '';
        const selectedOpt = document.querySelector('button.opt-chip.opt-chip-on')?.innerText?.trim() || '';

        return {
          text: panel.innerText,
          priceText,
          stockText,
          title,
          selectedOpt
        };
      });

      const parsedPrice = parsePrice(extraction.priceText) || parsePrice(extraction.text);
      const parsedStock = parseStock(extraction.stockText) || parseStock(extraction.text);

      if (parsedPrice === null) {
        throw new Error(`Could not parse numeric price from panel: "${extraction.priceText || extraction.text.slice(0, 100)}"`);
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
