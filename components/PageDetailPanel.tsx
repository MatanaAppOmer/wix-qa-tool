import type { PageResult } from '@/lib/scanner/types';
import { getPageCounts, getPageOverallStatus } from '@/lib/utils/pageSummary';
import { StatusBadge } from './StatusBadge';
import { CategorySection } from './CategorySection';
import { PageQuickSummary } from './PageQuickSummary';

interface Props {
  page: PageResult;
}

const STATUS_STRIP: Record<string, string> = {
  fail:    'bg-red-500',
  warning: 'bg-amber-400',
  pass:    'bg-emerald-500',
  skip:    'bg-zinc-300',
};

const STATUS_HEADER_BG: Record<string, string> = {
  fail:    'bg-red-50/60',
  warning: 'bg-amber-50/40',
  pass:    'bg-zinc-50/60',
  skip:    'bg-zinc-50/40',
};

export function PageDetailPanel({ page }: Props) {
  const counts = getPageCounts(page);
  const overall = getPageOverallStatus(page);
  const allGood = counts.fail === 0 && counts.warning === 0;

  return (
    <div className="flex-1 min-w-0">
      {/* ── Page inspection header ── */}
      <div className={`-mx-5 -mt-5 mb-5 rounded-t-xl overflow-hidden ${STATUS_HEADER_BG[overall]}`}>
        {/* Status strip at very top */}
        <div className={`h-0.5 ${STATUS_STRIP[overall]}`} />

        <div className="px-5 pt-4 pb-4">
          {/* Title + badge */}
          <div className="flex items-start gap-3 mb-2">
            <StatusBadge status={overall} size="sm" />
            <h2 className="text-base font-semibold text-zinc-900 leading-snug flex-1 min-w-0">
              {page.title || page.pathname}
            </h2>
          </div>

          {/* URL + open link */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-mono text-zinc-500 truncate">{page.url}</span>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[10px] text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded px-1.5 py-0.5 transition-colors"
              aria-label="Open page in new tab"
            >
              Open ↗
            </a>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4">
            {counts.fail > 0 && (
              <StatPill value={counts.fail} label={`failure${counts.fail !== 1 ? 's' : ''}`} color="text-red-700 bg-red-100" />
            )}
            {counts.warning > 0 && (
              <StatPill value={counts.warning} label={`warning${counts.warning !== 1 ? 's' : ''}`} color="text-amber-700 bg-amber-100" />
            )}
            {counts.pass > 0 && (
              <span className="text-xs text-zinc-400">{counts.pass} passed</span>
            )}
            {allGood && (
              <span className="text-xs font-medium text-emerald-600">✓ All checks passed</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick summary chips ── */}
      <PageQuickSummary page={page} />

      {/* ── Scan error ── */}
      {page.error && (
        <div className="mb-5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="font-semibold">Scan error: </span>{page.error}
        </div>
      )}

      {/* ── Categories ── */}
      <div className="space-y-1">
        {page.categories.map((cat) => (
          <CategorySection key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  );
}

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${color}`}>
      {value} {label}
    </span>
  );
}
