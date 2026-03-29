import { NextRequest, NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner/index';
import type { ScanRequest } from '@/lib/scanner/types';

// Opt out of edge runtime — Playwright requires Node.js
export const runtime = 'nodejs';

// Allow up to 5 minutes for scans
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let body: Partial<ScanRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid "url" field' }, { status: 400 });
  }

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
  }

  try {
    const result = await runScan(parsedUrl.href);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('[scan] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Scan failed: ${message}` },
      { status: 500 }
    );
  }
}
