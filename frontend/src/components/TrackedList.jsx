import React, { useState } from 'react';
import { api } from '../api/client';
import { LineChart, Trash2, ExternalLink, Clock, AlertCircle } from 'lucide-react';

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

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'success':
        return <span className="badge badge-success">Success</span>;
      case 'retried':
        return <span className="badge badge-retried">Retried</span>;
      case 'failed':
        return <span className="badge badge-failed">Failed</span>;
      default:
        return <span className="badge badge-pending">{status || 'Pending'}</span>;
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Pending first scrape';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatPrice = (priceVal) => {
    if (priceVal === null || priceVal === undefined) return '—';
    const num = Number(priceVal);
    if (isNaN(num)) return '—';
    // If integer cents (e.g. 48639), convert to $486.39 if large or display as dollar
    const displayNum = num > 1000 && Number.isInteger(num) ? num / 100 : num;
    return `$${displayNum.toFixed(2)}`;
  };

  return (
    <section className="card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 className="section-topic">Active Tracked Products</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Products currently monitored. Scheduled checks run automatically every 2 hours.
          </p>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)', background: '#f0f0f0', padding: '4px 12px', borderRadius: '16px' }}>
          {trackedProducts.length} {trackedProducts.length === 1 ? 'Product' : 'Products'}
        </span>
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

      {trackedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
          <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>No tracked products yet</p>
          <p style={{ fontSize: '14px' }}>Use the catalog search above to select and track items.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product & Option</th>
                <th>Current Price</th>
                <th>Stock</th>
                <th>Last Scraped</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trackedProducts.map((p) => {
                const isDeleting = deletingId === p.id;
                const name = p.product_name || p.name || 'Product';
                const url = p.product_url || p.url || `https://demo.inelabteamdev.com/item/${p.store_product_id}`;
                const option = p.selected_option || p.option || 'Standard';
                const price = p.latestPrice ?? p.last_scraped_price;
                const stock = p.latestStock ?? p.last_stock_status;
                const scrapedAt = p.lastScrapedAt ?? p.last_scraped_at;
                const status = p.lastOutcome ?? p.last_scrape_status ?? 'pending';

                return (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-text)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{name}</span>
                          <ExternalLink size={13} style={{ opacity: 0.6 }} />
                        </a>
                        {option && (
                          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Option: <strong style={{ color: '#444' }}>{option}</strong>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '16px' }}>
                        {formatPrice(price)}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '14px',
                        color: stock === 'In Stock'
                          ? 'var(--color-success)'
                          : String(stock || '').includes('Low')
                          ? 'var(--color-warning)'
                          : 'var(--color-text-muted)'
                      }}>
                        {stock || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        {formatDateTime(scrapedAt)}
                      </span>
                    </td>
                    <td>
                      {getStatusBadge(status)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn"
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                          onClick={() => onViewHistory(p)}
                          title="View price history and scrape audit logs"
                        >
                          <LineChart size={14} />
                          <span>History</span>
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px 10px' }}
                          disabled={isDeleting}
                          onClick={() => handleUntrack(p.id, name)}
                          title="Untrack product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
