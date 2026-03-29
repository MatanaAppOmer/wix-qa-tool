import type { Page } from 'playwright';
import type { Check } from '../types';
import { SUSPICIOUS_SLUG_BASES } from '../config';

/**
 * Classify a URL slug.
 *
 * Rules (in priority order):
 *
 *  FAIL  — exact match against SUSPICIOUS_SLUG_BASES (blank, page, untitled, …)
 *  FAIL  — base + numeric suffix where base is in SUSPICIOUS_SLUG_BASES (blank-1, page-2)
 *  FAIL  — starts with "copy-of-" (clearly a CMS duplicate)
 *  WARN  — any slug ending with -1, -2, … where the base is NOT in the suspicious list
 *           (e.g. contact-1 — could be a duplicate page that was never cleaned up)
 *  PASS  — everything else
 */
function classifySlug(slug: string): { status: 'fail' | 'warning' | 'pass'; message: string } {
  // ── FAIL: exact placeholder match ──────────────────────────────────────────
  if (SUSPICIOUS_SLUG_BASES.includes(slug)) {
    return {
      status: 'fail',
      message: `Unfinished page slug detected: "${slug}" — rename before publishing`,
    };
  }

  // ── FAIL / WARN: base + numeric suffix ─────────────────────────────────────
  const numSuffix = slug.match(/^(.+)-(\d+)$/);
  if (numSuffix) {
    const base = numSuffix[1];
    if (SUSPICIOUS_SLUG_BASES.includes(base)) {
      // Placeholder base + number → hard fail
      return {
        status: 'fail',
        message: `Placeholder slug detected: "${slug}"`,
      };
    }
    // Non-placeholder base + number → soft warning (possible accidental duplicate)
    return {
      status: 'warning',
      message: `Duplicated slug detected: "${slug}" — looks like an auto-numbered copy`,
    };
  }

  // ── FAIL: copy-of- prefix ───────────────────────────────────────────────────
  if (slug.startsWith('copy-of-') || (slug.startsWith('copy-') && slug.length > 5)) {
    return {
      status: 'fail',
      message: `Placeholder slug detected: "${slug}" — rename before publishing`,
    };
  }

  // ── PASS ────────────────────────────────────────────────────────────────────
  return { status: 'pass', message: `Slug looks valid: "${slug}"` };
}

/**
 * Check B: URL slug must not be a placeholder or auto-generated name.
 */
export async function checkSlugMatch(page: Page): Promise<Check> {
  const pathname = new URL(page.url()).pathname;

  // Root page — nothing to validate
  if (pathname === '/' || pathname === '') {
    return {
      id: 'slug-match',
      name: 'URL slug is valid',
      status: 'pass',
      summary: 'Root page — no slug to validate.',
    };
  }

  const rawSlug = pathname.split('/').filter(Boolean).pop() ?? '';
  const pageSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const { status, message } = classifySlug(pageSlug);

  if (status === 'pass') {
    return {
      id: 'slug-match',
      name: 'URL slug is valid',
      status: 'pass',
      summary: message,
    };
  }

  return {
    id: 'slug-match',
    name: 'URL slug is valid',
    status,
    summary: message,
    details: [
      {
        value: pageSlug,
        note: status === 'fail'
          ? 'Rename this slug to something meaningful before publishing.'
          : 'Consider renaming to avoid confusion with duplicate pages.',
      },
    ],
    confidence: 0.95,
  };
}
