-- ==============================================================================
-- Supabase Schema: Product Price Tracker (Web Scraping)
-- Run this script in your Supabase SQL Editor (Left menu -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS scrape_logs CASCADE;
DROP TABLE IF EXISTS tracked_products CASCADE;

-- 3. Table: tracked_products
CREATE TABLE tracked_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_product_id VARCHAR(100) NOT NULL,
    product_url TEXT NOT NULL,
    product_name TEXT NOT NULL,
    selected_option VARCHAR(150) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_option UNIQUE(store_product_id, selected_option)
);

-- 4. Table: scrape_logs (Audits every single scrape attempt: success, retried, failed)
CREATE TABLE scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    store_product_id VARCHAR(100) NOT NULL,
    product_name TEXT NOT NULL,
    selected_option VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    price NUMERIC(10, 2),            -- NULL on failed attempts
    stock VARCHAR(50),               -- NULL on failed attempts (e.g. 'In Stock', 'Out of Stock', '5 left')
    outcome VARCHAR(20) NOT NULL,    -- 'success', 'retried', 'failed'
    retry_count INT DEFAULT 0,
    error_message TEXT,              -- NULL on success
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: price_history (Time-series price history for successful scrapes)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    stock VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for query optimization
CREATE INDEX idx_tracked_products_active ON tracked_products(is_active);
CREATE INDEX idx_scrape_logs_product_id ON scrape_logs(product_id);
CREATE INDEX idx_scrape_logs_timestamp ON scrape_logs(timestamp DESC);
CREATE INDEX idx_price_history_product_time ON price_history(product_id, recorded_at DESC);

-- 7. Row Level Security (RLS) Configuration
-- Enable RLS and grant public access for easy API / scraper communication
ALTER TABLE tracked_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on tracked_products" ON tracked_products FOR SELECT USING (true);
CREATE POLICY "Public insert access on tracked_products" ON tracked_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access on tracked_products" ON tracked_products FOR UPDATE USING (true);
CREATE POLICY "Public delete access on tracked_products" ON tracked_products FOR DELETE USING (true);

CREATE POLICY "Public read access on scrape_logs" ON scrape_logs FOR SELECT USING (true);
CREATE POLICY "Public insert access on scrape_logs" ON scrape_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read access on price_history" ON price_history FOR SELECT USING (true);
CREATE POLICY "Public insert access on price_history" ON price_history FOR INSERT WITH CHECK (true);
