import type { Page } from 'playwright';
import type { Check } from '../types';

/**
 * Check H: Each page must have exactly one visible H1 tag.
 */
export async function checkH1(page: Page): Promise<Check> {
  const h1s = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1'));
    return headings
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          parseFloat(style.opacity) > 0 &&
          (rect.width > 0 || rect.height > 0)
        );
      })
      .map((el) => ({
        text: el.textContent?.trim().slice(0, 100) ?? '',
        selector: el.id ? `h1#${el.id}` : 'h1',
      }));
  });

  if (h1s.length === 0) {
    return {
      id: 'h1',
      name: 'Single H1 tag',
      status: 'fail',
      summary: 'No visible H1 tag found on this page.',
      details: [],
    };
  }

  if (h1s.length > 1) {
    return {
      id: 'h1',
      name: 'Single H1 tag',
      status: 'fail',
      summary: `Found ${h1s.length} visible H1 tags — exactly one is required.`,
      details: h1s.map((h) => ({ selector: h.selector, text: h.text })),
    };
  }

  return {
    id: 'h1',
    name: 'Single H1 tag',
    status: 'pass',
    summary: `One H1 found: "${h1s[0].text}"`,
    details: [{ selector: h1s[0].selector, text: h1s[0].text }],
  };
}
