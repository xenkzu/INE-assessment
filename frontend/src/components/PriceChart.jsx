'use client';

import React from 'react';
import { ChartContainer, ChartTooltip } from '@/components/ui/line-charts-9';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';

// Custom Tooltip component for historical price tracking
function PriceTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-2xl p-4 shadow-xl text-12 min-w-[170px]">
        <div className="text-12 text-muted-foreground font-medium mb-1.5">{data.fullDate || data.date}</div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-16 font-bold text-foreground">
            ₹{Number(data.price).toLocaleString('en-IN')}
          </div>
          {data.stock && (
            <div className="text-12 font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ● {data.stock}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function PriceChart({ history }) {
  // Filter out any invalid points and sort chronologically
  const validPoints = (history || [])
    .filter((h) => h.price !== null && h.price !== undefined)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  if (validPoints.length === 0) {
    return (
      <div className="p-10 text-center text-muted-foreground bg-muted/30 rounded-3xl border border-dashed border-border mb-6">
        <p className="font-medium text-16 text-foreground mb-1">No price records yet</p>
        <p className="text-12">Scraper has not captured enough history points for this option.</p>
      </div>
    );
  }

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const chartData = validPoints.map((item) => ({
    date: formatDate(item.recorded_at),
    fullDate: new Date(item.recorded_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    price: Number(item.price),
    stock: item.stock_status || 'In Stock'
  }));

  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice === minPrice ? Math.max(100, minPrice * 0.1) : maxPrice - minPrice;
  const yMin = Math.max(0, Math.floor(minPrice - priceRange * 0.15));
  const yMax = Math.ceil(maxPrice + priceRange * 0.15);

  const chartConfig = {
    price: {
      label: 'Price',
      color: '#27272A' // Charcoal lighter black
    }
  };

  return (
    <div className="w-full bg-[#FAFAFC] p-5 rounded-3xl border border-border mb-7">
      <div className="flex justify-between items-center mb-4 px-2">
        <span className="text-12 font-semibold text-muted-foreground uppercase tracking-wider">
          Price Volatility Timeline
        </span>
        <span className="text-12 text-muted-foreground">
          {chartData.length} {chartData.length === 1 ? 'snapshot' : 'snapshots'} captured
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        className="h-64 w-full [&_.recharts-curve.recharts-tooltip-cursor]:stroke-initial"
      >
        <ComposedChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 10,
            bottom: 10
          }}
        >
          <defs>
            <linearGradient id="priceAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#27272A" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#27272A" stopOpacity="0.0" />
            </linearGradient>
            <pattern id="chartDotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#E4E4E7" fillOpacity="0.8" />
            </pattern>
            <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.2)" />
            </filter>
            <filter id="lineShadow" x="-100%" y="-100%" width="300%" height="300%">
              <feDropShadow dx="2" dy="4" stdDeviation="8" floodColor="rgba(39, 39, 42, 0.2)" />
            </filter>
          </defs>

          <rect x="0" y="0" width="100%" height="100%" fill="url(#chartDotGrid)" style={{ pointerEvents: 'none' }} />

          <CartesianGrid
            strokeDasharray="4 6"
            stroke="#E4E4E7"
            strokeOpacity={0.8}
            horizontal={true}
            vertical={false}
          />

          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#71717A' }}
            tickMargin={12}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[yMin, yMax]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#71717A' }}
            tickFormatter={(val) => `₹${Math.round(val).toLocaleString('en-IN')}`}
            tickMargin={12}
            width={68}
          />

          <ChartTooltip
            content={<PriceTooltip />}
            cursor={{ strokeDasharray: '3 3', stroke: '#27272A', strokeOpacity: 0.4 }}
          />

          {minPrice > 0 && chartData.length > 1 && (
            <ReferenceLine
              y={minPrice}
              stroke="#10B981"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}

          <Line
            type="monotone"
            dataKey="price"
            stroke="#27272A"
            strokeWidth={2.5}
            filter="url(#lineShadow)"
            dot={(props) => {
              const { cx, cy } = props;
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4.5}
                  fill="#FFFFFF"
                  stroke="#27272A"
                  strokeWidth={2.5}
                  filter="url(#dotShadow)"
                />
              );
            }}
            activeDot={{
              r: 6.5,
              fill: '#27272A',
              stroke: '#FFFFFF',
              strokeWidth: 2.5,
              filter: 'url(#dotShadow)'
            }}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
