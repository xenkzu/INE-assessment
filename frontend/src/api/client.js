const BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://ine-assessment-de8i.onrender.com');

// In-memory cache for live store listings and item details to ensure instant, continuous pagination
let storeListingsCache = null;
const itemOptionsCache = new Map();

async function fetchLiveStoreListings() {
  if (storeListingsCache && storeListingsCache.length > 0) {
    return storeListingsCache;
  }
  try {
    const results = [];
    for (let p = 1; p <= 16; p += 4) {
      const batch = [p, p + 1, p + 2, p + 3].filter((x) => x <= 16);
      const responses = await Promise.all(
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
      for (const list of responses) {
        if (list && list.length) results.push(...list);
      }
    }
    if (results.length > 0) {
      const seen = new Set();
      const unique = [];
      for (const item of results) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
      storeListingsCache = unique;
      return storeListingsCache;
    }
  } catch (err) {
    console.warn('Fallback store listings fetch error:', err);
  }
  return storeListingsCache || [];
}

async function fetchLiveStoreItemDetails(id) {
  const numId = String(id).replace(/\D/g, '');
  if (!numId) return null;
  if (itemOptionsCache.has(numId)) return itemOptionsCache.get(numId);

  try {
    const res = await fetch(`https://demo.inelabteamdev.com/api/v2/items/${numId}`);
    if (res.ok) {
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
      itemOptionsCache.set(numId, formatted);
      return formatted;
    }
  } catch (e) {}
  return null;
}

export const api = {
  /**
   * Search catalog products by title / brand / SKU with pagination
   */
  async searchProducts(params = {}) {
    let q = '';
    let category = '';
    let limit = 8;
    let offset = null;

    if (typeof params === 'string') {
      q = params;
    } else if (params && typeof params === 'object') {
      q = params.query || params.q || '';
      category = params.category || '';
      limit = params.limit !== undefined ? params.limit : 8;
      offset = params.offset !== undefined && params.offset !== null ? params.offset : null;
    }

    // Try backend search first
    try {
      const queryParams = new URLSearchParams();
      if (q) queryParams.set('q', q);
      if (category && category !== 'all') queryParams.set('category', category);
      if (limit) queryParams.set('limit', String(limit));
      if (offset !== null) queryParams.set('offset', String(offset));

      const res = await fetch(`${BASE_URL}/api/products/search?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // If backend returned paginated object with results, use it
        if (data && typeof data === 'object' && Array.isArray(data.results) && data.results.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Backend search unreachable, falling back to direct store catalog:', e);
    }

    // High-resilience fallback: Query 960 authentic store listings directly
    const listings = await fetchLiveStoreListings();
    const queryTerm = String(q || '').toLowerCase().trim();
    const catTerm = String(category || '').toLowerCase().trim();

    let matches = listings;
    if (catTerm && catTerm !== 'all') {
      matches = matches.filter((item) => (item.category || '').toLowerCase().includes(catTerm));
    }
    if (queryTerm) {
      const words = queryTerm.split(/\s+/).filter(Boolean);
      matches = matches.filter((item) => {
        const str = `${item.name || ''} ${item.brand || ''} ${item.category || ''} ${item.sku || ''} ${item.id || ''}`.toLowerCase();
        return words.every((w) => str.includes(w));
      });
    }

    const total = matches.length;
    const start = offset !== null ? offset : 0;
    const end = start + limit;
    const pageItems = matches.slice(start, end);

    const detailed = await Promise.all(
      pageItems.map(async (item) => {
        const details = await fetchLiveStoreItemDetails(item.id);
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
      results: detailed,
      total,
      hasMore: end < total
    };
  },

  /**
   * Fetch all actively tracked products
   */
  async getTrackedProducts() {
    const res = await fetch(`${BASE_URL}/api/products/tracked`);
    if (!res.ok) throw new Error('Failed to fetch tracked products');
    return await res.json();
  },

  /**
   * Track a product variant
   */
  async trackProduct({ storeProductId, productUrl, productName, selectedOption, imageUrl }) {
    const res = await fetch(`${BASE_URL}/api/products/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeProductId,
        productUrl,
        productName,
        selectedOption,
        imageUrl
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to track product');
    }
    return await res.json();
  },

  /**
   * Untrack a product
   */
  async untrackProduct(id) {
    const res = await fetch(`${BASE_URL}/api/products/track/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to untrack product');
    return await res.json();
  },

  /**
   * Fetch historical price records and scrape logs for a product
   */
  async getProductHistory(id) {
    const res = await fetch(`${BASE_URL}/api/products/${id}/history`);
    if (!res.ok) throw new Error('Failed to fetch product history');
    return await res.json();
  },

  /**
   * Get direct CSV download URL
   */
  getCSVExportUrl() {
    return `${BASE_URL}/api/export/csv`;
  }
};
