import type { Page } from 'playwright';
import type { Check } from '../types';
import { HOVER_COMPARE_PROPS } from '../config';
import { NAV_INTERACTIVE_SELECTOR, classifyNavElement } from '../helpers/nav-classifier';

/**
 * Check F: Navigation-oriented interactive elements should have visible hover states.
 *
 * Only tests real navigation elements (nav links, header links, menu items, CTA
 * buttons, section-jump anchors).  Generic text links and non-navigational
 * containers are excluded to reduce false positives.
 */
export async function checkHoverStates(page: Page): Promise<Check> {
  // Collect navigation-oriented interactive elements
  const candidates = await page.locator(NAV_INTERACTIVE_SELECTOR).all();

  const tested: Array<{ selector: string; text: string; kind: string; hasHover: boolean }> = [];

  for (const el of candidates) {
    if (tested.length >= 25) break; // cap to keep scans fast

    try {
      if (!(await el.isVisible())) continue;

      // Classify the element — skip non-nav elements
      const kind = await el.evaluate(classifyNavElement);
      if (kind === 'non-nav' || kind === 'unknown') continue;

      // Skip elements without meaningful visible text or aria-label
      const text = (await el.textContent())?.trim().slice(0, 60) ?? '';
      const ariaLabel = await el.evaluate((e) => (e as HTMLElement).getAttribute('aria-label') ?? '');
      if (!text && !ariaLabel) continue;

      const label = text || ariaLabel;
      const tagName = await el.evaluate((e) => e.tagName.toLowerCase());
      const id = await el.evaluate((e) => (e as HTMLElement).id);
      const cls = await el.evaluate((e) =>
        (e as HTMLElement).className?.toString().split(' ')[0] ?? ''
      );
      const selector = id ? `${tagName}#${id}` : cls ? `${tagName}.${cls}` : tagName;

      // Capture styles before hover
      const before = await el.evaluate(
        (e, props) =>
          props.reduce(
            (acc, p) => { acc[p] = window.getComputedStyle(e).getPropertyValue(p); return acc; },
            {} as Record<string, string>
          ),
        HOVER_COMPARE_PROPS
      );

      await el.hover({ force: true, timeout: 2000 });

      // Capture styles after hover
      const after = await el.evaluate(
        (e, props) =>
          props.reduce(
            (acc, p) => { acc[p] = window.getComputedStyle(e).getPropertyValue(p); return acc; },
            {} as Record<string, string>
          ),
        HOVER_COMPARE_PROPS
      );

      const hasHover = HOVER_COMPARE_PROPS.some((p) => before[p] !== after[p]);

      tested.push({ selector, text: label, kind, hasHover });
    } catch {
      // skip off-screen, detached, or otherwise un-hoverable elements
    }
  }

  if (tested.length === 0) {
    return {
      id: 'hover-states',
      name: 'Hover states on interactive elements',
      status: 'pass',
      summary: 'No navigation interactive elements found to test.',
    };
  }

  const noHover = tested.filter((e) => !e.hasHover);

  if (noHover.length === 0) {
    return {
      id: 'hover-states',
      name: 'Hover states on interactive elements',
      status: 'pass',
      summary: `All ${tested.length} tested navigation element(s) show a visible hover state.`,
    };
  }

  const ratio = noHover.length / tested.length;
  const status = ratio > 0.4 ? 'warning' : 'pass';

  const kindLabel: Record<string, string> = {
    'nav-link': 'Navigation link',
    'menu-item': 'Menu item',
    'cta-button': 'CTA button',
    'section-jump': 'Section jump link',
  };

  return {
    id: 'hover-states',
    name: 'Hover states on interactive elements',
    status,
    summary: `${noHover.length} of ${tested.length} navigation element(s) showed no detectable hover style change.`,
    details: noHover.map((e) => ({
      selector: e.selector,
      text: e.text,
      note: `${kindLabel[e.kind] ?? 'Navigation element'} has no hover feedback: "${e.text}"`,
    })),
    confidence: 0.65,
  };
}
