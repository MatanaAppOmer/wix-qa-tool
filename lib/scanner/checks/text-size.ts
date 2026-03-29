import type { Page } from 'playwright';
import type { Check } from '../types';
import { MIN_TEXT_SIZE_PX } from '../config';

/**
 * Check I: Visible text must be at least 12px.
 */
export async function checkTextSize(page: Page): Promise<Check> {
  const violations = await page.evaluate((minPx: number) => {
    const TEXT_TAGS = ['p', 'span', 'a', 'li', 'td', 'th', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'button'];
    const results: { selector: string; text: string; size: string }[] = [];
    const seen = new Set<string>();

    for (const tag of TEXT_TAGS) {
      const els = Array.from(document.querySelectorAll(tag));
      for (const el of els) {
        const style = window.getComputedStyle(el);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          parseFloat(style.opacity) === 0
        ) continue;

        // Only consider leaf-ish text nodes with direct text
        const text = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent?.trim() ?? '')
          .join(' ')
          .trim();

        if (!text || text.length < 2) continue;

        const fontSize = parseFloat(style.fontSize);
        if (isNaN(fontSize) || fontSize >= minPx) continue;

        const key = `${tag}-${text.slice(0, 30)}-${fontSize}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const id = (el as HTMLElement).id;
        const cls = (el as HTMLElement).className?.toString().split(' ')[0] ?? '';
        const selector = id ? `${tag}#${id}` : cls ? `${tag}.${cls}` : tag;

        results.push({
          selector,
          text: text.slice(0, 80),
          size: `${fontSize}px`,
        });

        if (results.length >= 20) return results; // cap
      }
    }
    return results;
  }, MIN_TEXT_SIZE_PX);

  if (violations.length === 0) {
    return {
      id: 'text-size',
      name: `Minimum text size (${MIN_TEXT_SIZE_PX}px)`,
      status: 'pass',
      summary: `All visible text is at least ${MIN_TEXT_SIZE_PX}px.`,
    };
  }

  return {
    id: 'text-size',
    name: `Minimum text size (${MIN_TEXT_SIZE_PX}px)`,
    status: 'warning',
    summary: `${violations.length} text element(s) appear below ${MIN_TEXT_SIZE_PX}px. Some may be decorative or legal fine print.`,
    details: violations.map((v) => ({ selector: v.selector, text: v.text, size: v.size })),
    confidence: 0.75,
  };
}
