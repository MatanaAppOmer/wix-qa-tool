# Wix Studio Template QA Tool

Internal tool for running automated QA checks on Wix Studio template submissions before marketplace publication.

## How to Run

```bash
# Install dependencies (Playwright browser included)
npm install
npx playwright install chromium

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a template URL, and click **Run QA Scan**.

---

## How the Scan Works

1. **Crawl** — A headless Chromium browser (via Playwright) opens the root URL. It discovers internal pages by collecting same-origin links from the navigation and page content. Pages are crawled via BFS up to `MAX_DEPTH=3` levels deep, capped at `MAX_PAGES=12`.

2. **Analyze** — Each page is analyzed in-place. All 9 checks run in parallel per page using Playwright's DOM evaluation API, which inspects the rendered DOM and computed CSS styles (not raw HTML).

3. **Report** — Results are returned as JSON and rendered in the browser as a structured QA report, grouped by page and by category.

### Categories & Checks

| Category | Check | Type |
|---|---|---|
| Design & Content | Spelling / grammar / mixed language | Heuristic |
| Design & Content | URL slug matches page name | Heuristic |
| Structure | Header and footer present | Deterministic |
| Structure | No suspicious hidden elements | Heuristic |
| Experience | Allowed fonts only (Google / Wix Studio) | Semi-deterministic |
| Experience | Hover states on interactive elements | Heuristic |
| Experience | Functional links and buttons | Semi-deterministic |
| Accessibility | Single H1 tag | Deterministic |
| Accessibility | Minimum text size (12px) | Semi-deterministic |

### Status Meanings

- **Pass** — Check passed with high confidence
- **Warning** — Potential issue found; manual review recommended (heuristic checks)
- **Fail** — Clear, deterministic failure (e.g., 0 H1 tags, missing header/footer)
- **Skip** — Check could not run (e.g., missing data to compare)

---

## Configuration

Edit [`lib/scanner/config.ts`](lib/scanner/config.ts) to change:

- `MAX_PAGES` — How many pages to crawl (default: 12)
- `MAX_DEPTH` — Crawl depth from root (default: 3)
- `MIN_TEXT_SIZE_PX` — Minimum text size threshold (default: 12)
- `GOOGLE_FONTS` — Allowlisted Google Font families
- `WIX_FONTS` — Allowlisted Wix Studio font families
- `HOVER_COMPARE_PROPS` — CSS properties checked for hover state changes

---

## File Structure

```
app/
  page.tsx                    — Main UI (scan form + report)
  layout.tsx                  — Root layout
  api/
    scan/
      route.ts                — POST /api/scan — runs the full scan

lib/
  scanner/
    types.ts                  — Shared TypeScript types (ScanResult, Check, etc.)
    config.ts                 — Font allowlists, scan limits (edit here)
    crawler.ts                — Playwright BFS crawler
    index.ts                  — Check orchestrator + entry point
    checks/
      h1.ts                   — H1 count check
      text-size.ts            — Minimum font size check
      header-footer.ts        — Header/footer presence check
      links-buttons.ts        — Broken links and dead buttons
      fonts.ts                — Font allowlist check
      slug-match.ts           — URL slug vs page name check
      hover-states.ts         — Hover style change detection
      hidden-elements.ts      — Suspicious hidden element detection
      spelling.ts             — Placeholder/mixed-language heuristic

components/
  ReportView.tsx              — Full report layout
  ScanSummaryHeader.tsx       — Top-level summary (pass/warn/fail counts)
  PageCard.tsx                — Per-page collapsible card
  CategorySection.tsx         — Check category group
  CheckRow.tsx                — Individual check with expandable details
  StatusBadge.tsx             — Pass/Warning/Fail/Skip badge
```

---

## Current Limitations (V1)

- **Spelling/grammar** is purely heuristic (repeated words, Lorem ipsum, mixed scripts). No external grammar API is used. Confidence is intentionally low.
- **Font detection** relies on computed CSS `fontFamily`. Font names that don't exactly match the allowlist will be flagged even if they're valid. The allowlist in `config.ts` covers common Google/Wix fonts but may need extension.
- **Hover states** are checked by hovering elements and comparing computed styles. Elements that use CSS `:hover` with transitions may not always be detected correctly due to timing.
- **Slug matching** uses a partial/fuzzy comparison. Short slugs (e.g. `home`) are prone to false negatives.
- **Hidden elements** ignores many legitimate patterns (accordions, modals, mobile menus) but may still flag some.
- **No history** — scans are not saved. Refresh = data lost.
- **One scan at a time** — no queue, no background jobs.
- **No auth** — this is a local-only internal tool.
- Scan may take **1–3 minutes** depending on page count and site speed.

---

## What to Improve in V2

1. **Spelling/grammar** — Integrate LanguageTool API or similar for real grammar detection
2. **Font detection** — Pull live Google Fonts list via API; detect `@font-face` declarations
3. **Scan history** — Persist results to SQLite or a JSON file store
4. **Screenshots** — Capture page screenshots per scan for visual record
5. **AI explanations** — Add an LLM step to explain failures in plain English
6. **Background scanning** — Queue system so UI doesn't wait for the full scan
7. **Multiple URLs** — Batch scan across multiple templates
8. **Configurable checks** — Enable/disable specific checks per scan run
9. **Export** — Download scan report as PDF or JSON
10. **False positive tuning** — Build a feedback loop for marking false positives
