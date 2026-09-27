import React, { useState } from 'react';

export default function PriceChart({ history }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Filter out any failed scrapes without prices and sort chronologically
  const validPoints = (history || [])
    .filter((h) => h.price !== null && h.price !== undefined)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  if (validPoints.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', background: '#fafafa', borderRadius: 'var(--radius)' }}>
        No valid price points recorded yet.
      </div>
    );
  }

  // Chart Dimensions
  const width = 680;
  const height = 220;
  const padding = { top: 24, right: 30, bottom: 36, left: 54 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const prices = validPoints.map((p) => Number(p.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice === minPrice ? 10 : maxPrice - minPrice;

  const minDisplay = Math.max(0, Math.floor(minPrice - priceRange * 0.1));
  const maxDisplay = Math.ceil(maxPrice + priceRange * 0.1);
  const displayRange = maxDisplay - minDisplay;

  // Map data to SVG coordinates
  const points = validPoints.map((item, index) => {
    const x =
      validPoints.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (index / (validPoints.length - 1)) * chartWidth;
    const y =
      padding.top +
      chartHeight -
      ((Number(item.price) - minDisplay) / displayRange) * chartHeight;
    return { ...item, x, y, priceNum: Number(item.price) };
  });

  const pathD =
    points.length === 1
      ? ''
      : points.reduce((acc, curr, idx) => {
          return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
        }, '');

  // Grid lines
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const priceVal = minDisplay + (displayRange / gridSteps) * i;
    const yVal = padding.top + chartHeight - (i / gridSteps) * chartHeight;
    return { priceVal, yVal };
  });

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', marginBottom: '24px' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      >
        {/* Background grid */}
        {gridLines.map(({ priceVal, yVal }, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={yVal}
              x2={width - padding.right}
              y2={yVal}
              stroke="#ececec"
              strokeDasharray={idx === 0 ? 'none' : '3,3'}
            />
            <text
              x={padding.left - 8}
              y={yVal + 4}
              fontSize="11"
              fill="#888"
              textAnchor="end"
              fontFamily="var(--font-family)"
            >
              ${priceVal.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Price Trend Line */}
        {points.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data Circles */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill="#ffffff"
                stroke="var(--color-primary)"
                strokeWidth={isHovered ? 3 : 2}
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* X Axis Date labels (show first, middle, last) */}
              {(idx === 0 || idx === points.length - 1 || (points.length > 3 && idx === Math.floor(points.length / 2))) && (
                <text
                  x={pt.x}
                  y={height - 8}
                  fontSize="11"
                  fill="#888"
                  textAnchor={idx === 0 ? 'start' : idx === points.length - 1 ? 'end' : 'middle'}
                  fontFamily="var(--font-family)"
                >
                  {formatDate(pt.recorded_at)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <div
          style={{
            position: 'absolute',
            left: `${(points[hoveredIndex].x / width) * 100}%`,
            top: `${(points[hoveredIndex].y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            background: 'var(--color-primary)',
            color: '#ffffff',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10
          }}
        >
          <div style={{ fontWeight: 700 }}>${points[hoveredIndex].priceNum.toFixed(2)}</div>
          <div style={{ opacity: 0.8, fontSize: '11px' }}>{formatDate(points[hoveredIndex].recorded_at)}</div>
          {points[hoveredIndex].stock_status && (
            <div style={{ opacity: 0.9, fontSize: '11px' }}>{points[hoveredIndex].stock_status}</div>
          )}
        </div>
      )}
    </div>
  );
}
