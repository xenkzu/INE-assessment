# 05: CSV Scrape History Stream Export

**What to build:**  
A backend CSV generation endpoint (`GET /api/export/csv`) and a dashboard "Export CSV" button. The endpoint streams or generates a downloadable CSV containing the entire historical log of every scrape attempt across all tracked products. Strictly formats fields per assessment requirements, ensuring failed attempts leave the `Price` and `Stock` columns empty rather than displaying 0 or false data.

**Blocked by:**  
04: Historical Price Trends & Honest Scrape Audit Logs

**Status:**  
ready-for-agent

**Acceptance Criteria:**
- [ ] Export header row strictly conforms to: `Store Product ID,Product Name,Selected Option,Timestamp (UTC),Price,Stock,Outcome`.
- [ ] Timestamp is formatted as ISO 8601 UTC.
- [ ] Failed attempts have empty `Price` and `Stock` cells.
- [ ] Frontend button triggers direct browser file download with `Content-Type: text/csv`.
