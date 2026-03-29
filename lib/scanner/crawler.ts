import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { PageResult, CrawlError } from './types';
import { MAX_PAGES, MAX_DEPTH, PAGE_TIMEOUT } from './config';
import { runChecksOnPage } from './index';

export interface CrawlResult {
  pages: PageResult[];
  crawlErrors: CrawlError[];
}

/**
 * Normalize a URL: remove hash, trailing slash (except root), and query string
 * for deduplication purposes.
 */
function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);

    // Skip non-http(s), external, or special protocols
    if (!url.protocol.startsWith('http')) return null;

    // Remove hash and query
    url.hash = '';
    url.search = '';

    // Normalize trailing slash
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.href;
  } catch {
    return null;
  }
}

/**
 * Collect all same-origin internal links from the current page.
 */
async function collectLinks(
  page: import('playwright').Page,
  origin: string
): Promise<string[]> {
  return page.evaluate((origin: string) => {
    const links: string[] = [];
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      if (!href) continue;
      try {
        const url = new URL(href);
        if (url.origin === origin) {
          links.push(href);
        }
      } catch {
        // skip invalid URLs
      }
    }
    return links;
  }, origin);
}

/**
 * Main crawler: discovers pages via BFS and runs QA checks on each.
 */
export async function crawlAndScan(rootUrl: string): Promise<CrawlResult> {
  const pages: PageResult[] = [];
  const crawlErrors: CrawlError[] = [];

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; WixQATool/1.0; +https://internal.wix.com/qa-tool)',
      viewport: { width: 1440, height: 900 },
    });

    const rootOrigin = new URL(rootUrl).origin;
    const visited = new Set<string>();
    const normalized = normalizeUrl(rootUrl, rootUrl);
    if (!normalized) throw new Error(`Invalid root URL: ${rootUrl}`);

    // BFS queue: [url, depth]
    const queue: Array<[string, number]> = [[normalized, 0]];
    visited.add(normalized);

    while (queue.length > 0 && pages.length < MAX_PAGES) {
      const [url, depth] = queue.shift()!;

      let pageResult: PageResult | null = null;
      const playwrightPage = await context.newPage();

      try {
        await playwrightPage.goto(url, {
          timeout: PAGE_TIMEOUT,
          waitUntil: 'domcontentloaded',
        });

        // Extra wait for JS-heavy pages
        await playwrightPage.waitForTimeout(1500);

        const title = await playwrightPage.title();
        const pathname = new URL(playwrightPage.url()).pathname;

        // Run all QA checks
        const categories = await runChecksOnPage(playwrightPage);

        pageResult = {
          url: playwrightPage.url(),
          title,
          pathname,
          categories,
        };

        pages.push(pageResult);

        // Discover more links if not too deep
        if (depth < MAX_DEPTH && pages.length < MAX_PAGES) {
          const links = await collectLinks(playwrightPage, rootOrigin);
          for (const link of links) {
            const norm = normalizeUrl(link, rootOrigin);
            if (norm && !visited.has(norm)) {
              visited.add(norm);
              queue.push([norm, depth + 1]);
            }
          }
        }
      } catch (err: unknown) {
        crawlErrors.push({
          url,
          reason: err instanceof Error ? err.message : String(err),
        });
      } finally {
        await playwrightPage.close();
      }
    }
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
  }

  return { pages, crawlErrors };
}
