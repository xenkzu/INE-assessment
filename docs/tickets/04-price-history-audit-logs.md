# 04: Historical Price Trends & Honest Scrape Audit Logs

**What to build:**  
A dedicated product detail view/modal backed by `GET /api/products/:id/history` that visualizes price trends over time on an interactive time-series chart and displays a tabular history of all price changes. Also presents a transparent per-product scrape log table documenting every scrape attempt, including timestamp, duration, retry count, error message (if any), and honest outcome marker (`success`, `retried`, or `failed`).

**Blocked by:**  
03: Tracked Products Dashboard & Real-Time Management

**Status:**  
ready-for-agent

**Acceptance Criteria:**
- [ ] Renders an interactive price history chart showing timestamps vs. price.
- [ ] Tabular scrape log displays every attempt with accurate UTC ISO timestamps.
- [ ] Failed attempts are highlighted with clear error badges and error details.
- [ ] Retried attempts display the count of retries performed before success.
