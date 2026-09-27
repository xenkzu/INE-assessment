# 03: Tracked Products Dashboard & Real-Time Management

**What to build:**  
A minimal, responsive React dashboard interface listing all actively tracked products (`GET /api/products/tracked`). Each product card/row displays the product thumbnail, product name, tracked option name, latest recorded price, latest stock availability, last scrape timestamp (formatted relative and ISO UTC), and a badge indicating the outcome of the latest scrape. Includes an untrack button (`DELETE /api/products/track/:id`) to deactivate or remove products from scheduled tracking.

**Blocked by:**  
02: Persistence Layer & Catalog Search End-to-End

**Status:**  
ready-for-agent

**Acceptance Criteria:**
- [ ] Displays all tracked products from Supabase with their latest status and pricing.
- [ ] Allows untracking/removing a product with immediate UI update.
- [ ] Shows loading states, empty states, and error alerts gracefully.
- [ ] Live database pre-seeded with at least 2–3 active products.
