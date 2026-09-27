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

  const fetchTrackedProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTrackedProducts();
      setTrackedProducts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch tracked products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackedProducts();
  }, []);

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

      {/* Catalog Search & Track Section */}
      <SearchSection
        onProductTracked={fetchTrackedProducts}
        trackedProducts={trackedProducts}
      />

      {/* Active Tracked Products List */}
      <TrackedList
        trackedProducts={trackedProducts}
        onRefresh={fetchTrackedProducts}
        onViewHistory={(product) => setSelectedProductForHistory(product)}
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
