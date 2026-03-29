/**
 * Issue Summary utility.
 *
 * Builds a cross-page, grouped summary of all failed/warning checks.
 * Supports two wording modes: 'internal' (slightly technical) and
 * 'partner' (clean and action-oriented for external stakeholders).
 */

import type { PageResult } from '@/lib/scanner/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SummaryMode = 'internal' | 'partner';

export interface IssueGroup {
  checkId: string;
  categoryId: string;
  categoryName: string;
  severity: 'fail' | 'warning';
  internalTitle: string;
  partnerTitle: string;
  /** Deduplicated, ordered list of page names that have this issue. */
  affectedPages: string[];
}

export interface IssueSummary {
  groups: IssueGroup[];
  totalIssueTypes: number;
  totalAffectedPages: number;
  scannedPageCount: number;
}

// ── Check label map ───────────────────────────────────────────────────────────

interface CheckLabel {
  categoryId: string;
  categoryName: string;
  /** Shown internally — may use technical terms. */
  internal: string;
  /** Shown to partners — plain language, action-oriented. */
  partner: string;
}

const CHECK_LABELS: Record<string, CheckLabel> = {
  'slug-match': {
    categoryId: 'design-content',
    categoryName: 'Design & Content',
    internal: 'URL slug needs fixing',
    partner: 'Page address needs to be updated',
  },
  'spelling': {
    categoryId: 'design-content',
    categoryName: 'Design & Content',
    internal: 'Spelling or language review needed',
    partner: 'Some content may need a spelling or language review',
  },
  'header-footer': {
    categoryId: 'structure',
    categoryName: 'Structure',
    internal: 'Header or footer is missing',
    partner: 'Page structure needs attention — header or footer may be missing',
  },
  'hidden-elements': {
    categoryId: 'structure',
    categoryName: 'Structure',
    internal: 'Hidden elements need review',
    partner: 'Some page elements may need to be reviewed or removed',
  },
  'fonts': {
    categoryId: 'experience',
    categoryName: 'Experience',
    internal: 'Some fonts need review',
    partner: 'Some text styling may need adjustment',
  },
  'hover-states': {
    categoryId: 'experience',
    categoryName: 'Experience',
    internal: 'Some navigation elements are missing hover states',
    partner: 'Some buttons and links need clearer hover feedback',
  },
  'links-buttons': {
    categoryId: 'experience',
    categoryName: 'Experience',
    internal: 'Some links or buttons are not working',
    partner: 'Some links or buttons need to be checked',
  },
  'h1': {
    categoryId: 'accessibility',
    categoryName: 'Accessibility',
    internal: 'H1 structure needs fixing',
    partner: 'Some page heading structure needs adjustment',
  },
  'text-size': {
    categoryId: 'accessibility',
    categoryName: 'Accessibility',
    internal: 'Text below minimum size detected',
    partner: 'Some text may be too small to read comfortably',
  },
};

/** Stable display order for categories. */
const CATEGORY_ORDER = ['design-content', 'structure', 'experience', 'accessibility'];

// ── Page name helper ──────────────────────────────────────────────────────────

/**
 * Extract a short, human-readable page name from a PageResult.
 * Uses the first segment of the document title, or the pathname as fallback.
 */
export function getPageDisplayName(page: PageResult): string {
  if (page.title) {
    const clean = page.title.split(/[|\-–—]/)[0].trim();
    if (clean) return clean;
  }
  // Fall back to the last path segment, or "Home" for root
  const segment = page.pathname.split('/').filter(Boolean).pop();
  return segment
    ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    : 'Home';
}

// ── Core builder ─────────────────────────────────────────────────────────────

/**
 * Build a cross-page issue summary from a list of scanned PageResults.
 *
 * Groups failed/warning checks by check ID, collects affected page names,
 * and sorts by category order then severity (fail before warning).
 */
export function buildIssueSummary(pages: PageResult[]): IssueSummary {
  // Map: checkId → { label info, worst severity, Set of page names }
  const grouped = new Map<
    string,
    { label: CheckLabel; severity: 'fail' | 'warning'; pages: Set<string> }
  >();

  for (const page of pages) {
    const pageName = getPageDisplayName(page);
    const allChecks = page.categories.flatMap((c) => c.checks);

    for (const check of allChecks) {
      if (check.status !== 'fail' && check.status !== 'warning') continue;

      const label = CHECK_LABELS[check.id];
      if (!label) continue; // unknown check — skip

      const existing = grouped.get(check.id);
      if (existing) {
        // Escalate severity if this page has a harder failure
        if (check.status === 'fail') existing.severity = 'fail';
        existing.pages.add(pageName);
      } else {
        grouped.set(check.id, {
          label,
          severity: check.status,
          pages: new Set([pageName]),
        });
      }
    }
  }

  // Convert to sorted array
  const groups: IssueGroup[] = Array.from(grouped.entries())
    .map(([checkId, { label, severity, pages: pageSet }]) => ({
      checkId,
      categoryId: label.categoryId,
      categoryName: label.categoryName,
      severity,
      internalTitle: label.internal,
      partnerTitle: label.partner,
      affectedPages: Array.from(pageSet),
    }))
    .sort((a, b) => {
      const catDiff = CATEGORY_ORDER.indexOf(a.categoryId) - CATEGORY_ORDER.indexOf(b.categoryId);
      if (catDiff !== 0) return catDiff;
      // Within same category: fail before warning
      if (a.severity !== b.severity) return a.severity === 'fail' ? -1 : 1;
      return 0;
    });

  const allAffected = new Set(groups.flatMap((g) => g.affectedPages));

  return {
    groups,
    totalIssueTypes: groups.length,
    totalAffectedPages: allAffected.size,
    scannedPageCount: pages.length,
  };
}

// ── Plain-text formatter ──────────────────────────────────────────────────────

/**
 * Render the issue summary as clean plain text suitable for pasting into
 * email, chat, or a document.
 */
export function formatPlainText(summary: IssueSummary, mode: SummaryMode): string {
  if (summary.groups.length === 0) {
    return 'No issues detected. All checks passed.';
  }

  const lines: string[] = [];

  // Group by category for output
  const byCategory = new Map<string, IssueGroup[]>();
  for (const group of summary.groups) {
    const bucket = byCategory.get(group.categoryName) ?? [];
    bucket.push(group);
    byCategory.set(group.categoryName, bucket);
  }

  for (const [categoryName, issues] of byCategory) {
    lines.push(categoryName.toUpperCase());
    for (const issue of issues) {
      const title = mode === 'partner' ? issue.partnerTitle : issue.internalTitle;
      const pages = issue.affectedPages.join(', ');
      lines.push(`- ${title}: ${pages}`);
    }
    lines.push('');
  }

  // Trim trailing blank line
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  return lines.join('\n');
}
