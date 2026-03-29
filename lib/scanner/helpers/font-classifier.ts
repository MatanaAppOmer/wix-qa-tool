/**
 * Font classification helper.
 *
 * Provides normalization and 4-tier classification for font names detected
 * during page scans.  All logic lives here so font-check.ts stays thin.
 *
 * Classification tiers (FontKind):
 *   'google'           — exact match in Google Fonts list
 *   'wix'              — exact match in Wix Studio / web-safe list
 *   'wix-variant'      — matches a Wix font family pattern (e.g. madefor-text-v2)
 *   'accepted-fallback'— matches a known system font family pattern (e.g. helveticaneuew01-*)
 *   'needs-review'     — not recognized; flag for QA review
 */

import {
  GOOGLE_FONTS_EXACT,
  WIX_FONTS_EXACT,
  GENERIC_CSS_KEYWORDS,
  WIX_FONT_PATTERNS,
  ACCEPTED_FALLBACK_PATTERNS,
  FONT_ALIASES,
  type FontKind,
} from '../data/font-rules';

// ── Normalization ─────────────────────────────────────────────────────────────

/**
 * Normalize a raw font-family token so it can be compared against the rule sets.
 *
 * Steps applied (in order):
 *   1. Strip surrounding single/double quotes
 *   2. Lowercase
 *   3. Collapse runs of whitespace to a single space
 *   4. Trim leading/trailing whitespace
 *
 * The result is intentionally minimal — dashes, dots, and digits are preserved
 * so that versioned names like "wix-madefor-text-v2" keep their structure for
 * pattern matching.
 */
export function normalizeFontName(raw: string): string {
  return raw
    .replace(/['"]/g, '')   // strip quotes
    .toLowerCase()
    .replace(/\s+/g, ' ')   // collapse whitespace
    .trim();
}

// ── Classification result ─────────────────────────────────────────────────────

export interface FontClassification {
  /** The normalized name used for comparison. */
  normalizedName: string;
  /** Classification tier. */
  kind: FontKind;
  /** Short human-readable label for the classification (used in the UI "value" field). */
  label: string;
  /** One-line reason explaining how the classification was determined. */
  reason: string;
}

// ── Classifier ────────────────────────────────────────────────────────────────

/**
 * Classify a font-family name into one of the 5 tiers.
 *
 * Lookup order (first match wins):
 *   1. Explicit alias map
 *   2. Google Fonts exact list
 *   3. Wix Fonts exact list
 *   4. Wix font family patterns
 *   5. Accepted fallback family patterns
 *   6. Fallback → needs-review
 */
export function classifyFont(raw: string): FontClassification {
  const n = normalizeFontName(raw);

  // 1. Explicit alias
  const alias = FONT_ALIASES.get(n);
  if (alias) {
    return {
      normalizedName: n,
      kind: alias.kind,
      label: alias.label,
      reason: `Explicit alias match → "${alias.label}"`,
    };
  }

  // 2. Google Fonts exact match
  if (GOOGLE_FONTS_EXACT.has(n)) {
    return {
      normalizedName: n,
      kind: 'google',
      label: 'Allowed Google Font',
      reason: `Exact match in Google Fonts list`,
    };
  }

  // 3. Wix Fonts exact match
  if (WIX_FONTS_EXACT.has(n)) {
    return {
      normalizedName: n,
      kind: 'wix',
      label: 'Allowed Wix font',
      reason: `Exact match in Wix Studio font list`,
    };
  }

  // 4. Wix font family pattern
  for (const { pattern, label } of WIX_FONT_PATTERNS) {
    if (pattern.test(n)) {
      return {
        normalizedName: n,
        kind: 'wix-variant',
        label: `Allowed Wix font family variant`,
        reason: `Matches "${label}" pattern (${pattern})`,
      };
    }
  }

  // 5. Accepted fallback family pattern
  for (const { pattern, label } of ACCEPTED_FALLBACK_PATTERNS) {
    if (pattern.test(n)) {
      return {
        normalizedName: n,
        kind: 'accepted-fallback',
        label: `Accepted fallback family`,
        reason: `Matches ${label} pattern — system/web-safe font`,
      };
    }
  }

  // 6. Not recognized
  return {
    normalizedName: n,
    kind: 'needs-review',
    label: 'Needs review',
    reason: `Not found in Google Fonts, Wix Studio list, or known font family patterns`,
  };
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/** Returns true for kinds that require no QA action. */
export function isAccepted(kind: FontKind): boolean {
  return kind === 'google' || kind === 'wix' || kind === 'wix-variant' || kind === 'accepted-fallback';
}

/** Returns true for generic CSS keywords that should never be classified. */
export function isGenericKeyword(normalized: string): boolean {
  return GENERIC_CSS_KEYWORDS.has(normalized);
}
