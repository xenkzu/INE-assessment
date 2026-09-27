# Specification: Product Price Tracker (Web Scraping) — Full-Stack Application

**Status:** Ready for Agent / Ready for Review  
**Target Mock Store:** `https://demo.inelabteamdev.com/`  
**Deployment Infrastructure:** Vercel (Frontend), Render.com (Backend API & Scraper Worker), Supabase PostgreSQL (Database), cron-job.org (External Trigger Schedule)

---

## Problem Statement

Users need to monitor product pricing and stock availability over time on an e-commerce storefront (specifically INE's hosted mock store). However, the storefront presents real-world web scraping hurdles:
1. Products have multiple variant options (e.g., storage capacity, kit bundles, pack sizes), each possessing independent pricing, stock status, and asynchronous DOM updates upon selection.
2. The storefront deliberately introduces unstable network behavior, slow page loads, delayed client-side script rendering, intermittent HTTP errors, and asynchronous UI hydration.
3. Users currently lack a central dashboard to search store inventory, select specific variant options, view historical price fluctuations, inspect scrape reliability logs, and export raw scrape history for offline audit.
4. Unattended scheduled scraping on free-tier infrastructure poses cold-start and process-sleep challenges where internal background loops fail when web services spin down.

---

## Solution

Build a robust, full-stack product price tracking platform composed of:
1. **Catalog Search & Tracking Interface:** A minimal, functional React dashboard enabling users to search the mock store by partial or full product name, inspect available product options/variants, and add chosen product-option pairs to active monitoring.
2. **Resilient Headed & Headless Scraper Engine:** A scraping worker (built with Playwright/Puppeteer with fallback HTTP inspection) engineered with resilient retry logic, element hydration waiting, error classification, and DOM-stability verification. The scraper can execute in headless mode for automated runs or headed mode for visual observation and demonstration recordings.
3. **External Cron Trigger Architecture:** A secure API endpoint invoked by an external scheduler (cron-job.org) every 2 hours to wake up the backend instance, pull active tracked items, execute sequential/batched resilient scrapes, and log outcomes.
4. **Transparent Audit Logging & Data Visualization:** Supabase PostgreSQL storage recording every scrape attempt (status: `success`, `retried`, or `failed`), with price/stock history visualized in interactive charts and tables, complete with an instant CSV export feature for compliance verification.

---

## User Stories

### Product Discovery & Tracking Setup
1. As a shopper, I want to search for products by partial or full title in the search bar, so that I can find products without knowing their exact URL.
2. As a shopper, I want search results to display product thumbnails, full titles, store product IDs, and available variant options, so that I can confirm I am tracking the correct item.
3. As a shopper, I want to select a specific option (e.g., 64GB vs 256GB, Single vs 3-Pack) for a product, so that the tracker monitors the exact SKU and price I care about.
4. As a shopper, I want to click a "Track Product" button to persist the product and selected option into the database, so that it is included in future scheduled scrape runs.
5. As a shopper, I want immediate visual validation when a product is added to the tracking list, so that I know the request succeeded.
6. As a shopper, I want the system to perform an initial scrape immediately upon adding a new product, so that the dashboard displays current price and stock without waiting for the next cron cycle.
7. As a shopper, I want to prevent duplicate tracking of the exact same product ID and option combination, so that database records and scrape runs stay clean and uncluttered.
8. As a shopper, I want to remove a tracked product from my active tracking list, so that the scraper stops querying products I am no longer interested in.

### Dashboard & Data Visualization
9. As a shopper, I want to view a dashboard listing all currently tracked products alongside their thumbnail, name, selected option, latest recorded price, latest stock status, and last checked timestamp.
10. As an auditor, I want the live dashboard to come pre-seeded with at least 2–3 actively tracked products with real, multi-day scrape histories upon evaluation.
11. As a shopper, I want to click on a tracked product card to view its historical price trends on an interactive chart, so that I can analyze price movements over time.
12. As a shopper, I want to view a tabular breakdown of historic prices and stock states with exact UTC timestamps, so that I can see granular data points.
13. As an auditor, I want to view a per-product scrape log table that explicitly displays every scrape attempt, including timestamps and honest status markers (`success`, `retried`, or `failed`).
14. As an auditor, I want failed scrape records to be clearly marked and not hidden or discarded, so that the operational integrity and reliability of the scraper can be verified.
15. As a shopper, I want to see how many retries occurred during a scrape attempt in the scrape log, so that I can understand transient storefront errors.

### Data Export & Reporting
16. As a data analyst or auditor, I want to click an "Export CSV" button on the dashboard, so that I can download the complete scrape history across all products in a standard format.
17. As a data analyst, I want each row in the exported CSV to contain: Store Product ID (from URL), Product Name, Selected Option, Timestamp (ISO 8601 UTC), Price, Stock, and Outcome (`success`, `retried`, `failed`).
18. As a data analyst, I want failed scrape rows in the CSV export to leave the Price and Stock fields completely empty (null/empty string) rather than reporting zero or stale data, so that analytics pipelines are not skewed.
19. As a user, I want the CSV export to download immediately with appropriate MIME headers (`text/csv`) and a descriptive filename with a timestamp (e.g., `scrape_history_2026-09-27.csv`).

### Scraping Engine & Reliability
20. As a system administrator, I want the scraper to accurately extract dynamic price and stock values that render asynchronously after client-side hydration, so that data reflects true rendered values rather than empty HTML shells.
21. As a system administrator, I want the scraper to simulate human-like or deterministic selection of product variant options (clicking dropdowns/buttons) and await DOM state confirmation before reading the updated price.
22. As a system administrator, I want the scraper to retry failed page loads or transient HTTP errors up to 3 times with exponential backoff and jitter, so that intermittent network spikes do not fail the job.
23. As a system administrator, I want the scraper to detect and handle slow network responses by enforcing sensible page load and selector timeouts (e.g., 15–20 seconds per attempt).
24. As a system administrator, I want the scraper to never write incorrect or placeholder prices (such as $0.00 or NaN) to the database when a page fails to load or element selectors fail to match.
25. As a developer, I want an error classification layer that differentiates between transient network timeouts, HTTP 5xx errors, HTTP 404/page missing, and DOM selector mismatch errors, so that root causes are recorded in the scrape logs.

### Headed Execution & Demonstrability
26. As an evaluator, I want the ability to run the scraper in headed mode via a dedicated CLI command or script (`npm run scrape:headed` or `npm run demo:headed`), so that I can visually observe browser navigation, option clicking, DOM waiting, and retry handling.
27. As a developer, I want the headed run script to accept a target product URL or ID to demonstrate immediate execution on demand without waiting for cron triggers.
28. As a developer, I want the headed run to log visual console milestones (e.g., "Navigating...", "Selecting Option...", "Waiting for Price Hydration...", "Attempt 1 Failed - Retrying...") to facilitate a 2–4 minute screen recording.

### Scheduled Execution & Infrastructure Management
29. As a system administrator, I want an external cron service (cron-job.org) to ping a secure API endpoint (`POST /api/scrapes/trigger`) every 2 hours, so that scraping occurs on schedule even when Render free instances sleep.
30. As a backend service, I want the trigger endpoint to authenticate requests via a shared secret header (`Bearer CRON_SECRET`), preventing unauthorized third-party invocations.
31. As a backend service, I want the wake-up / scrape handler to process tracked products in managed batches with rate-limiting pauses, avoiding IP blocking or overwhelming the mock store.

---

## Implementation Decisions

### Architectural Overview

The application follows a decoupled client-server architecture backed by a managed PostgreSQL database and triggered by an external scheduler.

```
+-------------------------------------------------------------+
|                     cron-job.org                            |
|             (Pings trigger endpoint every 2h)               |
+------------------------------+------------------------------+
                               | HTTPS POST with Bearer Secret
                               v
+-------------------------------------------------------------+
|                      Backend (Render)                       |
|  +-------------------------------------------------------+  |
|  | Express.js API Server                                 |  |
|  | - Product search & management endpoints               |  |
|  | - Scrape trigger & manual run endpoints               |  |
|  | - History & CSV export endpoints                      |  |
|  +---------------------------+---------------------------+  |
|                              |                              |
|                              v                              |
|  +-------------------------------------------------------+  |
|  | Scraper Subsystem (Playwright / Puppeteer)            |  |
|  | - Navigation & Variant Selector Automation            |  |
|  | - Hydration & Network Idle Waiters                    |  |
|  | - Retry Strategy with Backoff & Jitter               |  |
|  | - Headless / Headed Execution Switch                  |  |
|  +---------------------------+---------------------------+  |
+------------------------------|------------------------------+
                               | Supabase Client
                               v
+-------------------------------------------------------------+
|                   Supabase (PostgreSQL)                     |
|  - Table: tracked_products                                  |
|  - Table: scrape_logs                                       |
|  - Table: price_history                                     |
+------------------------------^------------------------------+
                               | REST API
+------------------------------+------------------------------+
|                     Frontend (Vercel)                       |
|  - React.js Single Page Application                         |
|  - Search & Variant Selection Modal / Bar                   |
|  - Tracked Product Cards & Live Status                      |
|  - Price Trend Charts & Granular History Tables             |
|  - Scrape Audit Logs (Success / Retried / Failed)           |
|  - Instant CSV Export Button                                |
+-------------------------------------------------------------+
```

### 1. Technology Choices & Justifications

- **Frontend:** React.js (Vite), functional and plain UI focusing strictly on usability, clarity, and real-time state display without premature aesthetic styling. Deployed on Vercel.
- **Backend API:** Node.js with Express.js. Provides fast async I/O, seamless integration with browser automation tooling, and native JSON handling. Deployed on Render.
- **Scraper Engine:** Playwright (Chromium). Playwright is chosen over plain HTTP parsing (`cheerio`/`axios`) because the mock store at `https://demo.inelabteamdev.com/` relies on client-side rendering, delayed asynchronous DOM updates upon variant switching, and dynamic JavaScript execution. Playwright provides built-in auto-waiting, robust frame/locator assertions, and straightforward toggling between headless and headed execution modes.
- **Database:** Supabase (PostgreSQL). Offers relational schemas, fast indexing on product and timestamp columns, and built-in connection pooling for serverless/containerized backend queries.
- **Scheduler:** cron-job.org. Configured to hit `https://<backend-render-app>/api/cron/scrape` every 120 minutes with authorization headers. This overcomes Render free-tier sleep cycles by acting as both a wake-up ping and an execution trigger.

### 2. Database Schema Definition

```sql
-- Table: tracked_products
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

-- Table: scrape_logs (Records every single scrape attempt and outcome)
CREATE TABLE scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    store_product_id VARCHAR(100) NOT NULL,
    product_name TEXT NOT NULL,
    selected_option VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    price NUMERIC(10, 2),            -- NULL on failed attempts
    stock VARCHAR(50),               -- NULL on failed attempts (e.g., 'In Stock', 'Out of Stock', '5 left')
    outcome VARCHAR(20) NOT NULL,    -- 'success', 'retried', 'failed'
    retry_count INT DEFAULT 0,
    error_message TEXT,              -- NULL on clean success
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: price_history (Clean historical price time-series for successful scrapes)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    stock VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scrape_logs_product_id ON scrape_logs(product_id);
CREATE INDEX idx_scrape_logs_timestamp ON scrape_logs(timestamp DESC);
CREATE INDEX idx_price_history_product_time ON price_history(product_id, recorded_at DESC);
```

### 3. API Contract Specifications

#### `GET /api/products/search?q={query}`
- **Purpose:** Searches the mock store catalog by partial or full title.
- **Response 200 OK:**
```json
[
  {
    "storeProductId": "prod-101",
    "productUrl": "https://demo.inelabteamdev.com/product/prod-101",
    "name": "Wireless Noise Cancelling Headphones",
    "imageUrl": "https://demo.inelabteamdev.com/images/headphones.jpg",
    "availableOptions": ["Black / Standard", "Silver / Standard", "Black / Deluxe Bundle"]
  }
]
```

#### `GET /api/products/tracked`
- **Purpose:** Returns all active tracked products with their latest price, stock, and last scrape status.
- **Response 200 OK:**
```json
[
  {
    "id": "7b8f9e6a-...",
    "storeProductId": "prod-101",
    "productUrl": "https://demo.inelabteamdev.com/product/prod-101",
    "productName": "Wireless Noise Cancelling Headphones",
    "selectedOption": "Silver / Standard",
    "imageUrl": "https://demo.inelabteamdev.com/images/headphones.jpg",
    "latestPrice": 199.99,
    "latestStock": "In Stock",
    "lastScrapedAt": "2026-09-27T00:00:00.000Z",
    "lastOutcome": "success"
  }
]
```

#### `POST /api/products/track`
- **Purpose:** Adds a new product variant to tracking and triggers an immediate initial scrape.
- **Request Body:**
```json
{
  "storeProductId": "prod-101",
  "productUrl": "https://demo.inelabteamdev.com/product/prod-101",
  "productName": "Wireless Noise Cancelling Headphones",
  "selectedOption": "Silver / Standard",
  "imageUrl": "https://demo.inelabteamdev.com/images/headphones.jpg"
}
```
- **Response 201 Created:** Created product object with initial scrape result.

#### `DELETE /api/products/track/:id`
- **Purpose:** Deactivates or removes a product from tracking.
- **Response 200 OK:** `{ "success": true, "message": "Product removed from tracking." }`

#### `GET /api/products/:id/history`
- **Purpose:** Fetches time-series price records and complete scrape attempt logs for a specific product.
- **Response 200 OK:**
```json
{
  "product": { "id": "...", "productName": "...", "selectedOption": "..." },
  "priceHistory": [
    { "price": 199.99, "stock": "In Stock", "recordedAt": "2026-09-27T00:00:00.000Z" }
  ],
  "scrapeLogs": [
    {
      "id": "...",
      "timestamp": "2026-09-27T00:00:00.000Z",
      "price": 199.99,
      "stock": "In Stock",
      "outcome": "success",
      "retryCount": 0,
      "errorMessage": null,
      "durationMs": 1420
    }
  ]
}
```

#### `POST /api/cron/scrape`
- **Purpose:** Protected endpoint invoked by cron-job.org every 2 hours to execute scheduled scraping across all tracked products.
- **Headers:** `Authorization: Bearer <CRON_SECRET_TOKEN>`
- **Response 200 OK:**
```json
{
  "success": true,
  "totalProcessed": 3,
  "successful": 2,
  "retried": 1,
  "failed": 0,
  "summary": [ ... ]
}
```

#### `GET /api/export/csv`
- **Purpose:** Streams a CSV file containing the complete history of every scrape attempt.
- **Headers:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="scrape_history_YYYYMMDD_HHmmss.csv"`
- **CSV Format Specification:**
```csv
Store Product ID,Product Name,Selected Option,Timestamp (UTC),Price,Stock,Outcome
prod-101,Wireless Noise Cancelling Headphones,Silver / Standard,2026-09-26T22:00:00.000Z,199.99,In Stock,success
prod-102,Mechanical Gaming Keyboard,RGB / Red Switches,2026-09-26T22:01:15.000Z,129.50,5 left,retried
prod-103,Smart Home Weather Station,Outdoor Sensor Kit,2026-09-26T22:02:40.000Z,,,failed
```

### 4. Scraping Reliability & Error Handling State Machine

The scraper handles the mock store's intentional delays and errors via the following pipeline:

1. **Browser Context Initialization:** Launch Chromium instance with realistic user-agent, configured viewport, and request interceptors to log failed assets.
2. **Page Navigation:** Navigate to target product page with `waitUntil: 'domcontentloaded'` and a timeout of 20,000ms.
3. **Variant Selection Handling:**
   - Locate the option selector (dropdown, radio, or swatch button).
   - Click/select the specified variant option.
   - Wait for network idle or DOM attribute updates (e.g., watching for price element text change or active state mutation).
4. **Hydration & Value Extraction:**
   - Wait explicitly for the price element to contain a valid non-empty numeric pattern (`/\$\s*\d+(\.\d{2})?/`).
   - Extract raw text for price and stock availability. Parse price to decimal numeric.
5. **Retry Mechanism:**
   - Maximum attempts: 3.
   - Delay: Exponential backoff with random jitter (`1000ms * (2 ^ attempt) + Math.random() * 500ms`).
   - If extraction fails on attempt 1 or 2, increment `retryCount` and retry.
   - If extraction succeeds after retries, record `outcome = 'retried'`.
   - If all 3 attempts fail, catch error, record `outcome = 'failed'`, set `price = NULL`, `stock = NULL`, and store `error_message`.
6. **Data Integrity Guarantee:** A database transaction ensures that `price_history` is only appended on `outcome IN ('success', 'retried')`, whereas `scrape_logs` is unconditionally written for every attempt.

---

## Testing Decisions

### Core Testing Philosophy
- Tests must verify external behavior and system contracts rather than internal implementation details.
- Unit and integration tests must validate the scraper's resilience against simulated network flakiness, corrupted DOM responses, and timeout conditions without hitting the live store during CI.
- End-to-end (E2E) tests verify full user flows: searching products, tracking items, viewing history charts, and generating CSV exports.

### Modules to Test
1. **Scraper Extraction & Retry Engine:**
   - Test against local mock HTTP servers serving delayed responses (e.g., 3s delay), 500 error responses followed by 200 OK (retry test), permanent 500 errors (failure logging test), and delayed DOM injection.
   - Verify that failed runs write `null` for price/stock and record `outcome: 'failed'`.
   - Verify that retried runs accurately record `retry_count > 0` and `outcome: 'retried'`.
2. **CSV Export Service:**
   - Validate header structure, row formatting, ISO 8601 UTC timestamp format, and strict null/empty handling for failed rows.
3. **Cron Authentication & Batch Processing:**
   - Validate that unauthorized requests to `/api/cron/scrape` return 401 Unauthorized.
   - Validate that valid cron requests sequentially iterate over active items without race conditions.
4. **Frontend Dashboard State & Render:**
   - Verify search input debouncing and variant list selection.
   - Verify chart rendering and scrape log status badge display.

---

## Out of Scope

- Scraping any external third-party retailers or real-world e-commerce stores (strictly restricted to `https://demo.inelabteamdev.com/`).
- User authentication, multi-tenant accounts, or role-based access control (the assignment requires a single open dashboard).
- Complex custom UI styling, advanced theme switchers, or elaborate CSS animations at this stage (plain, clean, and functional UI only).
- Paid hosting infrastructure or cloud services outside the specified free tiers (Vercel, Render, Supabase, cron-job.org).
- Webhook notification delivery or email alert dispatching (identified as optional bonuses, not part of the core spec).

---

## Further Notes & Deliverables Checklist

### Deliverables Checklist
- [ ] **Live Hosted Frontend:** Deployed on Vercel, accessible via public URL.
- [ ] **Live Hosted Backend:** Deployed on Render with working endpoints.
- [ ] **Supabase Database:** Active PostgreSQL instance with migration scripts and seeded with 2–3 actively tracked products with historical runs.
- [ ] **Public GitHub Repository:** Clean code structure, modular architecture, and zero secrets committed.
- [ ] **Headed Scraper Demo Recording:** 2 to 4-minute video demonstrating headed scraping, variant option selection, slow-network handling, and retry recovery.
- [ ] **README.md:** Complete setup guide, schedule specification, environment variable list, and execution instructions.
- [ ] **Design Note (`DESIGN_NOTE.md`):** Engineering rationale detailing how reliability was achieved, architecture trade-offs, and lessons learned from AI code generation errors.
- [ ] **PDF Resume:** Prepared for final package submission.
