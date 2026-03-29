import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VIEWPORT_WIDTH = 1080;
const VIEWPORT_HEIGHT = 1448;

// Known Wix banner/preview-bar selectors (free-plan ads bar, Studio preview toolbar, etc.)
const BANNER_SELECTORS = [
  '#WIX_ADS',
  '#wix-ads',
  '[id*="wix-ads" i]',
  '[data-testid="preview-bar"]',
  '[data-testid="wix-ads"]',
];

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });
  try {
    // Extra height so the clip region has room even with a tall banner
    const context = await browser.newContext({
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT + 300 },
    });
    const page = await context.newPage();

    await page.goto(parsedUrl.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Best-effort wait for full load; ignore if it takes too long (Wix sites stay active)
    await page.waitForLoadState('load', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Measure the Wix banner height (0 if not found)
    const bannerHeight: number = await page.evaluate((selectors: string[]) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.height > 0) return Math.round(rect.bottom);
        }
      }
      return 0;
    }, BANNER_SELECTORS);

    // Clip the screenshot to start below the banner
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: bannerHeight,
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      },
    });

    await context.close();

    return new Response(new Uint8Array(screenshot as Buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="screenshot.png"',
      },
    });
  } finally {
    await browser.close();
  }
}
