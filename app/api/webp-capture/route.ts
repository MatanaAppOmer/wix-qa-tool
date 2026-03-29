import { NextRequest } from 'next/server';
import { chromium } from 'playwright';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 120;

const W = 1180;
const H = 736;

// ── Recording parameters ─────────────────────────────────────────────────────
const DURATION_MS        = 3000; // total animated duration shown in the WebP
const FPS                = 15;   // 15 fps is plenty; keeps file size reasonable
const FRAME_COUNT        = Math.round((DURATION_MS / 1000) * FPS); // 45 frames
const FRAME_DELAY_MS     = Math.round(DURATION_MS / FRAME_COUNT);  // ~67 ms / frame
const FRAME_CAPTURE_WAIT = 80;   // ms to pause after each scroll before screenshotting
const SCROLL_RATIO       = 0.45; // fraction of the page to scroll through (tweak to taste)


const BANNER_SELECTORS = [
  '#WIX_ADS',
  '#wix-ads',
  '[id*="wix-ads" i]',
  '[data-testid="preview-bar"]',
];

// ── WebP RIFF helpers ────────────────────────────────────────────────────────

function u32le(v: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(v);
  return b;
}

function u24le(buf: Buffer, v: number, off: number) {
  buf[off] = v & 0xff;
  buf[off + 1] = (v >> 8) & 0xff;
  buf[off + 2] = (v >> 16) & 0xff;
}

/**
 * Extract the VP8 / VP8L bitstream chunk (including its 8-byte RIFF header)
 * from a single-frame WebP buffer produced by sharp.
 */
function extractVP8Chunk(webpBuf: Buffer): Buffer {
  let off = 12; // skip "RIFF????WEBP"
  while (off + 8 <= webpBuf.length) {
    const id = webpBuf.subarray(off, off + 4).toString('ascii');
    const size = webpBuf.readUInt32LE(off + 4);
    if (id === 'VP8 ' || id === 'VP8L') {
      return webpBuf.subarray(off, off + 8 + size);
    }
    off += 8 + size + (size & 1); // advance, pad to even
  }
  throw new Error('No VP8/VP8L chunk found in WebP frame');
}

/**
 * Assemble an animated WebP RIFF container from pre-encoded VP8 frame chunks.
 * VP8X animation flag is bit 1 of the flags uint32 (0x00000002).
 */
function buildAnimatedWebP(
  vp8Chunks: Buffer[],
  width: number,
  height: number,
  frameDelayMs: number,
): Buffer {
  // VP8X chunk (flags 4 b + canvas w 3 b + canvas h 3 b = 10 b payload)
  const vp8xData = Buffer.alloc(10, 0);
  vp8xData.writeUInt32LE(0x00000002, 0); // animation flag
  u24le(vp8xData, width - 1, 4);
  u24le(vp8xData, height - 1, 7);
  const vp8xChunk = Buffer.concat([Buffer.from('VP8X'), u32le(10), vp8xData]);

  // ANIM chunk (bg colour 4 b + loop count 2 b = 6 b payload)
  const animData = Buffer.alloc(6, 0);
  animData.writeUInt32LE(0xffffffff, 0); // background: white (BGRA)
  animData.writeUInt16LE(1, 4);          // loop once
  const animChunk = Buffer.concat([Buffer.from('ANIM'), u32le(6), animData]);

  // ANMF chunks – one per frame
  const anmfChunks = vp8Chunks.map((vp8) => {
    const pl = Buffer.alloc(16 + vp8.length, 0);
    u24le(pl, 0, 0);           // frame X / 2
    u24le(pl, 0, 3);           // frame Y / 2
    u24le(pl, width - 1, 6);   // frame width  - 1
    u24le(pl, height - 1, 9);  // frame height - 1
    u24le(pl, frameDelayMs, 12); // duration ms
    pl[15] = 0x02;             // blending: do not blend (opaque frames)
    vp8.copy(pl, 16);
    const chunk = Buffer.concat([Buffer.from('ANMF'), u32le(pl.length), pl]);
    // pad chunk to even size
    return pl.length & 1 ? Buffer.concat([chunk, Buffer.alloc(1)]) : chunk;
  });

  const riffBody = Buffer.concat([
    Buffer.from('WEBP'),
    vp8xChunk,
    animChunk,
    ...anmfChunks,
  ]);
  return Buffer.concat([Buffer.from('RIFF'), u32le(riffBody.length), riffBody]);
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return Response.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return Response.json({ error: 'URL must use http or https' }, { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });
  try {
    // Extra viewport height so clipping below the banner still gives H pixels
    const context = await browser.newContext({
      viewport: { width: W, height: H + 300 },
    });
    const page = await context.newPage();

    // Disable native smooth-scroll so our programmatic scrollTo lands instantly
    await page.addInitScript(() => {
      const s = document.createElement('style');
      s.textContent = 'html,body{scroll-behavior:auto!important}';
      document.head?.appendChild(s);
    });

    await page.goto(parsedUrl.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for network to go quiet (lazy scripts, fonts, deferred assets)
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(2500); // let entrance animations + deferred JS finish

    // Measure Wix banner (fixed element at top)
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

    // Total scrollable distance: from just below the banner to the page bottom
    const scrollable: number = await page.evaluate(
      ({ bh, h }: { bh: number; h: number }) => Math.max(0,
        Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - bh - h,
      ),
      { bh: bannerHeight, h: H },
    );

    const effectiveScrollable = scrollable * SCROLL_RATIO;

    // ── Recording pass ───────────────────────────────────────────────────────
    const pngFrames: Buffer[] = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      const t = i / Math.max(FRAME_COUNT - 1, 1); // linear: constant speed
      const scrollY = bannerHeight + Math.round(t * effectiveScrollable);
      await page.evaluate((y: number) => window.scrollTo(0, y), scrollY);
      await page.waitForTimeout(FRAME_CAPTURE_WAIT); // let paint + CSS transitions settle
      const png = await page.screenshot({
        clip: { x: 0, y: bannerHeight, width: W, height: H },
      });
      pngFrames.push(png as Buffer);
    }

    await context.close();

    // Encode each PNG frame to a lossy WebP, then pull out the VP8 bitstream
    const vp8Chunks: Buffer[] = await Promise.all(
      pngFrames.map(async (png) => {
        const webpBuf = await sharp(png).webp({ quality: 82 }).toBuffer();
        return extractVP8Chunk(webpBuf);
      }),
    );

    const animWebp = buildAnimatedWebP(vp8Chunks, W, H, FRAME_DELAY_MS);

    // Use URL path tail as the filename
    const urlPath = parsedUrl.pathname.replace(/\/$/, '');
    const pageName = urlPath.split('/').filter(Boolean).pop() || 'home';

    return new Response(new Uint8Array(animWebp), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Disposition': `attachment; filename="${pageName}.webp"`,
      },
    });
  } finally {
    await browser.close();
  }
}
