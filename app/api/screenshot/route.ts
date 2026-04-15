import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const runtime = 'nodejs';
export const maxDuration = 120;

const VIEWPORT_WIDTH  = 1080;
const OUTPUT_HEIGHT   = 1448; // final image height

// Viewport tall enough to capture OUTPUT_HEIGHT + any banner in one shot.
// A single screenshot = zero stitching = zero seam.
const VIEWPORT_HEIGHT = OUTPUT_HEIGHT + 120;

const BANNER_SELECTORS = [
  '#WIX_ADS',
  '#wix-ads',
  '[id*="wix-ads" i]',
  '[data-testid="preview-bar"]',
  '[data-testid="wix-ads"]',
];

// Selectors for popup/modal close buttons, ordered from most to least specific
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
  // Escape closes most modals
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // Try each selector via Playwright's locator — handles all element types correctly
  for (const sel of POPUP_CLOSE_SELECTORS) {
    try {
      const locator = page.locator(sel).first();
      if (await locator.isVisible({ timeout: 300 })) {
        await locator.click({ timeout: 1000 });
        await page.waitForTimeout(600); // let close animation finish
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string')
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol))
    return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      const s = document.createElement('style');
      s.textContent = 'html,body{scroll-behavior:auto!important}';
      document.head?.appendChild(s);
    });

    await page.goto(parsedUrl.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await dismissPopups(page);

    // ── 1. Measure banner, then hide it ──────────────────────────────────────
    const bannerHeight: number = await page.evaluate((sels: string[]) => {
      for (const sel of sels) {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) {
          const r = el.getBoundingClientRect();
          const h = r.height > 0 ? Math.round(r.bottom) : 0;
          el.style.setProperty('display', 'none', 'important');
          return h;
        }
      }
      return 0;
    }, BANNER_SELECTORS);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    // ── 2. Single viewport-sized screenshot — no stitching, no seam ──────────
    // The viewport is taller than OUTPUT_HEIGHT so everything fits in one shot.
    const clipHeight = Math.min(OUTPUT_HEIGHT, VIEWPORT_HEIGHT - bannerHeight);
    const png = await page.screenshot({
      clip: {
        x: 0,
        y: bannerHeight,
        width: VIEWPORT_WIDTH,
        height: clipHeight,
      },
    });

    await context.close();

    return new Response(new Uint8Array(png as Buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="screenshot.png"',
      },
    });
  } finally {
    await browser.close();
  }
}
