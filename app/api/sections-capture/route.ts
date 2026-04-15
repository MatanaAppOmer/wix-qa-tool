import { NextRequest } from 'next/server';
import { chromium } from 'playwright';

export const runtime = 'nodejs';
export const maxDuration = 120;

const W = 1200;
const H = 748;

const BANNER_SELECTORS = [
  '#WIX_ADS',
  '#wix-ads',
  '[id*="wix-ads" i]',
  '[data-testid="preview-bar"]',
  '[data-testid="wix-ads"]',
];

interface SectionInfo {
  y: number;       // absolute page Y (before scroll offset)
  title: string | null;
}

// ── Section title extractor ──────────────────────────────────────────────────
// Called after the page is scrolled so the section is visible in the viewport.
const FIND_HEADING_IN_VIEWPORT = `
  (({ bh, h }) => {
    const viewTop = window.scrollY + bh;
    const viewBottom = viewTop + h;
    for (const sel of ['h1','h2','h3','h4']) {
      for (const el of document.querySelectorAll(sel)) {
        const rect = el.getBoundingClientRect();
        const absY = rect.top + window.scrollY;
        if (absY >= viewTop - 30 && absY < viewBottom && el.textContent?.trim()) {
          return el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60);
        }
      }
    }
    return null;
  })
`;

const POPUP_CLOSE_SELECTORS = [
  '[aria-label*="close" i]',
  '[aria-label*="dismiss" i]',
  '[data-testid*="close" i]',
  '[class*="close" i][role="button"]',
  'button[class*="close" i]',
  'button[class*="dismiss" i]',
  '[class*="modal" i] button',
  '[class*="popup" i] button',
  '[class*="overlay" i] button',
  '[class*="lightbox" i] button',
];

async function dismissPopups(page: import('playwright').Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  for (const sel of POPUP_CLOSE_SELECTORS) {
    try {
      const locator = page.locator(sel).first();
      if (await locator.isVisible({ timeout: 300 })) {
        await locator.click({ timeout: 1000 });
        await page.waitForTimeout(600);
        break;
      }
    } catch {
      // not found or not clickable — try next selector
    }
  }
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string')
    return Response.json({ error: 'Missing url' }, { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return Response.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol))
    return Response.json({ error: 'URL must use http or https' }, { status: 400 });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: W, height: H + 300 },
    });
    const page = await context.newPage();

    // waitUntil:'networkidle' in goto itself is the most reliable way to let
    // Wix's JS renderer finish before we do anything. Catch the timeout so
    // sites with persistent connections (analytics, chat) don't kill the route.
    await page.goto(parsedUrl.href, { waitUntil: 'networkidle', timeout: 45000 })
      .catch(() => {}); // timeout = page still usable, just had ongoing requests
    await page.waitForTimeout(2000); // let deferred paint / animations settle

    await dismissPopups(page);

    // ── 1. Measure Wix banner ────────────────────────────────────────────────
    const bannerHeight: number = await page.evaluate((sels: string[]) => {
      for (const sel of sels) {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.height > 0) return Math.round(r.bottom);
        }
      }
      return 0;
    }, BANNER_SELECTORS);

    const TOTAL = 6; // 1 hero + 5 sections

    // ── 2. Detect section boundaries in the DOM ──────────────────────────────
    const detected: SectionInfo[] = await page.evaluate(
      ({ bh, w, h, total }: { bh: number; w: number; h: number; total: number }) => {
        const trySelectors = [
          'section',
          '[data-mesh-id]',
          '[role="region"]',
          '[class*="Section"]',
          '[class*="section"]',
        ];

        let best: Element[] = [];
        for (const sel of trySelectors) {
          const els = Array.from(document.querySelectorAll(sel)).filter((el) => {
            const rect = el.getBoundingClientRect();
            const absTop = rect.top + window.scrollY;
            const cs = window.getComputedStyle(el);
            return (
              rect.width >= w * 0.8 &&
              rect.height >= h * 0.25 &&
              absTop >= bh - 10 &&
              cs.position !== 'fixed' &&
              cs.position !== 'sticky' &&
              cs.display !== 'none' &&
              cs.visibility !== 'hidden'
            );
          });
          if (els.length >= total) { best = els; break; }
          if (els.length > best.length) best = els;
        }

        // Sort by abs top, deduplicate clusters within 80 px
        const items = best
          .map((el) => ({ el, top: el.getBoundingClientRect().top + window.scrollY }))
          .sort((a, b) => a.top - b.top);

        const clusters: typeof items = [];
        for (const item of items) {
          const last = clusters[clusters.length - 1];
          if (!last || item.top - last.top > 80) clusters.push(item);
        }

        return clusters.slice(0, total).map(({ el, top }) => {
          const hEl = el.querySelector('h1,h2,h3,h4,[class*="title" i]');
          let title: string | null =
            hEl?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) || null;
          if (!title) title = el.getAttribute('aria-label') || null;
          return { y: top, title };
        });
      },
      { bh: bannerHeight, w: W, h: H, total: TOTAL },
    );

    // ── 3. Build final list of 6 sections (1 hero + 5) ──────────────────────
    let sections: SectionInfo[];

    if (detected.length >= TOTAL) {
      sections = detected.slice(0, TOTAL);
    } else {
      // Fallback: fixed H-px offsets starting right below the banner
      sections = Array.from({ length: TOTAL }, (_, i) => ({
        y: bannerHeight + H * i,
        title: null,
      }));

      // For sections 2–6 try to grab a heading from the visible area
      for (let i = 1; i < sections.length; i++) {
        const scrollY = Math.max(0, sections[i].y - bannerHeight);
        await page.evaluate((sy: number) => window.scrollTo(0, sy), scrollY);
        await page.waitForTimeout(900);
        sections[i].title = await page.evaluate(
          new Function(`return ${FIND_HEADING_IN_VIEWPORT}`)() as (args: { bh: number; h: number }) => string | null,
          { bh: bannerHeight, h: H },
        );
      }
    }

    // ── 4. Capture each section ──────────────────────────────────────────────
    const results: Array<{ name: string; data: string }> = [];

    // Returns a single meaningful word from a heading string.
    const STOP = new Set(['a','an','the','our','your','my','is','are','we','you','it',
      'in','on','at','to','for','of','and','or','but','with','this','that','its',
      'by','from','as','be','has','have','was','were','all','more','get','lets']);
    const oneWord = (s: string): string => {
      const words = s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      return words.find(w => w.length > 2 && !STOP.has(w)) ?? words[0] ?? 'section';
    };

    for (let i = 0; i < Math.min(sections.length, TOTAL); i++) {
      const sec = sections[i];

      const name =
        i === 0
          ? 'hero'
          : sec.title
            ? oneWord(sec.title)
            : `section${i + 1}`;

      // Hero: keep scroll at 0 so the site nav/menu is fully in frame.
      // Other sections: scroll so the section top sits just below the banner.
      const scrollY = i === 0 ? 0 : Math.max(0, sec.y - bannerHeight);
      await page.evaluate((sy: number) => window.scrollTo(0, sy), scrollY);
      await page.waitForTimeout(1400); // wait for lazy images + scroll animations to settle

      const png = await page.screenshot({
        clip: { x: 0, y: bannerHeight, width: W, height: H },
      });

      results.push({ name, data: Buffer.from(png as Buffer).toString('base64') });
    }

    await context.close();
    return Response.json({ sections: results });
  } finally {
    await browser.close();
  }
}
