import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Download, RefreshCw } from 'lucide-react';

export default function Header({ onRefresh, loading }) {
  const [countdown, setCountdown] = useState('');

  const handleExportCSV = () => {
    window.open(api.getCSVExportUrl(), '_blank');
  };

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Anchor target: Today at 23:30:00 (11:30:00 PM)
      const anchor = new Date(now);
      anchor.setHours(23, 30, 0, 0);

      const intervalMs = 2 * 60 * 60 * 1000; // 2 hours
      let target = anchor.getTime();

      if (now.getTime() > target) {
        const diff = now.getTime() - target;
        const cycles = Math.floor(diff / intervalMs) + 1;
        target += cycles * intervalMs;
      } else {
        while (target - intervalMs > now.getTime()) {
          target -= intervalMs;
        }
      }

      const remainingMs = Math.max(0, target - now.getTime());
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setCountdown(`in ${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s`);
      } else if (minutes > 0) {
        setCountdown(`in ${minutes}m ${seconds.toString().padStart(2, '0')}s`);
      } else {
        setCountdown(`in ${seconds}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="animate-fade-in-up" style={{ marginBottom: '64px', borderBottom: '1px solid var(--color-border)', paddingBottom: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '28px' }}>
        {/* Main Topic Heading & Subtitle */}
        <div>
          <h1 className="title-h1">Product Price Tracker</h1>
          <p style={{ fontSize: '16px', color: 'var(--color-text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
            Automated real-time competitor price monitoring and stock auditing engine.
          </p>
        </div>

        {/* Global Status Badges & Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', paddingTop: '6px' }}>
          {/* Dual Badge Next Run with Live 2h Countdown */}
          <div className="dual-badge animate-fade-in-scale" style={{ animationDelay: '140ms' }} title="Next scheduled batch scrape run">
            <span className="dual-badge-left">NEXT RUN</span>
            <span className="dual-badge-right" style={{ fontVariantNumeric: 'tabular-nums', minWidth: '95px', textAlign: 'center' }}>
              {countdown || 'Calculating...'}
            </span>
          </div>

          <button
            className="btn-pill-secondary animate-fade-in-scale"
            style={{ animationDelay: '280ms' }}
            onClick={onRefresh}
            disabled={loading}
            title="Refresh active tracker data"
          >
            <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          <button
            className="btn-pill-secondary animate-fade-in-scale"
            style={{ animationDelay: '420ms' }}
            onClick={handleExportCSV}
            title="Download historical price audit records as CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
}
