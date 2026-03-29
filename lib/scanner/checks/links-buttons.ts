import type { Page } from 'playwright';
import type { Check, CheckDetail } from '../types';

/**
 * Check G: Links and buttons must be functional (non-empty, non-dead).
 *
 * Priority order:
 *  1. Navigation menu items (high confidence — should always work)
 *  2. Header / footer links
 *  3. CTA buttons in main content
 *  4. All other visible links and buttons
 *
 * Each issue includes a specific human-readable note explaining what is broken.
 */
export async function checkLinksButtons(page: Page): Promise<Check> {
  const issues = await page.evaluate(() => {
    // ── Helpers ────────────────────────────────────────────────────────────

    type Severity = 'fail' | 'warning';

    interface Issue {
      selector: string;
      text: string;
      href?: string;
      note: string;
      severity: Severity;
    }

    const problems: Issue[] = [];

    function getSelector(el: Element): string {
      const tag = el.tagName.toLowerCase();
      if (el.id) return `${tag}#${el.id}`;
      const cls = el.className?.toString().split(' ')[0];
      return cls ? `${tag}.${cls}` : tag;
    }

    function isHidden(el: Element): boolean {
      const s = window.getComputedStyle(el);
      return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0';
    }

    /** True when the element is clearly inside a navigation region */
    function inNavRegion(el: Element): boolean {
      return (
        !!el.closest('nav') ||
        !!el.closest('[role="navigation"]') ||
        !!el.closest('[role="menubar"]') ||
        !!el.closest('[role="menu"]') ||
        !!el.closest('header')
      );
    }

    // ── Links ──────────────────────────────────────────────────────────────
    for (const a of Array.from(document.querySelectorAll('a'))) {
      if (isHidden(a)) continue;

      const href = a.getAttribute('href') ?? '';
      const text = a.textContent?.trim().slice(0, 60) ?? '';
      const sel = getSelector(a);
      const isNav = inNavRegion(a);
      const role = a.getAttribute('role') ?? '';
      const isMenuItem = role === 'menuitem' || !!a.closest('[role="menuitem"]');

      // Empty / bare # href
      if (!href || href === '#') {
        const label = isMenuItem
          ? `Menu item has empty href: "${text || '(no label)'}"`
          : `Link has empty or bare # href: "${text || '(no label)'}"`;
        problems.push({
          selector: sel, text, href,
          note: label,
          severity: isNav ? 'fail' : 'warning',
        });
        continue;
      }

      // javascript:void / javascript:; — dead placeholder
      if (href.startsWith('javascript:void') || href === 'javascript:;' || href === 'javascript:') {
        problems.push({
          selector: sel, text, href,
          note: `${isNav ? 'Navigation link' : 'Link'} uses javascript:void — likely a dead placeholder: "${text || '(no label)'}"`,
          severity: 'warning',
        });
        continue;
      }

      // Same-page anchor: verify the target exists
      if (href.startsWith('#') && href.length > 1) {
        const target = document.querySelector(href);
        if (!target) {
          problems.push({
            selector: sel, text, href,
            note: `Section link points to missing anchor target: "${href}"`,
            severity: 'warning',
          });
        }
        continue;
      }

      // Internal link: check that it is at least a parseable URL
      // (cross-origin existence checks require a network request — out of scope here)
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) {
          // Flag obviously wrong internal paths (e.g. no path at all, empty path)
          if (url.pathname === '' && !url.hash) {
            problems.push({
              selector: sel, text, href,
              note: `Internal link points to an empty path: "${href}"`,
              severity: 'warning',
            });
          }
        }
      } catch {
        // href is not a valid URL and not an anchor — flag it
        problems.push({
          selector: sel, text, href,
          note: `Link has an invalid or unparseable href: "${href}"`,
          severity: 'warning',
        });
      }
    }

    // ── Buttons ────────────────────────────────────────────────────────────
    for (const btn of Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'))) {
      if (isHidden(btn)) continue;

      const text = btn.textContent?.trim().slice(0, 60) ?? '';
      const ariaLabel = btn.getAttribute('aria-label') ?? '';
      const label = text || ariaLabel;
      const type = btn.getAttribute('type') ?? '';
      const hasOnClick = btn.hasAttribute('onclick');
      const hasAriaControls =
        btn.hasAttribute('aria-controls') ||
        btn.hasAttribute('aria-expanded') ||
        btn.hasAttribute('aria-haspopup');
      const isSubmit = type === 'submit';
      const inForm = !!btn.closest('form');
      const isNav = inNavRegion(btn);
      const sel = getSelector(btn);

      // Check for an <a> wrapper that provides the navigation behaviour
      const parentAnchor = btn.closest('a[href]');

      // CTA-like buttons: clearly labelled but with no apparent action
      if (
        label.length > 1 &&
        !hasOnClick &&
        !hasAriaControls &&
        !isSubmit &&
        !inForm &&
        !parentAnchor
      ) {
        const isCTA =
          !!btn.closest('main') ||
          !!btn.closest('section') ||
          !!btn.closest('[class*="hero"]') ||
          !!btn.closest('[class*="cta"]') ||
          !!btn.closest('[class*="banner"]') ||
          isNav;

        if (isCTA) {
          problems.push({
            selector: sel, text: label,
            note: `${isNav ? 'Navigation button' : 'CTA button'} has no navigation target or action: "${label}"`,
            severity: 'warning',
          });
        }
      }
    }

    // Return at most 30 issues, fails first
    return problems
      .sort((a, b) => (a.severity === 'fail' ? -1 : 1) - (b.severity === 'fail' ? -1 : 1))
      .slice(0, 30);
  });

  if (issues.length === 0) {
    return {
      id: 'links-buttons',
      name: 'Functional links and buttons',
      status: 'pass',
      summary: 'No broken or dead links or buttons detected.',
    };
  }

  const hasFail = issues.some((i) => i.severity === 'fail');

  const details: CheckDetail[] = issues.map((i) => ({
    selector: i.selector,
    text: i.text,
    href: i.href,
    note: i.note,
  }));

  return {
    id: 'links-buttons',
    name: 'Functional links and buttons',
    status: hasFail ? 'fail' : 'warning',
    summary: `${issues.length} broken or non-functional link${issues.length !== 1 ? 's' : ''} / button${issues.length !== 1 ? 's' : ''} detected.`,
    details,
    confidence: 0.7,
  };
}
