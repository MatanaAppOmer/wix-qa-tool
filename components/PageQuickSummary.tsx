import type { PageResult } from '@/lib/scanner/types';
import { getPageBriefLines, getPageCounts } from '@/lib/utils/pageSummary';

interface Props {
  page: PageResult;
}

// Map known brief line text → severity for individual chip coloring
function chipColorForLine(line: string): string {
  const lower = line.toLowerCase();
  if (
    lower.includes('missing h1') ||
    lower.includes('multiple h1') ||
    lower.includes('missing header') ||
    lower.includes('missing footer') ||
    lower.includes('fail:')
  ) {
    return 'bg-red-50 text-red-700 ring-red-200';
  }
  if (
    lower.includes('broken link') ||
    lower.includes('font issue') ||
    lower.includes('small text') ||
    lower.includes('hidden element') ||
    lower.includes('hover state') ||
    lower.includes('slug mismatch') ||
    lower.includes('content issue')
  ) {
    return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
  if (lower === 'all core checks passed') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  return 'bg-zinc-100 text-zinc-500 ring-zinc-200';
}

export function PageQuickSummary({ page }: Props) {
  const brief = getPageBriefLines(page);
  const counts = getPageCounts(page);
  const allGood = counts.fail === 0 && counts.warning === 0;

  if (allGood) return null; // header already says "all checks passed"

  if (brief.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {brief.map((line, i) => (
        <span
          key={i}
          className={`text-[11px] px-2.5 py-1 rounded-full ring-1 ring-inset font-medium ${chipColorForLine(line)}`}
        >
          {line}
        </span>
      ))}
    </div>
  );
}
