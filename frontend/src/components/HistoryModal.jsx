import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import PriceChart from './PriceChart';
import { X, Loader2, Calendar, Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

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
        const res = await api.getProductHistory(product.id);
        setData({
          history: res.history || [],
          logs: res.logs || []
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

  const getLogStatusBadge = (status) => {
    if (status === 'success') {
      return (
        <span className="badge badge-success" style={{ gap: '4px' }}>
          <CheckCircle size={12} /> Success
        </span>
      );
    }
    if (status === 'retried') {
      return (
        <span className="badge badge-retried" style={{ gap: '4px' }}>
          <AlertTriangle size={12} /> Retried
        </span>
      );
    }
    return (
      <span className="badge badge-failed" style={{ gap: '4px' }}>
        <XCircle size={12} /> Failed
      </span>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
              {product.product_name}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
              Selected Option: <strong style={{ color: '#222' }}>{product.selected_option || 'Default'}</strong>
              <span style={{ margin: '0 8px' }}>•</span>
              Store ID: {product.store_product_id}
            </p>
          </div>

          <button className="close-btn" onClick={onClose} title="Close Modal">
            <X size={22} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('chart')}
            style={{
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'chart' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'chart' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer'
            }}
          >
            Price History ({data.history.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            style={{
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '15px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'logs' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'logs' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer'
            }}
          >
            Scrape Audit Logs ({data.logs.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={24} className="spin-animation" style={{ marginBottom: '8px' }} />
            <p>Loading history records...</p>
          </div>
        ) : error ? (
          <div style={{
            padding: '14px',
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius)'
          }}>
            {error}
          </div>
        ) : activeTab === 'chart' ? (
          <div>
            {/* SVG Visual Graph */}
            <PriceChart history={data.history} />

            {/* Price Table */}
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>Historical Records</h3>
            {data.history.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>No price records recorded yet.</p>
            ) : (
              <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Recorded At</th>
                      <th>Price</th>
                      <th>Stock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((record) => (
                      <tr key={record.id}>
                        <td style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                          {formatDate(record.recorded_at)}
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '15px' }}>
                          {record.price !== null ? `₹${Number(record.price).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '13px',
                            color: record.stock_status === 'In Stock' ? 'var(--color-success)' : 'var(--color-text-muted)'
                          }}>
                            {record.stock_status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>Scrape Execution Logs</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Full audit trail of all scheduled & on-demand Playwright scraping attempts, durations, and retry statuses.
            </p>

            {data.logs.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', padding: '16px 0' }}>No scrape logs recorded yet.</p>
            ) : (
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Attempts</th>
                      <th>Details / Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                          {formatDate(log.scraped_at)}
                        </td>
                        <td>{getLogStatusBadge(log.status)}</td>
                        <td style={{ fontSize: '13px' }}>
                          {log.duration_ms ? `${log.duration_ms} ms` : '—'}
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>
                          {log.attempts || 1}
                        </td>
                        <td style={{ fontSize: '13px', color: log.error_message ? 'var(--color-error)' : 'var(--color-text-muted)', maxWidth: '240px', wordBreak: 'break-word' }}>
                          {log.error_message || 'Completed without errors'}
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
