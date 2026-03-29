import type { PageResult, CheckStatus } from '@/lib/scanner/types';

export interface PageCounts {
  fail: number;
  warning: number;
  pass: number;
  skip: number;
}

export function getPageCounts(page: PageResult): PageCounts {
  const checks = page.categories.flatMap((c) => c.checks);
  return {
    fail: checks.filter((c) => c.status === 'fail').length,
    warning: checks.filter((c) => c.status === 'warning').length,
    pass: checks.filter((c) => c.status === 'pass').length,
    skip: checks.filter((c) => c.status === 'skip').length,
  };
}

export function getPageOverallStatus(page: PageResult): CheckStatus {
  const { fail, warning, pass } = getPageCounts(page);
  if (fail > 0) return 'fail';
  if (warning > 0) return 'warning';
  if (pass > 0) return 'pass';
  return 'skip';
}

/**
 * Returns a short list of notable findings for a page.
 * Used in sidebar items and page card headers.
 */
export function getPageBriefLines(page: PageResult): string[] {
  const lines: string[] = [];
  const checks = page.categories.flatMap((c) => c.checks);

  // Hard failures — name them explicitly
  for (const check of checks) {
    if (check.status !== 'fail') continue;

    switch (check.id) {
      case 'h1':
        lines.push(check.summary.startsWith('No') ? 'Missing H1' : 'Multiple H1 tags');
        break;
      case 'header-footer':
        if (check.summary.includes('header') && check.summary.includes('footer')) {
          lines.push('Missing header & footer');
        } else if (check.summary.includes('header')) {
          lines.push('Missing header');
        } else {
          lines.push('Missing footer');
        }
        break;
      default:
        lines.push(`Fail: ${check.name}`);
    }
  }

  // Warnings — condense into short descriptions
  for (const check of checks) {
    if (check.status !== 'warning') continue;
    const count = check.details?.length ?? 0;

    switch (check.id) {
      case 'links-buttons':
        lines.push(count > 0 ? `${count} broken link${count !== 1 ? 's' : ''}` : 'Link issues');
        break;
      case 'fonts':
        lines.push(count > 0 ? `${count} font issue${count !== 1 ? 's' : ''}` : 'Font issues');
        break;
      case 'text-size':
        lines.push(count > 0 ? `${count} small text element${count !== 1 ? 's' : ''}` : 'Text size issues');
        break;
      case 'hidden-elements':
        lines.push(count > 0 ? `${count} hidden element${count !== 1 ? 's' : ''}` : 'Hidden elements');
        break;
      case 'hover-states':
        lines.push('Hover states missing');
        break;
      case 'slug-match':
        lines.push('Slug mismatch');
        break;
      case 'spelling':
        lines.push('Content issues flagged');
        break;
    }
  }

  // If nothing bad, summarize positively
  if (lines.length === 0) {
    lines.push('All core checks passed');
  }

  return lines;
}

/**
 * Overview-level stats across all pages. Used for the top summary panel.
 */
export interface ScanOverview {
  pagesWithFail: number;
  pagesWithWarning: number;
  pagesAllPass: number;
  pagesMissingH1: number;
  pagesMissingHeaderFooter: number;
  pagesWithBrokenLinks: number;
  pagesWithFontIssues: number;
}

export function getScanOverview(pages: PageResult[]): ScanOverview {
  let pagesWithFail = 0;
  let pagesWithWarning = 0;
  let pagesAllPass = 0;
  let pagesMissingH1 = 0;
  let pagesMissingHeaderFooter = 0;
  let pagesWithBrokenLinks = 0;
  let pagesWithFontIssues = 0;

  for (const page of pages) {
    const checks = page.categories.flatMap((c) => c.checks);
    const hasFail = checks.some((c) => c.status === 'fail');
    const hasWarn = checks.some((c) => c.status === 'warning');

    if (hasFail) pagesWithFail++;
    else if (hasWarn) pagesWithWarning++;
    else pagesAllPass++;

    if (checks.find((c) => c.id === 'h1')?.status === 'fail') pagesMissingH1++;
    if (checks.find((c) => c.id === 'header-footer')?.status === 'fail') pagesMissingHeaderFooter++;
    if (checks.find((c) => c.id === 'links-buttons')?.status === 'warning') pagesWithBrokenLinks++;
    if (checks.find((c) => c.id === 'fonts')?.status === 'warning') pagesWithFontIssues++;
  }

  return {
    pagesWithFail,
    pagesWithWarning,
    pagesAllPass,
    pagesMissingH1,
    pagesMissingHeaderFooter,
    pagesWithBrokenLinks,
    pagesWithFontIssues,
  };
}
