/**
 * Font classification rules.
 *
 * Structured into 5 distinct groups so they're easy to maintain independently:
 *   1. googleFontsExact   — exact lowercase names from Google Fonts
 *   2. wixFontsExact      — exact lowercase names from Wix Studio / web-safe set
 *   3. wixFontPatterns    — regex patterns matching Wix font family variants
 *   4. acceptedFallbackFamilies — system / generic keywords always acceptable
 *   5. acceptedFallbackPatterns — regex patterns matching accepted system families
 *   6. fontAliases        — explicit alias → canonical label mappings
 *
 * Import classification logic from helpers/font-classifier.ts, not from here.
 */

import { GOOGLE_FONTS_LIST } from './google-fonts';
import { WIX_FONTS_LIST } from './wix-fonts';

// ── 1 & 2: Exact sets ─────────────────────────────────────────────────────────

export const GOOGLE_FONTS_EXACT: Set<string> = new Set(GOOGLE_FONTS_LIST);

export const WIX_FONTS_EXACT: Set<string> = new Set(WIX_FONTS_LIST);

// ── 3: Wix font family patterns ───────────────────────────────────────────────

export interface PatternRule {
  pattern: RegExp;
  /** Human-readable family label used in QA reports. */
  label: string;
}

/**
 * Regex patterns that identify Wix font family variants.
 *
 * These catch CSS font names served by Wix that include version suffixes,
 * hyphens, or other variations not captured in the exact list.
 *
 * Examples matched:
 *   wix-madefor-text-v2   → Wix Madefor family
 *   madefor-text          → Wix Madefor family
 *   wix-madefor-display   → Wix Madefor family
 */
export const WIX_FONT_PATTERNS: PatternRule[] = [
  // Wix Madefor: optional "wix-" or "wix " prefix, then "madefor"
  { pattern: /^(?:wix[- ]?)?madefor/, label: 'Wix Madefor family' },
  // Any other font name starting with "wix-" or "wix "
  { pattern: /^wix[- ]/, label: 'Wix font' },
];

// ── 4: Accepted fallback families (exact) ─────────────────────────────────────

/**
 * CSS generic keywords and common system font keywords.
 * These are always skipped as "primary font" candidates during detection
 * (they exist as fallbacks, not as the designed font choice).
 */
export const GENERIC_CSS_KEYWORDS: Set<string> = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace',
  '-apple-system', 'blinkmacsystemfont', 'apple system',
  'apple color emoji', 'noto color emoji', 'segoe ui emoji',
  'segoe ui symbol', 'emoji',
]);

// ── 5: Accepted fallback patterns ─────────────────────────────────────────────

/**
 * Regex patterns for well-known system/web-safe font families.
 *
 * Fonts matching these patterns are reported as "Accepted fallback family"
 * rather than "Unknown / unapproved", because they are universally
 * installed system fonts or well-established web-safe alternatives.
 *
 * Examples matched:
 *   helveticaneuew01-45ligh  → Helvetica family
 *   arial-boldmt             → Arial family
 *   timesnewromanpsmt        → Times New Roman family
 *   georgia-bolditalic       → Georgia family
 *   courier-oblique          → Courier family
 */
export const ACCEPTED_FALLBACK_PATTERNS: PatternRule[] = [
  { pattern: /^helvetica/, label: 'Helvetica family' },
  { pattern: /^arial/, label: 'Arial family' },
  { pattern: /^times(?:new)?roman|^timesnewroman/, label: 'Times New Roman family' },
  { pattern: /^georgia/, label: 'Georgia family' },
  { pattern: /^courier/, label: 'Courier family' },
  { pattern: /^lucida/, label: 'Lucida family' },
  { pattern: /^trebuchet/, label: 'Trebuchet MS family' },
  { pattern: /^palatino/, label: 'Palatino family' },
  { pattern: /^garamond/, label: 'Garamond family' },
  { pattern: /^verdana/, label: 'Verdana family' },
  { pattern: /^tahoma/, label: 'Tahoma family' },
  { pattern: /^impact/, label: 'Impact family' },
];

// ── 6: Font aliases ────────────────────────────────────────────────────────────

export type FontKind = 'google' | 'wix' | 'wix-variant' | 'accepted-fallback' | 'needs-review';

export interface AliasEntry {
  kind: FontKind;
  /** Canonical, human-readable name for this font (used in QA reports). */
  label: string;
}

/**
 * Explicit alias map: normalized font name → classification.
 *
 * Add entries here for font names that don't match exact lists or patterns
 * but are known to be acceptable.  Keys must be fully normalized (lowercase,
 * no quotes, collapsed whitespace).
 */
export const FONT_ALIASES: Map<string, AliasEntry> = new Map([
  // No aliases needed currently — exact lists + patterns cover all cases.
  // Example of how to add one:
  //   ['my-custom-approved-font', { kind: 'wix', label: 'My Approved Font' }],
]);
