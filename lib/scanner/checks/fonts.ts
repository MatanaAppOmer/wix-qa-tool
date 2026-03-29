import type { Page } from 'playwright';
import type { Check, CheckDetail } from '../types';
import {
  classifyFont,
  isGenericKeyword,
} from '../helpers/font-classifier';
import { GENERIC_CSS_KEYWORDS } from '../data/font-rules';

/**
 * Check E: Only Google Fonts or Wix Studio fonts are allowed.
 *
 * For each visible element the check identifies the *primary* font family
 * (first non-generic entry in the CSS font-family stack), then classifies
 * each unique primary font into one of four tiers:
 *
 *   google           → Allowed Google Font (pass)
 *   wix / wix-variant → Allowed Wix font or family variant (pass)
 *   accepted-fallback → Known system/web-safe font family variant (pass, informational)
 *   needs-review     → Unrecognized — flag for QA (warning)
 *
 * The check status is:
 *   pass    — all fonts are google / wix / wix-variant / accepted-fallback
 *   warning — one or more fonts are needs-review
 */
export async function checkFonts(page: Page): Promise<Check> {
  // Collect primary (non-generic) font names inside browser context
  const rawPrimaryFonts = await page.evaluate((genericList: string[]) => {
    const GENERIC = new Set(genericList);
    const primaryFonts = new Set<string>();
    const TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'span', 'a', 'button', 'li', 'div'];

    for (const tag of TAGS) {
      for (const el of Array.from(document.querySelectorAll(tag))) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        // font-family: "Roboto", "Helvetica Neue", sans-serif
        const families = style.fontFamily
          .split(',')
          .map((f) => f.trim().replace(/['"]/g, '').toLowerCase().replace(/\s+/g, ' ').trim());

        // First non-generic token = the actually-displayed font
        const primary = families.find((f) => f.length > 0 && !GENERIC.has(f));
        if (primary) primaryFonts.add(primary);
      }
    }

    return Array.from(primaryFonts);
  }, Array.from(GENERIC_CSS_KEYWORDS));

  // De-duplicate by normalized name, then classify each unique primary font
  const seenNormalized = new Set<string>();
  const classifications = rawPrimaryFonts
    .map((raw) => classifyFont(raw))
    .filter(({ normalizedName }) => {
      // Skip generic CSS keywords that slipped through
      if (isGenericKeyword(normalizedName)) return false;
      // Deduplicate by normalized name
      if (seenNormalized.has(normalizedName)) return false;
      seenNormalized.add(normalizedName);
      return true;
    });

  const needsReview = classifications.filter((c) => c.kind === 'needs-review');
  const acceptedFallbacks = classifications.filter((c) => c.kind === 'accepted-fallback');
  const allowed = classifications.filter((c) => c.kind !== 'needs-review' && c.kind !== 'accepted-fallback');

  // ── All fonts accepted → clean pass ────────────────────────────────────
  if (needsReview.length === 0 && acceptedFallbacks.length === 0) {
    return {
      id: 'fonts',
      name: 'Allowed fonts only (Google / Wix Studio)',
      status: 'pass',
      summary: `All ${classifications.length} detected font${classifications.length !== 1 ? 's' : ''} are on the allowlist.`,
    };
  }

  // ── Build detail rows ───────────────────────────────────────────────────
  const details: CheckDetail[] = [];

  // needs-review items first (most actionable)
  for (const c of needsReview) {
    details.push({
      font: c.normalizedName,
      value: c.label,
      note: `Unknown font — needs review: "${c.normalizedName}"`,
    });
  }

  // accepted-fallback items as informational
  for (const c of acceptedFallbacks) {
    details.push({
      font: c.normalizedName,
      value: c.label,
      note: `Accepted fallback/system font detected: ${c.reason}`,
    });
  }

  // ── Summary text ────────────────────────────────────────────────────────
  const parts: string[] = [];
  if (needsReview.length > 0) {
    parts.push(`${needsReview.length} font${needsReview.length !== 1 ? 's' : ''} need${needsReview.length === 1 ? 's' : ''} review`);
  }
  if (acceptedFallbacks.length > 0) {
    parts.push(`${acceptedFallbacks.length} accepted fallback family variant${acceptedFallbacks.length !== 1 ? 's' : ''} detected`);
  }
  if (allowed.length > 0) {
    parts.push(`${allowed.length} fully approved`);
  }

  return {
    id: 'fonts',
    name: 'Allowed fonts only (Google / Wix Studio)',
    status: needsReview.length > 0 ? 'warning' : 'pass',
    summary: parts.join(' · '),
    details,
    confidence: 0.8,
  };
}
