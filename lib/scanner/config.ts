// ============================================================
// Scan configuration — edit font allowlists and limits here
// ============================================================

import { GOOGLE_FONTS_LIST } from './data/google-fonts';
import { WIX_FONTS_LIST } from './data/wix-fonts';

/** Max pages to crawl per scan (keeps V1 practical) */
export const MAX_PAGES = 12;

/** Max crawl depth from root */
export const MAX_DEPTH = 3;

/** Playwright browser launch timeout (ms) */
export const BROWSER_TIMEOUT = 30_000;

/** Per-page navigation timeout (ms) */
export const PAGE_TIMEOUT = 20_000;

/** Minimum allowed text size in pixels */
export const MIN_TEXT_SIZE_PX = 12;

// ── Font allowlists ────────────────────────────────────────────────────────────

/** Google Fonts families (populated from data/google-fonts.ts) */
export const GOOGLE_FONTS: string[] = GOOGLE_FONTS_LIST;

/** Wix Studio / web-safe font families (populated from data/wix-fonts.ts) */
export const WIX_FONTS: string[] = WIX_FONTS_LIST;

/** All allowed font families (combined, lowercase). */
export const ALLOWED_FONTS: Set<string> = new Set([
  ...GOOGLE_FONTS,
  ...WIX_FONTS,
  // Generic CSS fallback keywords — always allowed, never flagged
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
  '-apple-system', 'blinkmacsystemfont', 'segoe ui',
  'apple system', 'apple color emoji', 'noto color emoji',
]);

// ── Slug check ─────────────────────────────────────────────────────────────────

/**
 * Base slug words that indicate a placeholder / auto-generated page name.
 * The slug check flags these (and their "-1", "-2" numeric suffix variants) as Fail.
 * Extend this list to add more suspicious patterns.
 */
export const SUSPICIOUS_SLUG_BASES: string[] = [
  'blank',
  'page',
  'untitled',
  'new-page',
  'newpage',
  'test',
  'test-page',
  'testpage',
  'draft',
  'sample',
  'placeholder',
  'example',
  'demo',
  'temp',
  'tmp',
  'default',
  'noname',
  'unnamed',
  'home-copy',
];

// ── Hover states ───────────────────────────────────────────────────────────────

/** CSS properties to compare before/after hover for state detection */
export const HOVER_COMPARE_PROPS = [
  'color', 'background-color', 'border-color', 'outline-color',
  'text-decoration', 'box-shadow', 'transform', 'opacity',
];

/**
 * Selector for interactive elements used in the hover check.
 * Kept for backwards-compatibility; hover-states.ts now uses the
 * NAV_INTERACTIVE_SELECTOR from helpers/nav-classifier.ts.
 */
export const INTERACTIVE_SELECTOR = 'a, button, [role="button"], [role="link"]';
