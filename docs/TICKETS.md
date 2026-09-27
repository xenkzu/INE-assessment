# Implementation Task Graph (Tracer-Bullet Vertical Slices)

**Source Spec:** [`docs/SPEC.md`](./SPEC.md)  
**Target Tracker:** Local Markdown (`docs/tickets/`) / GitHub Issues  
**Status:** Proposed for User Approval

---

### Task Dependency Graph (Frontier Overview)

```
[ Ticket 01: Core Scraper Engine & Headed Runner ]
                       |
                       v
[ Ticket 02: Persistence Layer & Catalog Search ]
                       |
                       v
[ Ticket 03: Tracked Products Dashboard ]
                       |
                       v
[ Ticket 04: Historical Price Trends & Scrape Audit Logs ]
                       |
                       v
[ Ticket 05: CSV Scrape History Stream Export ]
                       |
                       v
[ Ticket 06: External Cron Trigger & Free-Tier Wake-Up ]
```

---

## Proposed Tickets

### 01: Core Scraper Engine & Headed CLI Runner
- **What it delivers:** A resilient Playwright scraping subsystem capable of navigating to product pages, locating variant options, selecting specific options (storage size, kit, pack size), waiting for asynchronous DOM hydration, and extracting price + stock. Implements a 3-attempt exponential backoff retry mechanism with randomized jitter for transient errors. Includes a headed CLI runner script (`npm run scrape:headed`) to visually observe and record browser actions against slow and failing storefront responses.
- **Blocked by:** None (can start immediately).
- **Key Acceptance Criteria:**
  - Accurately selects variant options and extracts updated price and stock.
  - Automatically retries on network timeouts or 5xx storefront errors.
  - Headed CLI runner displays browser window and logs console milestones for 2–4 minute video recording.
  - Never outputs corrupted or $0.00 placeholder prices on failure.

---

### 02: Persistence Layer & Catalog Search End-to-End
- **What it delivers:** Supabase PostgreSQL database schema migration (`tracked_products`, `scrape_logs`, `price_history`) and Supabase client setup. A functional search bar and backend endpoint querying the mock store catalog by partial or full product name, presenting available variant options, and allowing the user to track a product with an immediate initial scrape execution.
- **Blocked by:** `01: Core Scraper Engine & Headed CLI Runner`
- **Key Acceptance Criteria:**
  - Searching by partial product name returns matching products with thumbnails and options.
  - Adding a product persists it to `tracked_products` with a uniqueness constraint on `(store_product_id, selected_option)`.
  - Performs an immediate initial scrape upon tracking and updates initial price/stock.

---

### 03: Tracked Products Dashboard & Real-Time Management
- **What it delivers:** A clean, functional dashboard interface displaying cards/table of all actively tracked products with their image, product name, selected option, latest price, stock status, last scrape timestamp, and last outcome badge. Includes the ability to remove/untrack products.
- **Blocked by:** `02: Persistence Layer & Catalog Search End-to-End`
- **Key Acceptance Criteria:**
  - Lists all active tracked items with real-time status indicators.
  - Untracking an item immediately updates the UI and stops active monitoring.
  - Dashboard comes pre-seeded with 2–3 actively tracked items.

---

### 04: Historical Price Trends & Honest Scrape Audit Logs
- **What it delivers:** An interactive per-product historical detail view displaying a time-series price trend chart, historical price table, and a transparent scrape attempt audit log table listing exact ISO 8601 UTC timestamps, retry counts, error messages, and honest outcome badges (`success`, `retried`, or `failed`).
- **Blocked by:** `03: Tracked Products Dashboard & Real-Time Management`
- **Key Acceptance Criteria:**
  - Visualizes price fluctuations over time for the selected product variant.
  - Scrape logs honestly display all attempts, including failed runs with recorded error reasons.
  - Retried runs explicitly indicate the number of retries before succeeding.

---

### 05: CSV Scrape History Stream Export
- **What it delivers:** A backend streaming export endpoint (`GET /api/export/csv`) and a dashboard "Export CSV" button that generates and downloads a full historical CSV audit file across all scrape attempts.
- **Blocked by:** `04: Historical Price Trends & Honest Scrape Audit Logs`
- **Key Acceptance Criteria:**
  - Header schema strictly matches: `Store Product ID,Product Name,Selected Option,Timestamp (UTC),Price,Stock,Outcome`.
  - Failed scrape rows leave `Price` and `Stock` completely empty (empty string/null).
  - Downloads with standard MIME headers (`text/csv`) and timestamped filename.

---

### 06: External Cron Trigger & Free-Tier Wake-Up Endpoint
- **What it delivers:** A secured webhook endpoint (`POST /api/cron/scrape`) protected by a `Bearer <CRON_SECRET>` authorization header, configured to receive scheduled pings from cron-job.org every 2 hours. Wakes up the sleeping Render instance, pulls all active tracked items, executes sequential batch scrapes with rate-limiting pauses, records scrape logs, and appends price history.
- **Blocked by:** `05: CSV Scrape History Stream Export`
- **Key Acceptance Criteria:**
  - Rejects unauthenticated requests with `401 Unauthorized`.
  - Processes all active tracked products and returns a summary JSON response.
  - Successfully handles Render cold starts and executes full unattended scrape runs.
