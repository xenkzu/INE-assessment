import React, { useState } from 'react';
import { api } from '../api/client';
import { LineChart, AlertCircle } from 'lucide-react';

export default function TrackedList({ trackedProducts, onRefresh, onViewHistory }) {
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const handleUntrack = async (id, name) => {
    if (!window.confirm(`Are you sure you want to stop tracking "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await api.untrackProduct(id);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err.message || 'Failed to untrack product');
    } finally {
      setDeletingId(null);
    }
  };

  const formatPrice = (priceVal) => {
    if (priceVal === null || priceVal === undefined) return '—';
    const num = Number(priceVal);
    if (isNaN(num)) return '—';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Just now';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getStatusBadge = (status, lastScrapedAt) => {
    const s = String(status || '').toLowerCase();
    const timeAgo = formatTimeAgo(lastScrapedAt);

    if (s === 'pending' || s === 'processing' || s === 'syncing' || !status || s === '') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: '#52525B',
          backgroundColor: '#F4F4F5',
          border: '1px solid var(--color-border)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-amber)',
            display: 'inline-block'
          }}></span>
          <span>processing...</span>
        </span>
      );
    } else if (s === 'success' || s === 'retried') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-emerald-text)',
          backgroundColor: 'var(--color-emerald-bg)',
          border: '1px solid var(--color-emerald-border)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-emerald)' }}></span>
          <span>success · {timeAgo}</span>
        </span>
      );
    } else {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-rose-text)',
          backgroundColor: 'var(--color-rose-bg)',
          border: '1px solid var(--color-rose-border)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-rose)' }}></span>
          <span>failed · {timeAgo}</span>
        </span>
      );
    }
  };

  const getStockBadge = (stockText) => {
    const s = String(stockText || 'In Stock').toLowerCase();
    if (s.includes('out') || s.includes('sold')) {
      return (
        <span style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 500,
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-rose-bg)',
          color: 'var(--color-rose-text)'
        }}>
          ✕ Out of Stock
        </span>
      );
    }
    if (s.includes('low') || (s.includes('left') && parseInt(s) <= 5)) {
      return (
        <span style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 500,
          padding: '4px 12px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'var(--color-amber-bg)',
          color: 'var(--color-amber-text)'
        }}>
          ● {stockText || 'Low Stock'}
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-block',
        fontSize: '12px',
        fontWeight: 500,
        padding: '4px 12px',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: 'var(--color-emerald-bg)',
        color: 'var(--color-emerald-text)'
      }}>
        ● {stockText || 'In Stock'}
      </span>
    );
  };

  return (
    <section className="section-container animate-fade-in-up delay-1">
      {/* Section Header with Metrics */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px', marginBottom: '36px' }}>
        <div>
          <h2 className="title-h1">Tracked Products</h2>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
            Active inventory scrapers running on scheduled crons.
          </p>
        </div>

        {/* Metric Badges Group */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', paddingTop: '6px' }}>
          <div className="card-rounded" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27272A' }}></span>
            <span style={{ fontSize: '12px', color: '#52525B' }}>
              Active Tracked Count: <strong style={{ color: '#27272A', fontSize: '12px' }}>{trackedProducts.length} Items</strong>
            </span>
          </div>

          <div className="card-rounded" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-emerald)' }}></span>
            <span style={{ fontSize: '12px', color: '#52525B' }}>
              Auto-Scrape Frequency: <strong style={{ color: '#27272A', fontSize: '12px' }}>Every 2h</strong>
            </span>
          </div>

          <div className="card-rounded" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--color-emerald-text)', fontWeight: 600, fontSize: '12px' }}>99.4%</span>
            <span style={{ fontSize: '12px', color: '#52525B' }}>Scraper Health</span>
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

      {/* Tracked Cards Grid */}
      {trackedProducts.length === 0 ? (
        <div className="card-rounded animate-fade-in-scale" style={{ textAlign: 'center', padding: '72px 32px', color: 'var(--color-text-muted)' }}>
          <AlertCircle size={40} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-text)', marginBottom: '8px' }}>No tracked products yet</p>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>Search the store catalog below to pick products and options to monitor.</p>
        </div>
      ) : (
        <div className="grid-responsive-4">
          {trackedProducts.map((p, idx) => {
            const isDeleting = deletingId === p.id;
            const name = p.product_name || p.name || 'Product';
            const url = p.product_url || p.url || (p.store_product_id ? `https://demo.inelabteamdev.com/item/${p.store_product_id}` : '#');
            const option = p.selected_option || p.option || 'Standard';
            const price = p.latestPrice ?? p.last_scraped_price;
            const stock = p.latestStock ?? p.last_stock_status;
            const scrapedAt = p.lastScrapedAt ?? p.last_scraped_at;
            const status = p.lastOutcome ?? p.last_scrape_status ?? 'pending';
            const delayClass = `delay-${Math.min(8, (idx % 8) + 1)}`;

            return (
              <div key={p.id} className={`card-rounded animate-fade-in-scale ${delayClass}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  {/* Card Header Pills */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '18px' }}>
                    <span className="dark-pill" title={option} style={{ fontSize: '12px', padding: '5px 14px' }}>
                      <span>{option}</span>
                    </span>
                    {getStatusBadge(status, scrapedAt)}
                  </div>

                  {/* Brand & Category */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Store Item
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>• ID: {p.store_product_id}</span>
                  </div>

                  {/* Title (Clickable link without underline) */}
                  <h3 style={{ marginBottom: '6px', lineHeight: 1.4 }}>
                    <a
                      href={url}
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
                      {name}
                    </a>
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-subtle)', marginBottom: '20px' }}>
                    SKU: SK-{p.store_product_id}
                  </p>

                  {/* Price (24px) or Skeleton Loader */}
                  <div style={{ marginBottom: '16px', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                    {price === null || price === undefined ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="skeleton-shimmer" style={{ width: '110px', height: '26px', borderRadius: '8px' }}></div>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>syncing...</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)' }}>
                          {formatPrice(price)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>tax incl.</span>
                      </div>
                    )}
                  </div>

                  {/* Stock Status or Skeleton Loader */}
                  <div style={{ marginBottom: '24px', minHeight: '26px', display: 'flex', alignItems: 'center' }}>
                    {price === null || price === undefined ? (
                      <div className="skeleton-shimmer" style={{ width: '85px', height: '22px', borderRadius: 'var(--radius-pill)' }}></div>
                    ) : (
                      getStockBadge(stock)
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ paddingTop: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    className="btn-pill-primary"
                    style={{ flex: 1, fontSize: '12px', padding: '10px 16px' }}
                    onClick={() => onViewHistory(p)}
                    title="Open price history chart and scrape audit table"
                  >
                    <LineChart size={14} />
                    <span>View Chart & Audit</span>
                  </button>

                  <button
                    className="btn-pill-danger"
                    disabled={isDeleting}
                    onClick={() => handleUntrack(p.id, name)}
                    title="Stop monitoring this variant"
                  >
                    <span>Untrack</span>
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
