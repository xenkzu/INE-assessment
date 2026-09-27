/**
 * Live Store Catalog Integration
 * 
 * Fetches 100% authentic product listings, option axes (Storage, Bundle, Capacity, Level, etc.),
 * and variant options directly from https://demo.inelabteamdev.com/api/v2/
 * Zero synthetic or hardcoded fake data.
 */

const itemDetailsCache = new Map();
let listingsCache = null;
let lastListingsFetch = 0;
const LISTINGS_TTL = 1000 * 60 * 30; // 30 minutes

/**
 * Fetches all live catalog listings from the mock storefront.
 */
export async function fetchLiveListings() {
  if (listingsCache && (Date.now() - lastListingsFetch < LISTINGS_TTL)) {
    return listingsCache;
  }

  try {
    // Store has 960 items across 16 pages of limit 60
    const results = [];
    for (let i = 1; i <= 16; i += 4) {
      const batch = [i, i + 1, i + 2, i + 3].filter((p) => p <= 16);
      const batchResponses = await Promise.all(
        batch.map(async (page) => {
          try {
            const res = await fetch(`https://demo.inelabteamdev.com/api/v2/listings?page=${page}&limit=60`);
            if (res.ok) {
              const data = await res.json();
              return Array.isArray(data.results) ? data.results : [];
            }
          } catch (e) {
            return [];
          }
          return [];
        })
      );
      for (const list of batchResponses) {
        if (list && list.length) results.push(...list);
      }
    }

    if (results.length > 0) {
      // Deduplicate by ID
      const unique = [];
      const seen = new Set();
      for (const item of results) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
      listingsCache = unique;
      lastListingsFetch = Date.now();
      return listingsCache;
    }

    return listingsCache || [];
  } catch (err) {
    console.error('[Catalog] Error fetching listings from store:', err.message);
    return listingsCache || [];
  }
}

/**
 * Fetches authentic product details and exact variant options from the live store API.
 * Includes retry loop with backoff to handle mock store 503/429 rate limit challenges.
 * @param {string|number} itemId - e.g. "2491" or 2491
 */
export async function fetchLiveItemDetails(itemId, maxRetries = 3) {
  const numericId = String(itemId).replace(/\D/g, '');
  if (!numericId) return null;

  if (itemDetailsCache.has(numericId)) {
    return itemDetailsCache.get(numericId);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`https://demo.inelabteamdev.com/api/v2/items/${numericId}`);
      if (res.status === 503 || res.status === 429) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 200 * attempt));
          continue;
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const formatted = {
        storeProductId: String(data.id),
        productUrl: `https://demo.inelabteamdev.com/item/${data.id}`,
        name: data.name,
        category: data.category,
        brand: data.brand,
        sku: data.sku,
        optionAxis: data.optionAxis || 'Option',
        options: (data.options || []).map((o) => (typeof o === 'string' ? o : o.label || o.id)),
        specs: data.specs || {},
        imageUrl: null
      };

      itemDetailsCache.set(numericId, formatted);
      return formatted;
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`[Catalog] Error fetching live details for item ${numericId}:`, err.message);
        return null;
      }
      await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }

  return null;
}

/**
 * Searches the store catalog by partial or full query against live store listings with pagination support.
 * @param {Object|string} params 
 * @returns {Promise<{ results: Array, total: number, page: number, limit: number, totalPages: number, hasMore: boolean }>}
 */
export async function searchCatalog(params = {}) {
  let query = '';
  let category = '';
  let page = 1;
  let limit = 8;
  let offset = null;

  if (typeof params === 'string') {
    query = params;
  } else if (params && typeof params === 'object') {
    query = params.query || params.q || '';
    category = params.category || '';
    page = params.page ? Number(params.page) : 1;
    limit = params.limit ? Number(params.limit) : 8;
    offset = params.offset !== undefined && params.offset !== null ? Number(params.offset) : null;
  }

  const listings = await fetchLiveListings();
  const q = String(query || '').toLowerCase().trim();
  const catFilter = String(category || '').toLowerCase().trim();

  let matches = listings;

  if (catFilter && catFilter !== 'all') {
    matches = matches.filter((item) => (item.category || '').toLowerCase().includes(catFilter));
  }

  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    matches = matches.filter((item) => {
      const targetStr = `${item.name || ''} ${item.brand || ''} ${item.category || ''} ${item.sku || ''} ${item.id || ''}`.toLowerCase();
      return words.every((w) => targetStr.includes(w));
    });
  }

  const total = matches.length;
  const start = offset !== null ? offset : (page - 1) * limit;
  const end = start + limit;
  const pageItems = matches.slice(start, end);

  // Fetch live options for pageItems
  const detailedResults = await Promise.all(
    pageItems.map(async (item) => {
      const details = await fetchLiveItemDetails(item.id);
      if (details) return details;
      return {
        storeProductId: String(item.id),
        productUrl: `https://demo.inelabteamdev.com/item/${item.id}`,
        name: item.name,
        category: item.category,
        brand: item.brand,
        sku: item.sku,
        optionAxis: 'Option',
        options: [],
        imageUrl: null
      };
    })
  );

  return {
    results: detailedResults,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: end < total
  };
}

/**
 * Fetches accurate live details and options for a specific product URL.
 * @param {string} productUrl 
 */
export async function fetchProductDetails(productUrl) {
  const match = productUrl.match(/item\/(\d+)/);
  if (!match) return null;
  return await fetchLiveItemDetails(match[1]);
}
