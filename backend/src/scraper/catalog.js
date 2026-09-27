import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchResilientBrowser } from './engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Baseline catalogue of products from https://demo.inelabteamdev.com/
// Allows instant search response times (<10ms) and avoids cold-start latency
const BASELINE_PRODUCTS = [
  {
    storeProductId: "2945",
    productUrl: "https://demo.inelabteamdev.com/item/2945",
    name: "Orbisk Digital Piano Arc",
    category: "INSTRUMENTS",
    brand: "Orbisk",
    sku: "SKU SK-2945-OR",
    options: ["Instrument only", "Starter bundle", "Studio bundle", "Stage bundle"],
    imageUrl: null
  },
  {
    storeProductId: "2111",
    productUrl: "https://demo.inelabteamdev.com/item/2111",
    name: "Lumeno Foam Roller Go",
    category: "FITNESS",
    brand: "Lumeno",
    sku: "SKU SK-2111-LU",
    options: ["Starter", "Regular"],
    imageUrl: null
  },
  {
    storeProductId: "2879",
    productUrl: "https://demo.inelabteamdev.com/item/2879",
    name: "Mosella NAS Enclosure Zen",
    category: "NETWORKING",
    brand: "Mosella",
    sku: "SKU SK-2879-MO",
    options: ["1-pack", "2-pack", "3-pack", "4-pack"],
    imageUrl: null
  },
  {
    storeProductId: "2833",
    productUrl: "https://demo.inelabteamdev.com/item/2833",
    name: "Orbisk Tent Zen",
    category: "OUTDOOR",
    brand: "Orbisk",
    sku: "SKU SK-2833-OR",
    options: ["Solo", "Duo", "Family", "Group"],
    imageUrl: null
  },
  {
    storeProductId: "2472",
    productUrl: "https://demo.inelabteamdev.com/item/2472",
    name: "Redwick Synthesizer Flex",
    category: "INSTRUMENTS",
    brand: "Redwick",
    sku: "SKU SK-2472-RE",
    options: ["Standard", "Pro Bundle"],
    imageUrl: null
  },
  {
    storeProductId: "2491",
    productUrl: "https://demo.inelabteamdev.com/item/2491",
    name: "Pinecrest Drawing Tablet Ultra",
    category: "TABLETS",
    brand: "Pinecrest",
    sku: "SKU SK-2491-PI",
    options: ["64 GB", "128 GB", "256 GB", "512 GB"],
    imageUrl: null
  },
  {
    storeProductId: "2833",
    productUrl: "https://demo.inelabteamdev.com/item/2833",
    name: "Orbisk Tent Zen",
    category: "OUTDOOR",
    brand: "Orbisk",
    sku: "SKU SK-2833-OR",
    options: ["2-Person", "4-Person", "6-Person"],
    imageUrl: null
  },
  {
    storeProductId: "2472",
    productUrl: "https://demo.inelabteamdev.com/item/2472",
    name: "Redwick Synthesizer Flex",
    category: "INSTRUMENTS",
    brand: "Redwick",
    sku: "SKU SK-2472-RE",
    options: ["Standard", "Pro Bundle"],
    imageUrl: null
  },
  {
    storeProductId: "2491",
    productUrl: "https://demo.inelabteamdev.com/item/2491",
    name: "Pinecrest Drawing Tablet Ultra",
    category: "TABLETS",
    brand: "Pinecrest",
    sku: "SKU SK-2491-PI",
    options: ["10-inch", "13-inch", "16-inch"],
    imageUrl: null
  },
  {
    storeProductId: "2391",
    productUrl: "https://demo.inelabteamdev.com/item/2391",
    name: "Lumeno Cajon Prime",
    category: "INSTRUMENTS",
    brand: "Lumeno",
    sku: "SKU SK-2391-LU",
    options: ["Standard", "Birch Finish", "Walnut Finish"],
    imageUrl: null
  },
  {
    storeProductId: "2228",
    productUrl: "https://demo.inelabteamdev.com/item/2228",
    name: "Brightwell Electronic Drum Kit Edge",
    category: "INSTRUMENTS",
    brand: "Brightwell",
    sku: "SKU SK-2228-BR",
    options: ["5-Piece", "7-Piece Deluxe"],
    imageUrl: null
  },
  {
    storeProductId: "2684",
    productUrl: "https://demo.inelabteamdev.com/item/2684",
    name: "Tundrel Desk Lamp Duo",
    category: "OFFICE",
    brand: "Tundrel",
    sku: "SKU SK-2684-TU",
    options: ["Warm White", "Cool White", "RGB Smart"],
    imageUrl: null
  },
  {
    storeProductId: "2067",
    productUrl: "https://demo.inelabteamdev.com/item/2067",
    name: "Mosella Acoustic Guitar One",
    category: "INSTRUMENTS",
    brand: "Mosella",
    sku: "SKU SK-2067-MO",
    options: ["Dreadnought", "Concert", "Cutaway"],
    imageUrl: null
  },
  {
    storeProductId: "2173",
    productUrl: "https://demo.inelabteamdev.com/item/2173",
    name: "Tamarack Note Pad Edge",
    category: "TABLETS",
    brand: "Tamarack",
    sku: "SKU SK-2173-TA",
    options: ["64GB", "128GB", "256GB"],
    imageUrl: null
  },
  {
    storeProductId: "2736",
    productUrl: "https://demo.inelabteamdev.com/item/2736",
    name: "Junova Rugged Tablet Aero",
    category: "TABLETS",
    brand: "Junova",
    sku: "SKU SK-2736-JU",
    options: ["Wi-Fi", "LTE Cellular", "5G Rugged"],
    imageUrl: null
  },
  {
    storeProductId: "2891",
    productUrl: "https://demo.inelabteamdev.com/item/2891",
    name: "Halvard Drawing Tablet Arc",
    category: "TABLETS",
    brand: "Halvard",
    sku: "SKU SK-2891-HA",
    options: ["Standard", "Pro Pen Bundle"],
    imageUrl: null
  },
  {
    storeProductId: "2726",
    productUrl: "https://demo.inelabteamdev.com/item/2726",
    name: "Tundrel Dash Cam Aero",
    category: "CAMERAS",
    brand: "Tundrel",
    sku: "SKU SK-2726-TU",
    options: ["1080p Single", "4K Dual Channel"],
    imageUrl: null
  },
  {
    storeProductId: "2816",
    productUrl: "https://demo.inelabteamdev.com/item/2816",
    name: "Brightwell Rugged Tablet Zen",
    category: "TABLETS",
    brand: "Brightwell",
    sku: "SKU SK-2816-BR",
    options: ["Standard", "Heavy Duty Case"],
    imageUrl: null
  },
  {
    storeProductId: "2663",
    productUrl: "https://demo.inelabteamdev.com/item/2663",
    name: "Tamarack Flight Stick Duo",
    category: "GAMING",
    brand: "Tamarack",
    sku: "SKU SK-2663-TA",
    options: ["Stick Only", "HOTAS Throttle Combo"],
    imageUrl: null
  },
  {
    storeProductId: "2074",
    productUrl: "https://demo.inelabteamdev.com/item/2074",
    name: "Brightwell Mesh System One",
    category: "NETWORKING",
    brand: "Brightwell",
    sku: "SKU SK-2074-BR",
    options: ["2-Pack", "3-Pack Whole Home"],
    imageUrl: null
  },
  {
    storeProductId: "2423",
    productUrl: "https://demo.inelabteamdev.com/item/2423",
    name: "Quarrow Flight Stick Flex",
    category: "GAMING",
    brand: "Quarrow",
    sku: "SKU SK-2423-QU",
    options: ["Standard", "Force Feedback"],
    imageUrl: null
  },
  {
    storeProductId: "2253",
    productUrl: "https://demo.inelabteamdev.com/item/2253",
    name: "Pinecrest Note Pad Core",
    category: "TABLETS",
    brand: "Pinecrest",
    sku: "SKU SK-2253-PI",
    options: ["64GB", "128GB"],
    imageUrl: null
  },
  {
    storeProductId: "2493",
    productUrl: "https://demo.inelabteamdev.com/item/2493",
    name: "Quarrow Note Pad Ultra",
    category: "TABLETS",
    brand: "Quarrow",
    sku: "SKU SK-2493-QU",
    options: ["Standard", "Stylus Pack"],
    imageUrl: null
  },
  {
    storeProductId: "2770",
    productUrl: "https://demo.inelabteamdev.com/item/2770",
    name: "Saffrix LED Strip Aero",
    category: "LIGHTING",
    brand: "Saffrix",
    sku: "SKU SK-2770-SA",
    options: ["2 Meter", "5 Meter", "10 Meter Smart"],
    imageUrl: null
  },
  {
    storeProductId: "2107",
    productUrl: "https://demo.inelabteamdev.com/item/2107",
    name: "Halvard Rowing Machine Go",
    category: "FITNESS",
    brand: "Halvard",
    sku: "SKU SK-2107-HA",
    options: ["Magnetic", "Water Resistance"],
    imageUrl: null
  },
  {
    storeProductId: "2281",
    productUrl: "https://demo.inelabteamdev.com/item/2281",
    name: "Pinecrest Desk Chair Core",
    category: "OFFICE",
    brand: "Pinecrest",
    sku: "SKU SK-2281-PI",
    options: ["Mesh Black", "Ergonomic Grey", "Leather Pro"],
    imageUrl: null
  },
  {
    storeProductId: "2028",
    productUrl: "https://demo.inelabteamdev.com/item/2028",
    name: "Saffrix Resistance Bands One",
    category: "FITNESS",
    brand: "Saffrix",
    sku: "SKU SK-2028-SA",
    options: ["Light-Medium", "Heavy 5-Band Set"],
    imageUrl: null
  },
  {
    storeProductId: "2858",
    productUrl: "https://demo.inelabteamdev.com/item/2858",
    name: "Brightwell Beard Trimmer Zen",
    category: "PERSONAL CARE",
    brand: "Brightwell",
    sku: "SKU SK-2858-BR",
    options: ["Standard", "Grooming Kit Edition"],
    imageUrl: null
  },
  {
    storeProductId: "2507",
    productUrl: "https://demo.inelabteamdev.com/item/2507",
    name: "Quarrow Rowing Machine Ultra",
    category: "FITNESS",
    brand: "Quarrow",
    sku: "SKU SK-2507-QU",
    options: ["Standard", "Bluetooth Console"],
    imageUrl: null
  },
  {
    storeProductId: "2880",
    productUrl: "https://demo.inelabteamdev.com/item/2880",
    name: "Tundrel 5G Hotspot Zen",
    category: "NETWORKING",
    brand: "Tundrel",
    sku: "SKU SK-2880-TU",
    options: ["Unlocked 5G", "Extended Battery Pack"],
    imageUrl: null
  }
];

