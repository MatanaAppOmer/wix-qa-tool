/**
 * Navigation element classification helper.
 * Shared by the hover-states and links-buttons checks.
 *
 * Keeps element-detection logic in one place so both checks stay consistent.
 */

// ── Selectors ─────────────────────────────────────────────────────────────────

/**
 * CSS selector for navigation-oriented interactive elements.
 * Used by the hover-state check via page.locator().
 * Covers nav links, header links, menu items, and CTA-like buttons.
 */
export const NAV_INTERACTIVE_SELECTOR = [
  'nav a[href]',
  'header a[href]',
  '[role="navigation"] a[href]',
  '[role="menuitem"]',
  '[role="menubar"] a',
  '[role="menubar"] button',
  // Broad anchor pass (filters applied at runtime)
  'a[href]:not([href^="mailto:"]):not([href^="tel:"]):not([href^="javascript:"])',
  // Buttons that could be CTAs (submit/reset are excluded)
  'button:not([type="submit"]):not([type="reset"]):not([aria-hidden="true"])',
  '[role="button"]:not([aria-hidden="true"])',
].join(', ');

/**
 * CSS selector specifically for navigation links (used by links-buttons check).
 */
export const NAV_LINK_SELECTOR = [
  'nav a[href]',
  'header a[href]',
  '[role="navigation"] a[href]',
  '[role="menuitem"] a[href]',
  'footer a[href]',
  'a[href]',
].join(', ');

// ── Classification ────────────────────────────────────────────────────────────

/**
 * Possible element kinds — describes the navigation role of an element.
 * Returned by classifyNavElement().
 */
export type NavElementKind =
  | 'nav-link'      // <a> inside <nav> or [role="navigation"]
  | 'menu-item'     // [role="menuitem"] or inside a [role="menu"]
  | 'cta-button'    // Button in main content with visible label text
  | 'section-jump'  // <a href="#section-id"> same-page anchor
  | 'non-nav'       // Interactive but not navigation-oriented
  | 'unknown';      // Could not determine

/**
 * Self-contained element classifier that can be passed to page.evaluate().
 *
 * Because this runs inside the browser context, it must NOT reference any
 * external variables or imports — everything must be defined inside the function.
 *
 * Usage:
 *   const kind = await locator.evaluate(classifyNavElement);
 */
export function classifyNavElement(el: HTMLElement): NavElementKind {
  const tag = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') ?? '').toLowerCase();
  const href = el.getAttribute('href') ?? '';

  const inNav =
    !!el.closest('nav') ||
    !!el.closest('[role="navigation"]') ||
    !!el.closest('[role="menubar"]') ||
    !!el.closest('[role="menu"]');

  const inHeader = !!el.closest('header');

  // Same-page section jump: <a href="#target">
  if (href.startsWith('#') && href.length > 1) return 'section-jump';

  // Menu item: explicit role or lives inside a nav/menu container
  if (role === 'menuitem' || (inNav && (tag === 'a' || tag === 'button' || role === 'menuitem'))) {
    return 'menu-item';
  }

  // Nav link: link in header (but not necessarily inside a <nav>)
  if (inHeader && (tag === 'a' || role === 'link')) return 'nav-link';

  // Nav link: inside <nav> container
  if (inNav && tag === 'a') return 'nav-link';

  // CTA button: button-like element in main content with non-empty label
  if (tag === 'button' || role === 'button') {
    const text = (el.textContent ?? '').trim();
    const inContent =
      !!el.closest('main') ||
      !!el.closest('section') ||
      !!el.closest('article') ||
      !!el.closest('footer') ||
      !!el.closest('[class*="hero"]') ||
      !!el.closest('[class*="cta"]') ||
      !!el.closest('[class*="banner"]');
    if (inContent && text.length > 0) return 'cta-button';
  }

  // Regular link with an href
  if (tag === 'a' && href && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
    return 'nav-link';
  }

  return 'non-nav';
}
