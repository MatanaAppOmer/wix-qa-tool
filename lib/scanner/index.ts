import type { Page } from 'playwright';
import type { Category, Check, ScanResult } from './types';
import { checkH1 } from './checks/h1';
import { checkTextSize } from './checks/text-size';
import { checkHeaderFooter } from './checks/header-footer';
import { checkLinksButtons } from './checks/links-buttons';
import { checkFonts } from './checks/fonts';
import { checkSlugMatch } from './checks/slug-match';
import { checkHoverStates } from './checks/hover-states';
import { checkHiddenElements } from './checks/hidden-elements';
import { checkSpelling } from './checks/spelling';
import { crawlAndScan } from './crawler';

/**
 * Run all QA checks on a single Playwright page and return
 * results grouped by category.
 */
export async function runChecksOnPage(page: Page): Promise<Category[]> {
  // Run checks in parallel where possible
  const [
    h1,
    textSize,
    headerFooter,
    linksButtons,
    fonts,
    slugMatch,
    hoverStates,
    hiddenElements,
    spelling,
  ] = await Promise.all([
    checkH1(page),
    checkTextSize(page),
    checkHeaderFooter(page),
    checkLinksButtons(page),
    checkFonts(page),
    checkSlugMatch(page),
    checkHoverStates(page),
    checkHiddenElements(page),
    checkSpelling(page),
  ]);

  const categories: Category[] = [
    {
      id: 'design-content',
      name: 'Design & Content',
      checks: [spelling, slugMatch],
    },
    {
      id: 'structure',
      name: 'Structure',
      checks: [headerFooter, hiddenElements],
    },
    {
      id: 'experience',
      name: 'Experience',
      checks: [fonts, hoverStates, linksButtons],
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      checks: [h1, textSize],
    },
  ];

  return categories;
}

/**
 * Tally all check statuses across all pages.
 */
function tally(pages: ScanResult['pages']) {
  let pass = 0, warning = 0, fail = 0, skip = 0;
  for (const p of pages) {
    for (const cat of p.categories) {
      for (const check of cat.checks) {
        if (check.status === 'pass') pass++;
        else if (check.status === 'warning') warning++;
        else if (check.status === 'fail') fail++;
        else skip++;
      }
    }
  }
  return { pass, warning, fail, skip };
}

/**
 * Entry point: crawl a template URL and return a full ScanResult.
 */
export async function runScan(rootUrl: string): Promise<ScanResult> {
  const { pages, crawlErrors } = await crawlAndScan(rootUrl);
  const counts = tally(pages);

  return {
    summary: {
      rootUrl,
      timestamp: new Date().toISOString(),
      pagesFound: pages.length,
      totalPass: counts.pass,
      totalWarning: counts.warning,
      totalFail: counts.fail,
      totalSkip: counts.skip,
    },
    pages,
    crawlErrors,
  };
}
