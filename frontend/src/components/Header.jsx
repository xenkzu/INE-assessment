import React from 'react';
import { api } from '../api/client';
import { Download, RefreshCw } from 'lucide-react';

export default function Header({ onRefresh, loading }) {
  const handleExportCSV = () => {
    window.open(api.getCSVExportUrl(), '_blank');
  };

  return (
    <header className="header-bar">
      <div>
        <h1 className="page-topic">Price Tracker</h1>
        <p className="header-subtitle">
          Automated web scraping & price monitoring for mock store catalog
        </p>
      </div>

      <div className="header-actions">
        <button
          className="btn"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh tracked products"
        >
          <RefreshCw size={16} className={loading ? 'spin-animation' : ''} />
          <span>Refresh</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={handleExportCSV}
          title="Download complete price history as CSV"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>
    </header>
  );
}
