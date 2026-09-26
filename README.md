# Product Price Tracker (Web Scraping) — Full-Stack Application

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
</p>

A resilient, scheduled full-stack product price monitoring application designed to scrape dynamic e-commerce catalog data, track product variant prices and stock status over time, provide transparent scrape audit logs, and export full historical records.

Target Mock Store: [`https://demo.inelabteamdev.com/`](https://demo.inelabteamdev.com/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture & System Flow](#-architecture--system-flow)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Local Setup & Development](#-local-setup--development)
- [Environment Variables](#-environment-variables)
- [Running the Headed Scraper](#-running-the-headed-scraper)
- [Scheduled Scraping & Free-Tier Wake-Up](#-scheduled-scraping--free-tier-wake-up)
- [CSV Export Specification](#-csv-export-specification)
- [Scraping Reliability & Resilience Strategy](#-scraping-reliability--resilience-strategy)
- [License](#-license)

---

## 🔭 Overview

The **Product Price Tracker** is built to reliably scrape and track dynamic pricing from a mock storefront known for intentional scraping hurdles: asynchronous hydration delays, sudden network slowness, intermittent HTTP errors, and option-dependent price mutations.

The application allows users to search the store, select specific variant options (such as size, kit, or bundle), record historical price and stock fluctuations, inspect per-scrape audit logs (`success`, `retried`, `failed`), and download complete datasets as CSV.

---

## 🏛 Architecture & System Flow

```
                     +---------------------------------------+
                     |             cron-job.org              |
                     |     (Pings trigger every 2 hours)     |
                     +-------------------+-------------------+
                                         |
                                         | POST /api/cron/scrape (Bearer Auth)
                                         v
+-------------------+        +-----------------------------------+        +-------------------+
|  Vercel Frontend  | -----> |       Render Backend API          | <----> |     Supabase      |
|  (React SPA)      | <----- |   (Express.js + Playwright)       |        |   (PostgreSQL)    |
+-------------------+        +-----------------+-----------------+        +-------------------+
                                               |
                                               | Automation & DOM Polling
                                               v
                                     +-------------------+
                                     |  INE Mock Store   |
                                     |  (Target Site)    |
                                     +-------------------+
```

---

## ✨ Key Features

1. **Product & Variant Selection**
   - Live search by partial or full product name.
   - Dynamic variant picker (e.g., storage capacity, kit bundle, pack size).
   - Real-time initial scrape upon tracking a product.

2. **Scheduled Resilient Scraping**
   - Automated scrapes running on a fixed 2-hour schedule.
   - Resilient against slow DOM hydration, delayed network responses, and HTTP 5xx errors.
   - Exponential backoff with random jitter for retries (up to 3 attempts).

3. **Transparent Audit Logging & Visualization**
   - Honest scrape attempt logs recording every execution with its exact outcome (`success`, `retried`, or `failed`).
   - Interactive historical price chart and stock change table per product.
   - Failed attempts never write fake, stale, or zero values to the price time-series.

4. **Complete CSV Export**
   - One-click export downloading full scrape history.
   - Strictly conforms to evaluation standards: Store Product ID, Product Name, Selected Option, ISO 8601 UTC Timestamp, Price, Stock, and Outcome (with price/stock empty for failed runs).

5. **Observable Headed Mode**
   - Interactive CLI command to launch the scraper in a visible browser window to record and inspect DOM interactions, option selection, and retry recovery.

---

## 💻 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg" width="18" height="18" /> React.js (Vite) | Clean, functional single-page dashboard deployed on Vercel |
| **Backend API** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" width="18" height="18" /> Node.js / Express | REST API and scraper orchestration service deployed on Render |
| **Scraper Subsystem** | <img src="https://playwright.dev/img/playwright-logo.svg" width="18" height="18" /> Playwright (Chromium) | Headless / headed browser automation with auto-waiting & hydration detection |
| **Database** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" width="18" height="18" /> Supabase (PostgreSQL) | Managed database for tracked products, price history, and scrape logs |
| **Scheduler** | <img src="https://cron-job.org/favicon.ico" width="18" height="18" /> cron-job.org | External cron trigger to handle Render free-tier instance sleep cycles |

---

## 🗄 Database Schema

The database consists of three primary tables in Supabase:

```sql
-- Tracked Products Catalog
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

-- Full Scrape Audit Logs (Records Every Single Attempt)
CREATE TABLE scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    store_product_id VARCHAR(100) NOT NULL,
    product_name TEXT NOT NULL,
    selected_option VARCHAR(150) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    price NUMERIC(10, 2),            -- NULL on failed attempts
    stock VARCHAR(50),               -- NULL on failed attempts
    outcome VARCHAR(20) NOT NULL,    -- 'success', 'retried', 'failed'
    retry_count INT DEFAULT 0,
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clean Time-Series Price History (Successful Runs Only)
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    stock VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🚀 Local Setup & Development

### 1. Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm or yarn
- Supabase account & project

### 2. Clone Repository
```bash
git clone https://github.com/your-username/product-price-tracker.git
cd product-price-tracker
```

### 3. Backend Setup
```bash
cd backend
npm install
npx playwright install chromium

# Copy environment template
cp .env.example .env
# Fill in Supabase credentials and CRON_SECRET

# Start development server
npm run dev
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install

# Copy environment template
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000

# Start development frontend
npm run dev
```

---

## 🔑 Environment Variables

### Backend (`/backend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Backend server port | `5000` |
| `SUPABASE_URL` | Supabase project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGciOi...` |
| `CRON_SECRET` | Secret token for securing cron webhook | `super-secret-cron-token` |
| `HEADLESS_MODE` | Default headless setting (`true` / `false`) | `true` |

### Frontend (`/frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:5000` or Render URL |

---

## 🎬 Running the Headed Scraper

To run the scraper in **headed mode** (with a visible browser UI) to observe DOM actions, variant selections, and retry behaviors:

```bash
cd backend
npm run scrape:headed
```

Or pass a specific product URL to inspect a single item:
```bash
npm run scrape:headed -- --url="https://demo.inelabteamdev.com/product/prod-101" --option="Silver / Standard"
```

> [!NOTE]
> This command is used to record the 2–4 minute headed demo video demonstrating how the scraper handles slow responses, DOM updates, and transient errors.

---

## ⏰ Scheduled Scraping & Free-Tier Wake-Up

Free-tier backend instances on Render sleep after 15 minutes of inactivity. Rather than using an in-memory `setInterval` (which suspends when the container sleeps), scraping is triggered externally:

1. **Trigger Endpoint:** `POST https://<your-render-app>.onrender.com/api/cron/scrape`
2. **Authentication:** Header `Authorization: Bearer <CRON_SECRET>`
3. **Cron Setup via [cron-job.org](https://cron-job.org):**
   - **URL:** `https://<your-render-app>.onrender.com/api/cron/scrape`
   - **Schedule:** Every 2 hours (`0 */2 * * *`)
   - **Request Method:** `POST`
   - **Headers:** `Authorization: Bearer <CRON_SECRET>`
   - **Request Timeout:** 120 seconds (allows waking up cold Render instance + batch scrape execution)

---

## 📊 CSV Export Specification

Clicking the **Export CSV** button on the dashboard triggers `GET /api/export/csv` which delivers a file conforming to the exact evaluation specification:

```csv
Store Product ID,Product Name,Selected Option,Timestamp (UTC),Price,Stock,Outcome
prod-101,Wireless Noise Cancelling Headphones,Silver / Standard,2026-09-26T22:00:00.000Z,199.99,In Stock,success
prod-102,Mechanical Gaming Keyboard,RGB / Red Switches,2026-09-26T22:01:15.000Z,129.50,5 left,retried
prod-103,Smart Home Weather Station,Outdoor Sensor Kit,2026-09-26T22:02:40.000Z,,,failed
```

> [!IMPORTANT]
> Failed attempts are included honestly with `Outcome` marked as `failed`, and `Price` / `Stock` left completely empty.

---

## 🛡 Scraping Reliability & Resilience Strategy

1. **Hydration & Value Verification:** The scraper waits for specific DOM conditions (matching numeric regex on price container) rather than relying on fixed delays.
2. **Smart Variant Selection:** Simulates user option selection and asserts that the DOM active state updates before reading the variant price.
3. **Exponential Backoff & Jitter:** Automatically retries up to 3 times on transient network failures or timeout errors with randomized delays.
4. **Honest Auditing:** Every attempt is logged with duration, error stack, retry count, and outcome to ensure full transparency.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.