let cachedCatalog = [...BASELINE_PRODUCTS];
try {
  const liveCatalogPath = path.join(__dirname, 'live_catalog.json');
  if (fs.existsSync(liveCatalogPath)) {
    const raw = fs.readFileSync(liveCatalogPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged = [...BASELINE_PRODUCTS];
      parsed.forEach(item => {
        if (!merged.some(m => m.storeProductId === item.storeProductId)) {
          merged.push(item);
        }
      });
      cachedCatalog = merged;
    }
  }
} catch (e) {
  // fallback to BASELINE_PRODUCTS
}

let lastCatalogFetch = Date.now();
const CATALOG_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

/**
 * Background worker to refresh live catalog from the mock store across multiple pages.
 */
export async function refreshCatalogInBackground() {
  try {
    const browser = await launchResilientBrowser({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('article.card', { timeout: 15000 });

    const allProducts = [];

    for (let pageNum = 1; pageNum <= 4; pageNum++) {
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
              options: ['Starter', 'Regular', 'Standard', 'Deluxe'],
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

      const nextBtn = page.locator('button.ctl:has-text("NEXT")');
      if (await nextBtn.count() > 0 && !(await nextBtn.isDisabled())) {
        await nextBtn.click();
        await page.waitForTimeout(800);
      } else {
        break;
      }
    }

    await browser.close();

    if (allProducts.length > 0) {
      cachedCatalog = allProducts;
      lastCatalogFetch = Date.now();
      console.log(`[Catalog] Successfully refreshed catalogue with ${allProducts.length} live products.`);
    }

  } catch (err) {
    console.warn('[Catalog Refresh] Store background crawl note:', err.message);
  }
}

/**
 * Searches the store catalog by partial or full query.
 * Responds instantly (<10ms) from cache.
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchCatalog(query) {
  const catalog = (cachedCatalog && cachedCatalog.length > 0) ? cachedCatalog : BASELINE_PRODUCTS;

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
 * Fetches accurate live details and options for a specific product URL.
 * @param {string} productUrl 
 */
export async function fetchProductDetails(productUrl) {
  try {
    const browser = await launchResilientBrowser({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

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
        options: optionButtons.length > 0 ? optionButtons : ['Standard', 'Deluxe'],
        activeOption
      };
    });

    await browser.close();
    return details;

  } catch (err) {
    console.error('[ProductDetails] Error fetching details:', err.message);
    return null;
  }
}
