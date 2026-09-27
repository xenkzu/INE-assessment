# Engineering Design Note: Scraping Reliability & Architectural Decisions

**Project:** Product Price Tracker (Web Scraping) — Full-Stack Application  
**Author:** Yash Kaul  
**Target Storefront:** `https://demo.inelabteamdev.com/`

---

## 1. How Scraping Reliability Was Achieved

The target storefront (`https://demo.inelabteamdev.com/`) was intentionally engineered with real-world scraping obstacles. Rather than relying on simple HTML markup, the store employs client-side React rendering, dynamic state machines, and randomized challenges:

### A. The "Price Locked" Interaction Barrier
- **Storefront Challenge:** On product pages, the price element is rendered in a locked state (`.offer-locked`). The "Check today’s price" button is initially `disabled`.
- **Underlying Mechanism:** Analysis of the client-side JavaScript bundle revealed an interaction tracker class (`Ar`) requiring:
  1. A minimum number of mouse movement coordinates (`minMoves >= 10`) across the `.offer-panel` container with a time threshold (`delta >= 40ms`).
  2. A minimum hover dwell time (`minDwellMs`).
- **Our Solution:** In [`backend/src/scraper/engine.js`](../backend/src/scraper/engine.js), the scraper extracts the bounding box of `.offer-panel` and executes realistic mouse movements using Playwright's `page.mouse.move(x, y)` spaced 50ms apart, followed by a 1200ms dwell delay. This deterministically satisfies `u.ready()` and enables the button.

### B. Randomized Cookie Consent Scrim
- **Storefront Challenge:** A consent dialog (`.consent-scrim` / `.consent-box`) appears intermittently (~25% probability) after random delays, intercepting all DOM click events.
- **Our Solution:** An automated consent interceptor (`dismissConsentIfPresent`) checks for `.consent-scrim` and `button[aria-label="Allow cookies"]` / `button[aria-label="Reject cookies"]` at key execution milestones, clicking with `{ force: true }` to dismiss the barrier before interacting with product options.

### C. Variant Selection & Asynchronous Hydration
- **Storefront Challenge:** Clicking variant chips (`button.opt-chip`) triggers asynchronous price recalculations with artificial network delay and simulated retry states (`phase === 'loading'` / `phase === 'retrying'`).
- **Our Solution:** The scraper triggers the option click and uses `page.waitForFunction()` to poll the DOM until the panel text transitions out of loading/retrying states and contains a valid currency pattern (`/[₹$€£\d]/`).

### D. Exponential Backoff with Jitter
- **Storefront Challenge:** Occasional transient HTTP 5xx responses or network timeouts.
- **Our Solution:** Scrapes execute with a 3-attempt retry loop. Failed attempts invoke exponential backoff with randomized jitter:
  $$\text{Delay} = (1000 \times 2^{\text{attempt}}) + \text{random}(0, 500)\text{ms}$$
  If all 3 attempts fail, the failure is logged honestly with `outcome = 'failed'` and empty price/stock fields.

---

## 2. Architectural Trade-offs & Decisions

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Scraping Engine** | **Playwright (Chromium)** | Lightweight HTTP (`axios` + `cheerio`) | The mock store is a pure Client-Side SPA (`<div id="root"></div>`). Plain HTTP requests only receive empty HTML shells without product pricing or option handlers. |
| **Scheduler** | **External Cron (cron-job.org)** | In-memory `setInterval` / `node-cron` | Free-tier backends (Render) automatically sleep after 15 minutes of inactivity. Internal timers freeze when the instance sleeps. An external cron acts as both an HTTPS wake-up call and a scrape execution trigger. |
| **Database** | **Supabase (PostgreSQL)** | SQLite / Local File Storage | Relational schema with foreign keys, transactional integrity between `price_history` and `scrape_logs`, and persistent cloud storage accessible from serverless/containerized deployments. |
| **Browser Path Retention** | `PLAYWRIGHT_BROWSERS_PATH=0` | System global cache (`/opt/render/.cache`) | Render purges the `/opt/render/.cache` directory between build and runtime containers. Setting `0` forces Chromium to install in `node_modules/playwright-core/.local-browsers`, preserving it permanently in the runtime bundle. |

---

## 3. What AI Tools Got Wrong on First Attempt & How It Was Corrected

### 1. The Naive Button Click vs. Mouse Movement Barrier
- **What AI Initially Did:** Generated standard `page.click('button:has-text("Check today’s price")')`.
- **Why It Failed:** The button is rendered in a `disabled` state by default. Playwright's click action timed out waiting for the element to become enabled.
- **How It Was Corrected:** Decompiled the frontend bundle (`index-GaW5Fnef.js`), identified the `onMouseMove` event listeners and dwell requirements in class `Ar`, and replaced the naive click with continuous coordinate trajectory simulation across `.offer-panel`.

### 2. Render Non-Root Build Permissions (`--with-deps` Failure)
- **What AI Initially Did:** Recommended the build command `npx playwright install chromium --with-deps`.
- **Why It Failed:** On Render's Linux build environment, `--with-deps` attempted to invoke `sudo apt-get` as root, causing `Password: su: Authentication failure`.
- **How It Was Corrected:** Replaced `--with-deps` with native Playwright postinstall scripts using `cross-env PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium` and added a runtime self-healing launcher (`launchResilientBrowser`) that automatically recovers if browser binaries are missing.

### 3. Missing Scrim Handling on Random Modals
- **What AI Initially Did:** Assumed direct linear navigation to product elements.
- **Why It Failed:** Random cookie modal overlay `<div class="consent-scrim">` intercepted pointer events and stalled page interactions.
- **How It Was Corrected:** Added proactive and reactive modal dismissers that intercept and clear consent scrims prior to option selection and price extraction.

---

## 4. Summary of Deliverables Alignment

- [x] **Live Hosted Backend:** Deployed and verified on Render ([`https://ine-assessment-de8i.onrender.com`](https://ine-assessment-de8i.onrender.com)).
- [x] **Supabase PostgreSQL Database:** Fully configured with `tracked_products`, `scrape_logs`, and `price_history`.
- [x] **Scheduled Scraping:** Verified 2-hour cron trigger on cron-job.org with Bearer secret authentication.
- [x] **Honest Audit Logging & CSV Export:** Tested live via `GET /api/export/csv`.
- [x] **Observable Headed Run:** Implemented CLI script `npm run scrape:headed` in [`backend/src/scripts/scrapeHeaded.js`](../backend/src/scripts/scrapeHeaded.js).
