import type { Page } from 'playwright';
import type { Check } from '../types';

/**
 * Check D: Detect meaningful content that is present in the published DOM
 * but appears hidden via CSS or HTML attributes.
 *
 * Scope: this check inspects the *live rendered page*, not the Wix Studio
 * editor. It cannot see elements that were hidden with the editor's "eye" icon
 * before publishing — those are simply absent from the DOM.  What it does find
 * is content that was published to the page but is currently invisible to
 * visitors due to CSS rules or HTML attributes.
 */
export async function checkHiddenElements(page: Page): Promise<Check> {
  const found = await page.evaluate(() => {
    // ── Tags considered "meaningful content" ──────────────────────────────
    // Broad structural/content tags — excludes inline spans which generate
    // too much noise from JS frameworks and icon fonts.
    const CONTENT_TAGS = ['section', 'article', 'main', 'aside', 'header', 'footer',
      'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'button', 'a', 'figure', 'blockquote', 'li'];

    // ── Class/ID/role patterns that indicate legitimate UI behaviours ──────
    // These are intentionally hidden as part of how the component works
    // (e.g. accordion body before expanding, dropdown before opening).
    const LEGITIMATE_PATTERNS = [
      /\bmenu\b/i, /\bnav\b/i, /\bnavigation\b/i,
      /\bdropdown\b/i, /\bsubmenu\b/i,
      /\bmodal\b/i, /\bdialog\b/i, /\bpopup\b/i, /\bpopover\b/i,
      /\bdrawer\b/i, /\boffcanvas\b/i, /\bpanel\b/i,
      /\baccordion\b/i, /\bcollapse\b/i, /\bexpand\b/i,
      /\btab\b/i, /\btabs\b/i, /\btabpanel\b/i,
      /\bslide\b/i, /\bslider\b/i, /\bcarousel\b/i, /\bswiper\b/i,
      /\btooltip\b/i, /\boverlay\b/i, /\bbackdrop\b/i,
      /\bsr-only\b/i, /\bvisually.?hidden\b/i, /\bskip.?link\b/i,
      /\bhidden.?mobile\b/i, /\bhidden.?desktop\b/i, /\bmobile.?only\b/i,
      /\bdesktop.?only\b/i, /\boffscreen\b/i,
      /\bspinner\b/i, /\bloader\b/i, /\bskeleton\b/i,
      // Wix-specific internal containers
      /\bwix\b/i,
    ];

    function isLegitimate(el: Element): boolean {
      const role = el.getAttribute('role') ?? '';
      // Legitimate ARIA roles that are expected to be hidden at times
      if (['dialog', 'alertdialog', 'tooltip', 'menu', 'menuitem',
           'tabpanel', 'listbox', 'option'].includes(role)) return true;

      const cls   = el.className?.toString() ?? '';
      const id    = el.id ?? '';
      const label = el.getAttribute('aria-label') ?? '';
      const combined = `${cls} ${id} ${label}`;
      return LEGITIMATE_PATTERNS.some((p) => p.test(combined));
    }

    // ── Walk the DOM ───────────────────────────────────────────────────────
    const hits: Array<{ selector: string; text: string; method: string }> = [];
    const seen = new Set<string>();

    for (const tag of CONTENT_TAGS) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(tag))) {
        if (isLegitimate(el)) continue;
        if (isLegitimate(el.parentElement ?? el)) continue; // skip children of legitimate containers

        const text = el.textContent?.trim() ?? '';
        if (text.length < 4) continue; // skip icon-font characters, whitespace, etc.

        const dedupeKey = tag + '|' + text.slice(0, 30);
        if (seen.has(dedupeKey)) continue;

        const style = window.getComputedStyle(el);
        const rect  = el.getBoundingClientRect();

        let method = '';

        if (el.hasAttribute('hidden')) {
          method = 'HTML hidden attribute';
        } else if (el.getAttribute('aria-hidden') === 'true') {
          // aria-hidden hides from AT but still visible — only flag if it
          // also carries one of the CSS-hidden signals
          if (style.display === 'none' || style.visibility === 'hidden' ||
              parseFloat(style.opacity) === 0) {
            method = 'aria-hidden="true" + CSS hidden';
          }
        } else if (style.display === 'none') {
          method = 'display: none';
        } else if (style.visibility === 'hidden' && text.length > 5) {
          method = 'visibility: hidden';
        } else if (parseFloat(style.opacity) === 0 && text.length > 10) {
          method = 'opacity: 0';
        } else if (
          rect.width > 0 && rect.height > 0 &&
          (rect.right < -300 || rect.bottom < -300 || rect.left > window.innerWidth + 300)
        ) {
          method = 'positioned far off-screen';
        } else if (rect.width < 2 && rect.height < 2 && text.length > 8) {
          method = 'near-zero dimensions';
        }

        if (!method) continue;

        const selector = el.id
          ? `${tag}#${el.id}`
          : el.className?.toString().split(' ')[0]
            ? `${tag}.${el.className.toString().split(' ')[0]}`
            : tag;

        seen.add(dedupeKey);
        hits.push({ selector, text: text.slice(0, 80), method });

        if (hits.length >= 15) break; // cap per tag
      }
      if (hits.length >= 15) break;
    }

    return hits;
  });

  if (found.length === 0) {
    return {
      id: 'hidden-elements',
      name: 'Published hidden content',
      status: 'pass',
      summary: 'No hidden content found in the published page DOM.',
    };
  }

  return {
    id: 'hidden-elements',
    name: 'Published hidden content',
    status: 'warning',
    summary: `${found.length} element${found.length !== 1 ? 's' : ''} present in the published DOM but hidden from visitors — review if intentional.`,
    details: [
      // First row is a scope note so QA readers understand what this check covers
      {
        note: 'This scan detects hidden published DOM content, not all editor-hidden elements. Elements hidden in the Wix Studio editor before publishing will not appear here.',
      },
      ...found.map((r) => ({
        selector: r.selector,
        text: r.text,
        note: `Hidden content detected in the published page DOM — review if intentional (${r.method})`,
      })),
    ],
    confidence: 0.5,
  };
}
