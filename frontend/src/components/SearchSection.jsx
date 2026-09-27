import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Plus, Check, Loader2, ChevronDown } from 'lucide-react';

export default function SearchSection({ onProductTracked, trackedProducts }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [trackingKey, setTrackingKey] = useState(null);
  const [error, setError] = useState(null);

  // Helper to safely extract option string from string or object
  const getOptionLabel = (opt) => {
    if (!opt) return 'Standard';
    if (typeof opt === 'string') return opt;
    return opt.label || opt.name || opt.id || String(opt);
  };

  // Helper to extract product properties
  const getProductInfo = (p) => {
    const id = p.storeProductId || p.id;
    const name = p.name || p.title || 'Product';
    const url = p.productUrl || p.url || `https://demo.inelabteamdev.com/item/${id}`;
    const brand = p.brand || '';
    const category = p.category || 'General';
    const optionAxis = p.optionAxis || 'Option';
    const options = Array.isArray(p.options) ? p.options : [];
    const image = p.imageUrl || p.image || null;
    const specs = p.specs || {};
    return { id, name, url, brand, category, optionAxis, options, image, specs };
  };

  // Search catalog on query/category change (fetches first 2 rows = 8 items)
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.searchProducts({
          query,
          category: categoryFilter,
          limit: 8,
          offset: 0
        });

        const items = data.results || (Array.isArray(data) ? data : []);
        setResults(items);
        setHasMore(data.hasMore ?? (items.length < (data.total || 0)));
        setTotalCount(data.total || items.length);

        // Set default option for each product if available
        const initialSelections = {};
        items.forEach((item) => {
          const info = getProductInfo(item);
          if (info.options.length > 0) {
            const firstOpt = getOptionLabel(info.options[0]);
            initialSelections[info.id] = firstOpt;
          }
        });
        setSelectedOptions((prev) => ({ ...initialSelections, ...prev }));
      } catch (err) {
        setError('Failed to load store catalog');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchCatalog, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, categoryFilter]);

  // Load 1 more row (4 products) on demand from the 48 pages of the store catalog
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await api.searchProducts({
        query,
        category: categoryFilter,
        limit: 4, // 1 row = 4 products
        offset: results.length
      });

      const newItems = data.results || (Array.isArray(data) ? data : []);
      setResults((prev) => {
        // Deduplicate by store product ID
        const existingIds = new Set(prev.map((p) => p.storeProductId || p.id));
        const uniqueNew = newItems.filter((p) => !existingIds.has(p.storeProductId || p.id));
        return [...prev, ...uniqueNew];
      });

      setHasMore(data.hasMore ?? (results.length + newItems.length < (data.total || 0)));
      if (data.total !== undefined) setTotalCount(data.total);

      // Set default options for new products
      const newSelections = {};
      newItems.forEach((item) => {
        const info = getProductInfo(item);
        if (info.options.length > 0) {
          const firstOpt = getOptionLabel(info.options[0]);
          newSelections[info.id] = firstOpt;
        }
      });
      setSelectedOptions((prev) => ({ ...newSelections, ...prev }));
    } catch (err) {
      setError('Failed to load more products');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOptionChange = (productId, optionName) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [productId]: optionName
    }));
  };

  const handleTrack = async (item) => {
    const info = getProductInfo(item);
    const chosenOption =
      selectedOptions[info.id] ||
      (info.options.length > 0
        ? getOptionLabel(info.options[0])
        : 'Standard');

    const key = `${info.id}_${chosenOption}`;
    setTrackingKey(key);
    setError(null);

    try {
      await api.trackProduct({
        storeProductId: String(info.id),
        productUrl: info.url,
        productName: info.name,
        selectedOption: chosenOption,
        imageUrl: info.image
      });
      if (onProductTracked) {
        await onProductTracked();
      }
    } catch (err) {
      setError(err.message || 'Failed to track product');
    } finally {
      setTrackingKey(null);
    }
  };

  const isAlreadyTracked = (productId, option) => {
    return trackedProducts?.some(
      (tp) => String(tp.store_product_id) === String(productId) && tp.selected_option === option
    );
  };

  // Filter out products that are already tracked, and apply category filter
  const filteredResults = results.filter((item) => {
    const info = getProductInfo(item);
    
    // If product is already in tracked products, remove it from discover list
    const isTracked = trackedProducts?.some(
      (tp) => String(tp.store_product_id) === String(info.id)
    );
    if (isTracked) return false;

    if (categoryFilter === 'all') return true;
    const cat = (item.category || '').toLowerCase();
    return cat.includes(categoryFilter.toLowerCase());
  });

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'tablets', label: 'Tablets' },
    { id: 'cameras', label: 'Cameras' },
    { id: 'audio', label: 'Audio' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'lighting', label: 'Lighting' },
    { id: 'office', label: 'Office' }
  ];

  // ⌘K / Ctrl+K keyboard shortcut focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="section-container animate-fade-in-up delay-2">
      {/* Section Topic */}
      <div style={{ marginBottom: '36px' }}>
        <h2 className="title-h1">Discover More Products</h2>
        <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
          Browse indexed store inventory and select variants to add to your tracking schedule.
        </p>
      </div>

      {/* Search Bar & Category Filter Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          {/* Sleek Search Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px', height: '42px', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '18px',
                color: 'var(--color-text-subtle)',
                pointerEvents: 'none',
                zIndex: 2
              }}
            />
            <input
              type="text"
              id="catalog-search"
              placeholder="Search by Name, Brand, SKU, Category, or ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                boxSizing: 'border-box',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                fontSize: '14px',
                borderRadius: 'var(--radius-pill)',
                padding: '0 52px 0 46px',
                color: 'var(--color-text)',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                transition: 'border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#27272A';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(39, 39, 42, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <span style={{
              position: 'absolute',
              right: '14px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              backgroundColor: '#F4F4F5',
              border: '1px solid var(--color-border)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              pointerEvents: 'none',
              zIndex: 2
            }}>
              ⌘K
            </span>
          </div>

          {/* Category Filter Chips with Smooth Cascading Stagger */}
          <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                className={`filter-chip animate-fade-in-scale ${categoryFilter === cat.id ? 'active' : ''}`}
                style={{ animationDelay: `${idx * 110}ms` }}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px 20px',
          background: 'var(--color-rose-bg)',
          color: 'var(--color-rose-text)',
          borderRadius: '20px',
          marginBottom: '28px',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--color-text-muted)', padding: '72px 0' }}>
          <Loader2 size={24} className="spin-animation" />
          <span style={{ fontSize: '16px', fontWeight: 500 }}>Searching live store catalog...</span>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="card-rounded animate-fade-in-scale" style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--color-text-muted)' }}>
          <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text)' }}>No products matched your search</p>
          <p style={{ fontSize: '16px', marginTop: '6px' }}>Try searching by another term or clearing the category filter.</p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="grid-responsive-4" id="catalog-grid">
            {filteredResults.map((rawProduct, idx) => {
              const product = getProductInfo(rawProduct);
              const currentOption =
                selectedOptions[product.id] ||
                (product.options.length > 0
                  ? getOptionLabel(product.options[0])
                  : 'Standard');

              const isTracked = isAlreadyTracked(product.id, currentOption);
              const isCurrentlyTracking = trackingKey === `${product.id}_${currentOption}`;

              return (
                <article
                  key={product.id}
                  className="card-rounded animate-fade-in-scale"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    animationDelay: `${(idx % 12) * 120}ms`
                  }}
                >
                  <div>
                    {/* Top Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                      <span className="dark-pill" title={`${product.category || 'Item'} · ID: ${product.id}`} style={{ fontSize: '12px', padding: '5px 14px' }}>
                        <span>{product.category || 'Item'} · ID: {product.id}</span>
                      </span>
                      {product.brand && (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {product.brand}
                        </span>
                      )}
                    </div>

                    {/* Title & Description (Clickable link without underline) */}
                    <h3 style={{ marginBottom: '6px', lineHeight: 1.4 }}>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                          letterSpacing: '-0.01em',
                          textDecoration: 'none',
                          display: 'inline-block',
                          cursor: 'pointer',
                          transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#71717A')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                        title="Open product page on storefront"
                      >
                        {product.name}
                      </a>
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4, marginBottom: '20px' }}>
                      SKU: {product.specs?.material || 'SKU'}-{product.id} · {product.specs?.warranty || 'Store Warranty'}
                    </p>

                    {/* Dynamic Variant Selector */}
                    {product.options && product.options.length > 0 && (
                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                          Select {product.optionAxis || 'Option'}:
                        </label>
                        <div style={{ position: 'relative' }}>
                          <select
                            style={{
                              width: '100%',
                              backgroundColor: '#F4F4F5',
                              border: '1px solid var(--color-border)',
                              fontSize: '12px',
                              fontWeight: 500,
                              borderRadius: '12px',
                              padding: '10px 36px 10px 14px',
                              color: 'var(--color-text)',
                              appearance: 'none',
                              outline: 'none',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-family)'
                            }}
                            value={currentOption}
                            onChange={(e) => handleOptionChange(product.id, e.target.value)}
                          >
                            {product.options.map((opt) => {
                              const optName = getOptionLabel(opt);
                              return (
                                <option key={optName} value={optName}>
                                  {optName}
                                </option>
                              );
                            })}
                          </select>
                          <ChevronDown
                            size={14}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--color-text-muted)',
                              pointerEvents: 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Track Button */}
                  <div style={{ marginTop: '16px' }}>
                    <button
                      className={
                        isCurrentlyTracking
                          ? 'btn-pill-disabled'
                          : isTracked
                          ? 'btn-pill-disabled'
                          : 'btn-pill-primary'
                      }
                      style={{ width: '100%', padding: '10px 18px', fontSize: '12px' }}
                      disabled={isTracked || isCurrentlyTracking}
                      onClick={() => handleTrack(rawProduct)}
                    >
                      {isCurrentlyTracking ? (
                        <>
                          <Loader2 size={14} className="spin-animation" />
                          <span>Syncing Initial Price...</span>
                        </>
                      ) : isTracked ? (
                        <span style={{ color: 'var(--color-emerald-text)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} />
                          <span>Tracked ✓</span>
                        </span>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Track Product</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Fade Gradient Overlay & Dynamic Load More Row Button */}
          {hasMore && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '-16px',
                right: '-16px',
                height: '320px',
                background: 'linear-gradient(180deg, rgba(246, 246, 248, 0) 0%, rgba(246, 246, 248, 0.45) 30%, rgba(246, 246, 248, 0.88) 65%, var(--color-canvas) 92%, var(--color-canvas) 100%)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '24px',
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-pill-primary"
                  style={{
                    padding: '0 28px',
                    minHeight: '42px',
                    height: '42px',
                    fontSize: '12px',
                    fontWeight: 600,
                    boxShadow: '0 12px 30px -4px rgba(39, 39, 42, 0.35), 0 4px 12px -2px rgba(39, 39, 42, 0.15)',
                    cursor: loadingMore ? 'not-allowed' : 'pointer'
                  }}
                  title="Load one more row of products"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={15} className="spin-animation" />
                      <span>Fetching Next Row...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown size={15} />
                      <span>Load More Products ({totalCount > results.length ? `${totalCount - results.length} available` : 'Next row'})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
