import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Plus, Check, Loader2 } from 'lucide-react';

export default function SearchSection({ onProductTracked, trackedProducts }) {
  const [query, setQuery] = useState('');
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

  // Helper to extract product properties regardless of naming convention
  const getProductInfo = (p) => {
    const id = p.storeProductId || p.id;
    const name = p.name || p.title || 'Product';
    const url = p.productUrl || p.url || `https://demo.inelabteamdev.com/item/${id}`;
    const brand = p.brand || '';
    const category = p.category || '';
    const optionAxis = p.optionAxis || 'Option';
    const options = Array.isArray(p.options) ? p.options : [];
    const image = p.imageUrl || p.image || null;
    return { id, name, url, brand, category, optionAxis, options, image };
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

  // Check if a specific product & option is already tracked
  const isAlreadyTracked = (productId, option) => {
    return trackedProducts?.some(
      (tp) => String(tp.store_product_id) === String(productId) && tp.selected_option === option
    );
  };

  return (
    <section className="card-panel">
      <h2 className="section-topic">Add Products to Track</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
        Search the mock store catalog and pick options to track real-time prices every 2 hours.
      </p>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          className="input-text"
          style={{ paddingLeft: '42px' }}
          placeholder="Search catalog products (e.g. Zen, Roller, Synthesizer)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)'
          }}
        />
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius)',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', padding: '20px 0' }}>
          <Loader2 size={18} className="spin-animation" />
          <span>Searching catalog...</span>
        </div>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>
          No products matched your search query.
        </p>
      ) : (
        <div className="grid-cards">
          {results.map((rawProduct) => {
            const product = getProductInfo(rawProduct);
            const currentOption =
              selectedOptions[product.id] ||
              (product.options.length > 0
                ? getOptionLabel(product.options[0])
                : 'Standard');

            const isTracked = isAlreadyTracked(product.id, currentOption);
            const isCurrentlyTracking = trackingKey === `${product.id}_${currentOption}`;

            return (
              <div key={product.id} className="product-item-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {product.name}
                    </h3>
                    {product.brand && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>
                        {product.brand}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                    {product.category || 'Store Item'} • ID: {product.id}
                  </p>

                  {product.options && product.options.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                        Select {product.optionAxis || 'Option'}:
                      </label>
                      <select
                        className="select-box"
                        style={{ width: '100%' }}
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
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-light)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Auto-scraped 2h
                  </span>

                  <button
                    className={`btn ${isTracked ? '' : 'btn-primary'}`}
                    disabled={isTracked || isCurrentlyTracking}
                    onClick={() => handleTrack(rawProduct)}
                    style={{ padding: '8px 14px', fontSize: '14px' }}
                  >
                    {isCurrentlyTracking ? (
                      <>
                        <Loader2 size={14} className="spin-animation" />
                        <span>Tracking & Scraping...</span>
                      </>
                    ) : isTracked ? (
                      <>
                        <Check size={14} color="var(--color-success)" />
                        <span>Tracked</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Track Product</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
