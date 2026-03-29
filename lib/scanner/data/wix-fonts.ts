/**
 * Font families available in Wix Studio / Wix Editor.
 * Includes web-safe system fonts and Wix-hosted / Wix-branded fonts.
 * All names are lowercase for case-insensitive comparison.
 * Source: Wix Studio font picker / Wix Help Center
 * Last updated: 2026-03 — append new fonts to extend the list.
 */
export const WIX_FONTS_LIST: string[] = [
  // ── Web-safe / system fonts (available in Wix Editor) ──────────────────
  'helvetica neue', 'helvetica', 'arial', 'arial narrow', 'arial black',
  'verdana', 'tahoma', 'trebuchet ms', 'impact', 'times new roman',
  'georgia', 'palatino linotype', 'palatino', 'courier new', 'courier',
  'lucida console', 'lucida sans unicode', 'lucida grande',
  'comic sans ms', 'futura', 'gill sans', 'garamond', 'bookman',
  'avant garde', 'century gothic', 'franklin gothic medium',
  'century', 'baskerville', 'optima', 'didot', 'bodoni mt',

  // ── Common Wix font name variants (as served by Wix CSS) ───────────────
  // Wix sometimes uses concatenated names without spaces
  'helveticaneue', 'helveticaneue-light', 'helveticaneue-bold',
  'helveticaneue-italic', 'helveticaneue-medium',
  'arial-boldmt', 'arial-italicmt',
  'timesnewromanpsmt', 'timesnewroman',
  'georgia-bold', 'georgia-bolditalic', 'georgia-italic',

  // ── Wix-branded / Wix-hosted fonts ─────────────────────────────────────
  // Canonical Wix Madefor names
  'wix madefor display', 'wix madefor text',
  // Wix Madefor CSS variants served by Wix (hyphened / versioned names)
  'madefor-display', 'madefor-text',
  'wix-madefor-display', 'wix-madefor-text',
  'madefor display', 'madefor text', 'madefor',
  'basker', 'bodoni', 'corben', 'didact gothic', 'forum', 'geostar fill',
  'josefin slab', 'league script', 'mr de haviland', 'mr bedfort',
  'museo slab', 'rex',

  // ── Additional fonts bundled in Wix Studio ─────────────────────────────
  'suez one', 'belleza', 'playfair display sc',
  'libre baskerville', 'libre franklin', 'lekton', 'basic',
  'port lligat slab', 'port lligat sans', 'fanwood text',
  'gilda display', 'clicker script', 'cardo',
  'quattrocento', 'quattrocento sans', 'rammetto one',
  'stalemate', 'special elite',
  'viga', 'volkhov', 'yanone kaffeesatz', 'yeseva one',

  // ── Fonts available via Wix font picker (Google Fonts served by Wix) ───
  // (These overlap with Google Fonts intentionally — belt-and-suspenders)
  'open sans', 'roboto', 'lato', 'montserrat', 'oswald', 'raleway',
  'nunito', 'poppins', 'merriweather', 'playfair display', 'lora',
  'ubuntu', 'josefin sans', 'dancing script', 'pacifico', 'lobster',
];
