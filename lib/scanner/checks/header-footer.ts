import type { Page } from 'playwright';
import type { Check } from '../types';

/**
 * Check C: Every page must have a semantic header and footer.
 */
export async function checkHeaderFooter(page: Page): Promise<Check> {
  const result = await page.evaluate(() => {
    const hasHeader =
      !!document.querySelector('header') ||
      !!document.querySelector('[role="banner"]');

    const hasFooter =
      !!document.querySelector('footer') ||
      !!document.querySelector('[role="contentinfo"]');

    return { hasHeader, hasFooter };
  });

  if (result.hasHeader && result.hasFooter) {
    return {
      id: 'header-footer',
      name: 'Header and footer present',
      status: 'pass',
      summary: 'Page contains both a header and a footer.',
    };
  }

  const missing: string[] = [];
  if (!result.hasHeader) missing.push('header (<header> or role="banner")');
  if (!result.hasFooter) missing.push('footer (<footer> or role="contentinfo")');

  return {
    id: 'header-footer',
    name: 'Header and footer present',
    status: 'fail',
    summary: `Missing: ${missing.join(' and ')}.`,
    details: missing.map((m) => ({ note: `Not found: ${m}` })),
  };
}
