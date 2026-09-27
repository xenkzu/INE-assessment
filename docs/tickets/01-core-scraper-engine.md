# 01: Core Scraper Engine & Headed CLI Runner

**What to build:**  
A resilient Playwright scraping subsystem that navigates to product URLs on the mock store (`https://demo.inelabteamdev.com/`), finds and selects specific variant options (storage size, kit, or pack size), waits for asynchronous DOM hydration and element state stability, and accurately extracts the updated price and stock status. Implements a 3-attempt exponential backoff retry state machine with random jitter to gracefully handle transient network slowdowns and 5xx HTTP errors. Provides an interactive headed CLI runner (`npm run scrape:headed`) to visually inspect browser execution and record a 2–4 minute video demonstrating slow/failing response handling.

**Blocked by:**  
None (can start immediately).

**Status:**  
ready-for-agent

**Acceptance Criteria:**
- [ ] Navigates to a target product page and waits for DOM content loaded.
- [ ] Selects a specific product option and waits for the dynamic DOM price/stock elements to update.
- [ ] Accurately extracts decimal price and stock text string (e.g., "In Stock", "Out of Stock", "5 left").
- [ ] Retries failed requests or timeouts up to 3 times using exponential backoff with jitter.
- [ ] Headed CLI script launches Chromium visibly with console milestones for video demonstration.
- [ ] Never returns fake/placeholder $0.00 data on failures; returns explicit error structures.
