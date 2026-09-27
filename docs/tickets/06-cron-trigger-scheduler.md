# 06: External Cron Trigger & Free-Tier Wake-Up Endpoint

**What to build:**  
A protected API endpoint (`POST /api/cron/scrape`) authenticated via a `Bearer <CRON_SECRET>` authorization header. When triggered every 2 hours by cron-job.org, it wakes up the Render service from idle/sleep, fetches all active tracked products from Supabase, iterates through them with polite pacing, executes resilient scraping with retry handling, records logs, and updates price histories. Includes a test suite validating authentication, rate limiting, and batch processing.

**Blocked by:**  
05: CSV Scrape History Stream Export

**Status:**  
ready-for-agent

**Acceptance Criteria:**
- [ ] Returns `401 Unauthorized` if the `Authorization` header does not match `CRON_SECRET`.
- [ ] Iterates through all active products in `tracked_products` and records each outcome in `scrape_logs`.
- [ ] Handles Render free-tier cold starts within cron-job.org's timeout window.
- [ ] Returns a detailed JSON summary of total processed, successes, retries, and failures.
