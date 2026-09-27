import { chromium } from 'playwright';
import fs from 'fs';

async function crawlStore() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to store...');
  await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'networkidle' });

  // dismiss cookie
  try {
    const btn = page.locator('button:has-text("Allow"), button:has-text("Reject")').first();
    if (await btn.isVisible({ timeout: 1000 })) await btn.click({ force: true });
  } catch {}

  const products = [];

  // Crawl first 10 pages of storefront
  for (let pageNum = 1; pageNum <= 10; pageNum++) {
    console.log(`Crawling Page ${pageNum}...`);
    await page.waitForTimeout(1000);

    // Extract item cards on current page
    const cards = await page.$$eval('.grid > div, [class*="card"], div:has(> button.ctl)', els => {
      return els.map(el => {
        const text = el.innerText;
        const btn = el.querySelector('button');
        const skuMatch = text.match(/SKU\s+SK-(\d+)-([A-Z]+)/i);
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const category = lines[0] || 'General';
        const name = lines[1] || 'Product';
        const brand = lines[2] || 'Brand';
        const storeProductId = skuMatch ? skuMatch[1] : null;
        const sku = skuMatch ? skuMatch[0] : null;

        return {
          storeProductId,
          sku,
          category,
          name,
          brand
        };
      }).filter(item => item.storeProductId);
    });

    console.log(`Found ${cards.length} items on page ${pageNum}`);

    for (const item of cards) {
      if (!products.some(p => p.storeProductId === item.storeProductId)) {
        products.push({
          storeProductId: item.storeProductId,
          productUrl: `https://demo.inelabteamdev.com/item/${item.storeProductId}`,
          name: item.name,
          category: item.category,
          brand: item.brand,
          sku: item.sku,
          options: [],
          imageUrl: null
        });
      }
    }

    // Click NEXT button
    const nextBtn = page.locator('button:has-text("NEXT"), button:has-text("›")').first();
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }

  console.log(`Total unique products collected: ${products.length}`);

  // Fetch actual options for the first 30 products
  console.log('Fetching live options for products...');
  for (let i = 0; i < Math.min(products.length, 30); i++) {
    const prod = products[i];
    try {
      await page.goto(prod.productUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
      try {
        const btn = page.locator('button:has-text("Allow"), button:has-text("Reject")').first();
        if (await btn.isVisible({ timeout: 400 })) await btn.click({ force: true });
      } catch {}

      const options = await page.$$eval('button.opt-chip', els => els.map(e => e.innerText.trim()));
      if (options.length > 0) {
        prod.options = options;
      } else {
        prod.options = ['Standard'];
      }
      console.log(`[${prod.storeProductId}] ${prod.name} -> Options:`, prod.options);
    } catch (e) {
      prod.options = ['Standard'];
    }
  }

  fs.writeFileSync('backend/src/scraper/live_catalog.json', JSON.stringify(products, null, 2));
  console.log('Saved to backend/src/scraper/live_catalog.json');

  await browser.close();
}

crawlStore().catch(console.error);
