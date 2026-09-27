const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ine-assessment-de8i.onrender.com';

export const api = {
  /**
   * Search catalog products by title / brand / SKU
   */
  async searchProducts(query) {
    const res = await fetch(`${BASE_URL}/api/products/search?q=${encodeURIComponent(query || '')}`);
    if (!res.ok) throw new Error('Failed to search catalog');
    return await res.json();
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
