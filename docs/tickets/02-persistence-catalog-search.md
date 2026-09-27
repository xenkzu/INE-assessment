# 02: Persistence Layer & Catalog Search End-to-End

**What to build:**  
The Supabase PostgreSQL database tables (`tracked_products`, `scrape_logs`, `price_history`) and backend Supabase client integration. An API endpoint (`GET /api/products/search?q=...`) and front-end search component allowing users to query the mock store catalog by partial or full title, display available options for each product, and select a product option to track (`POST /api/products/track`). Persisting a new product option immediately triggers an initial live scrape and logs the outcome.

**Blocked by:**  
01: Core Scraper Engine & Headed CLI Runner

**Status:**  
ready-for-agent

**Acceptance Criteria:**
- [ ] Database schema applied to Supabase with proper primary keys, unique constraints on `(store_product_id, selected_option)`, and foreign keys.
- [ ] Backend catalog search endpoint scrapes/parses store search results and returns matching items with variant options.
- [ ] Tracking endpoint saves selected product option to `tracked_products` and executes an immediate initial scrape.
- [ ] Duplicate tracking attempts for identical product + option are prevented gracefully.
