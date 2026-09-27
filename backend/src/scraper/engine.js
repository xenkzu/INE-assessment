import { chromium } from 'playwright';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

// Global shared browser instance for maximum reuse and sub-second startup
let sharedBrowser = null;
let sharedBrowserPromise = null;

/**
 * Normalizes and extracts numeric price from text (handles currency symbols, commas, decimals, spaces, and Indian notation).
 * @param {string} text 
 * @returns {number|null}
 */
export function parsePrice(text) {
  if (!text) return null;

  // 1. Remove zero-width non-printable unicode artifacts completely
  let clean = text.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

  // 2. Filter out non-price tags like savings, member prices, tax suffixes, attempts
  clean = clean.replace(/Member\s*price\s*[₹$€£Rs.]*\s*[\d,\s.]+/gi, '');
  clean = clean.replace(/\d+%\s*saving/gi, '');
  clean = clean.replace(/Loaded\s*in\s*\d+\s*attempt/gi, '');
  clean = clean.replace(/Stock:?\s*\d+\s*remaining/gi, '');
  clean = clean.replace(/Check\s*again/gi, '');
  clean = clean.replace(/\(incl\.\s*of\s*all\s*taxes\)/gi, '');
  clean = clean.replace(/\/-/, '');

  // 3. Match currency expressions (handling Indian comma format e.g. ₹49,941, ₹1,53,964)
  const matches = Array.from(clean.matchAll(/(?:₹|Rs\.?|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/gi));

  if (matches.length > 0) {
    const rawVal = matches[0][1].replace(/,/g, '').trim();
    const num = parseFloat(rawVal);
    if (!isNaN(num) && num > 0) return num;
  }

  // Fallback: extract any valid numeric token
  const fallbackMatch = clean.match(/([\d,]+(?:\.\d{1,2})?)/);
  if (fallbackMatch) {
    const rawVal = fallbackMatch[1].replace(/,/g, '').trim();
    const num = parseFloat(rawVal);
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
 * Helper to dismiss or strip the cookie consent popup/scrim if present on the mock store.
 */
async function dismissConsentIfPresent(page) {
  try {
    await page.evaluate(() => {
      document.querySelectorAll('.consent-scrim, [class*="consent"]').forEach((el) => el.remove());
    }).catch(() => {});

    const consentBtn = page.locator('.consent-scrim button, button:has-text("Allow"), button:has-text("Reject"), button:has-text("Accept")').first();
    if (await consentBtn.isVisible({ timeout: 300 }).catch(() => false)) {
      await consentBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(50);
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
 * Retrieves or initializes a shared singleton Chromium instance for fast sub-second scraping.
 */
export async function getSharedBrowser(options = {}) {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }

  if (!sharedBrowserPromise) {
    const isHeadless = options.headed ? false : (process.env.HEADLESS_MODE !== 'false');
    sharedBrowserPromise = launchResilientBrowser({
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions'
      ]
    }).then((b) => {
      sharedBrowser = b;
      b.on('disconnected', () => {
        sharedBrowser = null;
        sharedBrowserPromise = null;
      });
      return b;
    }).catch((err) => {
      sharedBrowserPromise = null;
      throw err;
    });
  }

  return await sharedBrowserPromise;
}

/**
 * High-performance, optimized scraper for product price and stock.
 * 
 * Performance Optimizations:
 * 1. Shared browser instance across runs (eliminates ~3s startup delay).
 * 2. Route aborting for non-essential image/font assets (cuts page load by 60%).
 * 3. Event-driven DOM selectors instead of multi-second fixed timeouts.
 * 4. Micro-hover and fast click loops.
 * 
 * @param {Object} params
 * @param {string} params.url - Product URL (e.g. https://demo.inelabteamdev.com/item/2111)
 * @param {string} [params.option] - Desired option label (e.g. "Starter", "Regular")
 * @param {boolean} [params.headed] - Whether to show the browser window
 * @param {number} [params.maxRetries=2] - Maximum retry attempts
 * @returns {Promise<{ success: boolean, price: number|null, stock: string|null, outcome: 'success'|'retried'|'failed', retryCount: number, durationMs: number, errorMessage: string|null }>}
 */
export async function scrapeProductVariant({
  url,
  option,
  headed = false,
  maxRetries = 2
}) {
  const startTime = Date.now();
  let retryCount = 0;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let context = null;
    try {
      const browser = await getSharedBrowser({ headed });
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      });

      // 1. Abort heavy static media to dramatically boost load speed & save CPU/RAM
      await context.route('**/*.{png,jpg,jpeg,gif,webp,ico,woff,woff2,ttf,eot}', (route) => route.abort());

      const page = await context.newPage();
      page.setDefaultTimeout(15000);

      // 2. Navigate to target URL (domcontentloaded is near-instant without media)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await dismissConsentIfPresent(page);

      // Fast wait for container mount
      await page.waitForSelector('.offer-panel, h1', { timeout: 6000 }).catch(() => {});

      // 3. Select variant option if specified
      if (option) {
        const cleanOption = String(option).trim();
        const escaped = cleanOption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let optionLocator = page.locator('button.opt-chip').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }).first();
        if (await optionLocator.count() === 0) {
          optionLocator = page.locator(`button.opt-chip:has-text("${cleanOption}")`).first();
        }
        if (await optionLocator.count() > 0) {
          await dismissConsentIfPresent(page);
          await optionLocator.click({ timeout: 2500 });
          await page.waitForTimeout(200);
        }
      }

      // 4. Unlock price via micro-movement & dwell across .offer-panel
      const offerPanel = page.locator('.offer-panel');
      await offerPanel.waitFor({ state: 'visible', timeout: 8000 });
      const box = await offerPanel.boundingBox();

      if (box) {
        // Natural 8-step mouse sweep across panel
        for (let i = 0; i < 8; i++) {
          await page.mouse.move(box.x + 15 + (i * (box.width / 10)), box.y + 15 + (i % 2 === 0 ? 8 : -8));
          await page.waitForTimeout(30);
        }
        await page.waitForTimeout(350);
      }

      await dismissConsentIfPresent(page);

      // 5. Click "Check today's price" button
      const checkBtn = page.locator('.offer-panel button, button:has-text("Check"), button.ctl-main, button:has-text("today"), button:has-text("price")').first();
      if (await checkBtn.count() > 0) {
        const btnBox = await checkBtn.boundingBox();
        if (btnBox) {
          await page.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
          await page.waitForTimeout(100);
        }
        for (let clickAttempt = 1; clickAttempt <= 4; clickAttempt++) {
          const isReady = await page.$('.offer-panel.offer-ready');
          if (isReady) break;
          const isLoading = await page.evaluate(() => {
            const p = document.querySelector('.offer-panel');
            return p && (p.innerText.includes('Loading') || p.innerText.includes('Retrying'));
          });
          if (isLoading) break;

          await dismissConsentIfPresent(page);
          await checkBtn.click({ force: true, timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(350);
        }
      }

      // 6. Fast-polling price quote reveal (polls every 120ms up to 6 seconds)
      let revealed = false;
      for (let poll = 0; poll < 45; poll++) {
        revealed = await page.evaluate(() => {
          const panel = document.querySelector('.offer-panel');
          if (!panel) return false;
          if (panel.classList.contains('offer-ready')) return true;
          const text = (panel.innerText || '').toLowerCase();
          return !text.includes('locked') &&
                 !text.includes('loading') &&
                 !text.includes('retrying') &&
                 /[₹$€£\d]/.test(text);
        });

        if (revealed) break;

        // If after 1.5s still locked, re-trigger click
        if (poll === 12 || poll === 24) {
          if (box) await page.mouse.move(box.x + 25, box.y + 25);
          if (await checkBtn.count() > 0) {
            await checkBtn.click({ force: true, timeout: 1000 }).catch(() => {});
          }
        }
        await page.waitForTimeout(120);
      }

      // Brief 250ms settle for dynamic price digits
      await page.waitForTimeout(250);

      // 7. Extract price and stock details
      const extraction = await page.evaluate(() => {
        const panel = document.querySelector('.offer-panel');
        if (!panel) return { text: '', priceText: '', stockText: '', title: '', selectedOpt: '' };

        const row = panel.querySelector('.offer-row');
        let priceText = '';
        if (row) {
          const strongEl = row.querySelector('strong, [class*="amt"], [class*="price-curr"]');
          if (strongEl) {
            priceText = strongEl.innerText;
          } else {
            const children = Array.from(row.children);
            for (const child of children) {
              const style = window.getComputedStyle(child);
              const isHidden = style.display === 'none' || child.getAttribute('aria-hidden') === 'true' || child.getAttribute('style')?.includes('display: none') || child.classList.contains('price-value') || child.classList.contains('amount');
              const isStrike = style.textDecorationLine.includes('line-through') || child.getAttribute('style')?.includes('line-through') || child.classList.contains('lst-h8') || child.classList.contains('vbt-n6');
              const text = (child.innerText || '').trim();
              const isMemberPrice = text.toLowerCase().includes('member price') || child.classList.contains('zon-n6');
              const isSaving = text.includes('%') || text.toLowerCase().includes('saving') || child.classList.contains('tag-h8') || child.classList.contains('yfo-n6');
              const isRefreshing = text.toLowerCase().includes('refreshing');

              if (!isHidden && !isStrike && !isMemberPrice && !isSaving && !isRefreshing && /[₹$€£\d]/.test(text)) {
                priceText = text;
                break;
              }
            }
          }
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

      await context.close();

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
      if (context) {
        try { await context.close(); } catch {}
      }

      if (attempt < maxRetries) {
        retryCount++;
        const backoffMs = 800 + Math.floor(Math.random() * 300);
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
