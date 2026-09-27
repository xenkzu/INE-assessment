import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Search, Plus, Check, Loader2, Package } from 'lucide-react';

export default function SearchSection({ onProductTracked, trackedProducts }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [trackingId, setTrackingId] = useState(null);
  const [error, setError] = useState(null);

  // Search catalog on query change (with initial fetch)
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.searchProducts(query);
        setResults(data);

        // Set default option for each product
        const initialSelections = {};
        data.forEach((p) => {
          if (p.options && p.options.length > 0) {
            initialSelections[p.id] = p.options[0].name || p.options[0];
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

  const handleTrack = async (product) => {
    const chosenOption = selectedOptions[product.id] || (product.options?.[0]?.name || 'Default');
    setTrackingId(`${product.id}_${chosenOption}`);
    setError(null);

    try {
      await api.trackProduct({
        storeProductId: product.id,
        productUrl: product.url,
        productName: product.title,
        selectedOption: chosenOption,
        imageUrl: product.image
      });
      if (onProductTracked) {
        await onProductTracked();
      }
    } catch (err) {
      setError(err.message || 'Failed to track product');
    } finally {
      setTrackingId(null);
    }
  };

  // Check if a specific product & option is already tracked
  const isAlreadyTracked = (productId, option) => {
    return trackedProducts?.some(
      (tp) => tp.store_product_id === productId && tp.selected_option === option
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
          {results.map((product) => {
            const currentOption = selectedOptions[product.id] || (product.options?.[0]?.name || 'Default');
            const isTracked = isAlreadyTracked(product.id, currentOption);
            const isCurrentlyTracking = trackingId === `${product.id}_${currentOption}`;

            return (
              <div key={product.id} className="product-item-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {product.title}
                    </h3>
                    {product.brand && (
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px' }}>
                        {product.brand}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                    {product.category || 'Store Item'}
                  </p>

                  {product.options && product.options.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                        Select Option / Variant:
                      </label>
                      <select
                        className="select-box"
                        style={{ width: '100%' }}
                        value={currentOption}
                        onChange={(e) => handleOptionChange(product.id, e.target.value)}
                      >
                        {product.options.map((opt) => {
                          const optName = typeof opt === 'string' ? opt : opt.name;
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
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                    {product.price ? `$${product.price}` : 'Check Price'}
                  </span>

                  <button
                    className={`btn ${isTracked ? '' : 'btn-primary'}`}
                    disabled={isTracked || isCurrentlyTracking}
                    onClick={() => handleTrack(product)}
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
