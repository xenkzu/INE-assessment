import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import TrackedList from './components/TrackedList';
import HistoryModal from './components/HistoryModal';

export default function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);

  const fetchTrackedProducts = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await api.getTrackedProducts();
      setTrackedProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch tracked products');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackedProducts(true);
  }, []);

  // Real-time auto-polling: refresh in background if any product is currently syncing/pending
  useEffect(() => {
    const hasPending = trackedProducts.some(
      (p) => p.latestPrice === null || p.latestPrice === undefined || p.lastOutcome === 'pending' || p.lastOutcome === 'processing'
    );

    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchTrackedProducts(false);
    }, 1500);

    return () => clearInterval(interval);
  }, [trackedProducts]);

  return (
    <main className="app-container">
      <Header onRefresh={fetchTrackedProducts} loading={loading} />

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius)',
          marginBottom: '24px',
          fontSize: '15px'
        }}>
          {error}
        </div>
      )}

      {/* Active Tracked Products List (First Section) */}
      <TrackedList
        trackedProducts={trackedProducts}
        onRefresh={fetchTrackedProducts}
        onViewHistory={(product) => setSelectedProductForHistory(product)}
      />

      {/* Discover More Products Section (Second Section) */}
      <SearchSection
        onProductTracked={fetchTrackedProducts}
        trackedProducts={trackedProducts}
      />

      {/* Price History & Audit Log Modal */}
      {selectedProductForHistory && (
        <HistoryModal
          product={selectedProductForHistory}
          onClose={() => setSelectedProductForHistory(null)}
        />
      )}
    </main>
  );
}
