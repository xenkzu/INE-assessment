import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import PriceChart from './PriceChart';
import { X, Loader2, CheckCircle2, AlertTriangle, XCircle, TrendingDown, TrendingUp, ShieldCheck } from 'lucide-react';

export default function HistoryModal({ product, onClose }) {
  const [data, setData] = useState({ history: [], logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'logs'

  useEffect(() => {
    if (!product) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const targetId = product.id || product.store_product_id || product.storeProductId;
        const res = await api.getProductHistory(targetId);
        setData({
          history: res.priceHistory || res.history || [],
          logs: res.scrapeLogs || res.logs || []
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch product history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [product]);

  if (!product) return null;

  // Calculate high-level summary metrics
  const validPrices = (data.history || [])
    .map((h) => (h.price !== null && h.price !== undefined ? Number(h.price) : null))
    .filter((p) => p !== null);

  const currentPrice = validPrices.length > 0
    ? validPrices[validPrices.length - 1]
    : (product.latestPrice ?? product.last_scraped_price);

  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : currentPrice;
  const highestPrice = validPrices.length > 0 ? Math.max(...validPrices) : currentPrice;
  
  const latestStock = data.history.length > 0
    ? (data.history[data.history.length - 1].stock || data.history[data.history.length - 1].stock_status)
    : (product.latestStock || product.last_stock_status || 'In Stock');

  const successfulLogs = (data.logs || []).filter((l) => (l.outcome || l.status) === 'success' || (l.outcome || l.status) === 'retried').length;
  const reliabilityScore = data.logs.length > 0 ? Math.round((successfulLogs / data.logs.length) * 100) : 100;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatPrice = (val) => {
    if (val === null || val === undefined) return '—';
    const num = Number(val);
    if (isNaN(num)) return '—';
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getLogStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'success' || s === 'retried') {
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={14} /> Success
        </span>
      );
    }
    return (
      <span className="badge badge-failed">
        <XCircle size={14} /> Failed
      </span>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div className="dual-badge">
                <span className="dual-badge-left">STORE ID</span>
                <span className="dual-badge-right">{product.store_product_id}</span>
              </div>
              <span className="dark-pill" title={product.selected_option || 'Standard'} style={{ fontSize: '12px', padding: '5px 14px' }}>
                <span>{product.selected_option || 'Standard'}</span>
              </span>
            </div>

            {/* Clickable Product Title without Underline */}
            <h2 style={{ marginBottom: '6px', lineHeight: 1.4 }}>
              <a
                href={product.product_url || product.url || `https://demo.inelabteamdev.com/item/${product.store_product_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  display: 'inline-block',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#71717A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                title="Open product page on storefront"
              >
                {product.product_name}
              </a>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
              SKU: SK-{product.store_product_id} · Variant: <strong style={{ color: '#27272A' }}>{product.selected_option || 'Standard'}</strong>
            </p>
          </div>

          <button className="close-btn" onClick={onClose} title="Close Modal">
            <X size={20} />
          </button>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="modal-stat-grid">
          {/* 1. Current Price */}
          <div className="modal-stat-card">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Price
            </span>
            <div style={{ margin: '10px 0 6px 0', fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {formatPrice(currentPrice)}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-emerald-text)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-emerald)' }}></span>
              {latestStock || 'In Stock'}
            </span>
          </div>

          {/* 2. Lowest Recorded */}
          <div className="modal-stat-card">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Historical Lowest
            </span>
            <div style={{ margin: '10px 0 6px 0', fontSize: '24px', fontWeight: 700, color: 'var(--color-emerald-text)', letterSpacing: '-0.02em' }}>
              {formatPrice(lowestPrice)}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingDown size={14} color="var(--color-emerald)" />
              Lowest recorded price
            </span>
          </div>

          {/* 3. Highest Recorded */}
          <div className="modal-stat-card">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Historical Highest
            </span>
            <div style={{ margin: '10px 0 6px 0', fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {formatPrice(highestPrice)}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#71717A" />
              Peak selling price
            </span>
          </div>

          {/* 4. Scraper Reliability */}
          <div className="modal-stat-card">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Scrape Reliability
            </span>
            <div style={{ margin: '10px 0 6px 0', fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              {reliabilityScore}%
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--color-emerald)" />
              {data.logs.length} runs executed
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('chart')}
            className={`filter-chip ${activeTab === 'chart' ? 'active' : ''}`}
            style={{ fontSize: '16px', padding: '10px 20px' }}
          >
            Price Timeline ({data.history.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`filter-chip ${activeTab === 'logs' ? 'active' : ''}`}
            style={{ fontSize: '16px', padding: '10px 20px' }}
          >
            Scrape Audit Logs ({data.logs.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={24} className="spin-animation" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '16px' }}>Fetching telemetry and audit data...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: '16px 20px',
            background: 'var(--color-rose-bg)',
            color: 'var(--color-rose-text)',
            borderRadius: '20px',
            fontSize: '12px'
          }}>
            {error}
          </div>
        ) : activeTab === 'chart' ? (
          <div>
            {/* Recharts Price Timeline Chart */}
            <PriceChart history={data.history} />

            {/* Historical Records Table */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>Historical Price Snapshots</h3>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{data.history.length} records</span>
            </div>

            {data.history.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-canvas)', borderRadius: '20px', fontSize: '12px' }}>
                No price snapshots recorded yet.
              </div>
            ) : (
              <div className="data-table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>RECORDED TIMESTAMP</th>
                      <th>PRICE (INR)</th>
                      <th>STOCK STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((record) => {
                      const stockVal = record.stock || record.stock_status || 'In Stock';
                      const isOutOfStock = String(stockVal).toLowerCase().includes('out') || String(stockVal).toLowerCase().includes('sold');
                      return (
                        <tr key={record.id}>
                          <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {formatDate(record.recorded_at || record.created_at || record.timestamp)}
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-text)' }}>
                            {formatPrice(record.price)}
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: !isOutOfStock ? 'var(--color-emerald-text)' : 'var(--color-rose-text)',
                              backgroundColor: !isOutOfStock ? 'var(--color-emerald-bg)' : 'var(--color-rose-bg)',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-pill)'
                            }}>
                              ● {stockVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
                Scrape Execution Audit Trail
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Full telemetry of all Playwright browser sessions, extraction timings, and retry attempts.
              </p>
            </div>

            {data.logs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-canvas)', borderRadius: '20px', fontSize: '12px' }}>
                No scrape logs recorded yet.
              </div>
            ) : (
              <div className="data-table-container" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>TIMESTAMP</th>
                      <th>OUTCOME</th>
                      <th>DURATION</th>
                      <th>ATTEMPTS</th>
                      <th>DETAILS / STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {formatDate(log.timestamp || log.scraped_at || log.created_at)}
                        </td>
                        <td>{getLogStatusBadge(log.outcome || log.status)}</td>
                        <td style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                          {log.duration_ms ? `${Number(log.duration_ms).toLocaleString()} ms` : '—'}
                        </td>
                        <td style={{ fontSize: '12px', fontWeight: 600 }}>
                          {log.retry_count !== undefined && log.retry_count !== null ? log.retry_count + 1 : (log.attempts || 1)}
                        </td>
                        <td style={{ fontSize: '12px', color: log.error_message ? 'var(--color-rose-text)' : 'var(--color-text-muted)', maxWidth: '280px', wordBreak: 'break-word' }}>
                          {log.error_message || 'Session completed successfully'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
