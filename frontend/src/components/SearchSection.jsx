import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Plus, Check, Loader2, ChevronDown } from 'lucide-react';

export default function SearchSection({ onProductTracked, trackedProducts }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
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

  // Search catalog on query change (with debouncing)
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.searchProducts(query);
        setResults(data || []);

        // Set default option for each product if available
        const initialSelections = {};
        (data || []).forEach((item) => {
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
  }, [query]);

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
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-subtle)',
                pointerEvents: 'none'
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
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                fontSize: '16px',
                borderRadius: 'var(--radius-pill)',
                padding: '12px 52px 12px 48px',
                color: 'var(--color-text)',
                outline: 'none',
                fontFamily: 'var(--font-family)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
            <span style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              backgroundColor: '#F4F4F5',
              border: '1px solid var(--color-border)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)'
            }}>
              ⌘K
            </span>
          </div>

          {/* Category Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`filter-chip ${categoryFilter === cat.id ? 'active' : ''}`}
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
            const delayClass = `delay-${Math.min(8, (idx % 8) + 1)}`;

            return (
              <article key={product.id} className={`card-rounded animate-fade-in-scale ${delayClass}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
      )}
    </section>
  );
}
