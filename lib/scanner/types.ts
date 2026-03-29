// ============================================================
// Shared TypeScript types for the QA scanner
// ============================================================

export type CheckStatus = 'pass' | 'warning' | 'fail' | 'skip';

export interface CheckDetail {
  selector?: string;
  text?: string;
  href?: string;
  font?: string;
  size?: string;
  value?: string;
  note?: string;
}

export interface Check {
  id: string;
  name: string;
  status: CheckStatus;
  summary: string;
  details?: CheckDetail[];
  /** confidence hint for heuristic checks (0–1) */
  confidence?: number;
}

export interface Category {
  id: string;
  name: string;
  checks: Check[];
}

export interface PageResult {
  url: string;
  title: string;
  pathname: string;
  categories: Category[];
  /** any error that occurred while scanning this page */
  error?: string;
}

export interface CrawlError {
  url: string;
  reason: string;
}

export interface ScanSummary {
  rootUrl: string;
  timestamp: string;
  pagesFound: number;
  totalPass: number;
  totalWarning: number;
  totalFail: number;
  totalSkip: number;
}

export interface ScanResult {
  summary: ScanSummary;
  pages: PageResult[];
  crawlErrors: CrawlError[];
}

// Input to the API
export interface ScanRequest {
  url: string;
}
