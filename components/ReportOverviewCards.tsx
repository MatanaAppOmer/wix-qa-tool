import type { ScanResult } from '@/lib/scanner/types';
import { getScanOverview } from '@/lib/utils/pageSummary';

interface Props {
  result: ScanResult;
  elapsed?: number;
  onNewScan?: () => void;
}

export function ReportOverviewCards({ result, elapsed, onNewScan }: Props) {
  const { summary } = result;
  const ov = getScanOverview(result.pages);
  const ts = new Date(summary.timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const hasFailures =
    ov.pagesWithFail > 0 ||
    ov.pagesMissingH1 > 0 ||
    ov.pagesMissingHeaderFooter > 0;

  const hasWarnings =
    ov.pagesWithBrokenLinks > 0 || ov.pagesWithFontIssues > 0 || ov.pagesWithWarning > 0;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* ── Top strip: URL + meta ── */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-zinc-100">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
            Scan complete
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={summary.rootUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-zinc-800 hover:text-blue-600 hover:underline break-all leading-tight transition-colors"
            >
              {summary.rootUrl}
            </a>
            <span className="text-[10px] bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5 font-medium shrink-0">
              ↗ Open
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1.5 flex items-center gap-2">
            <span>{ts}</span>
            {elapsed !== undefined && (
              <>
                <span className="text-zinc-200">·</span>
                <span>completed in {elapsed}s</span>
              </>
            )}
          </p>
        </div>
        {onNewScan && (
          <button
            onClick={onNewScan}
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-lg px-3 py-1.5 transition-all"
          >
            ← New scan
          </button>
        )}
      </div>

      {/* ── Metrics row ── */}
      <div className="grid grid-cols-4 divide-x divide-zinc-100 border-b border-zinc-100">
        <Metric
          value={summary.pagesFound}
          label="Pages"
          sub="scanned"
        />
        <Metric
          value={summary.totalFail}
          label="Failures"
          sub="check results"
          valueColor={summary.totalFail > 0 ? 'text-red-600' : 'text-zinc-800'}
          highlight={summary.totalFail > 0}
          highlightColor="bg-red-50"
        />
        <Metric
          value={summary.totalWarning}
          label="Warnings"
          sub="check results"
          valueColor={summary.totalWarning > 0 ? 'text-amber-600' : 'text-zinc-800'}
        />
        <Metric
          value={summary.totalPass}
          label="Passing"
          sub="check results"
          valueColor="text-emerald-600"
        />
      </div>

      {/* ── Key findings ── */}
      <div className="px-5 py-4">
        {!hasFailures && !hasWarnings ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">✓</span>
            <span className="font-medium">No issues detected across all {summary.pagesFound} page{summary.pagesFound !== 1 ? 's' : ''}.</span>
            <span className="text-emerald-500">All checks passed.</span>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Needs attention
            </p>
            <div className="flex flex-wrap gap-2">
              {ov.pagesWithFail > 0 && (
                <FindingChip
                  count={ov.pagesWithFail}
                  label={`page${ov.pagesWithFail !== 1 ? 's' : ''} with failures`}
                  color="bg-red-50 text-red-700 ring-red-200"
                />
              )}
              {ov.pagesMissingH1 > 0 && (
                <FindingChip
                  count={ov.pagesMissingH1}
                  label={`missing H1`}
                  color="bg-red-50 text-red-700 ring-red-200"
                />
              )}
              {ov.pagesMissingHeaderFooter > 0 && (
                <FindingChip
                  count={ov.pagesMissingHeaderFooter}
                  label={`missing header/footer`}
                  color="bg-red-50 text-red-700 ring-red-200"
                />
              )}
              {ov.pagesWithBrokenLinks > 0 && (
                <FindingChip
                  count={ov.pagesWithBrokenLinks}
                  label={`with link issues`}
                  color="bg-amber-50 text-amber-700 ring-amber-200"
                />
              )}
              {ov.pagesWithFontIssues > 0 && (
                <FindingChip
                  count={ov.pagesWithFontIssues}
                  label={`with font issues`}
                  color="bg-amber-50 text-amber-700 ring-amber-200"
                />
              )}
              {ov.pagesWithWarning > 0 && !hasFailures && (
                <FindingChip
                  count={ov.pagesWithWarning}
                  label={`with warnings`}
                  color="bg-zinc-100 text-zinc-600 ring-zinc-200"
                />
              )}
              {ov.pagesAllPass > 0 && (
                <FindingChip
                  count={ov.pagesAllPass}
                  label={`clean page${ov.pagesAllPass !== 1 ? 's' : ''}`}
                  color="bg-emerald-50 text-emerald-700 ring-emerald-200"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  sub,
  valueColor = 'text-zinc-800',
  highlight,
  highlightColor,
}: {
  value: number;
  label: string;
  sub?: string;
  valueColor?: string;
  highlight?: boolean;
  highlightColor?: string;
}) {
  return (
    <div className={`px-5 py-4 ${highlight && highlightColor ? highlightColor : ''}`}>
      <p className={`text-3xl font-bold tabular-nums leading-none ${valueColor}`}>{value}</p>
      <p className="text-xs font-medium text-zinc-600 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  );
}

function FindingChip({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ring-1 ring-inset font-medium ${color}`}>
      <span className="font-bold tabular-nums">{count}</span>
      <span className="font-normal opacity-80">{label}</span>
    </span>
  );
}
