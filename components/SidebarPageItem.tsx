'use client';

import type { PageResult } from '@/lib/scanner/types';
import { getPageCounts, getPageOverallStatus, getPageBriefLines } from '@/lib/utils/pageSummary';

interface Props {
  page: PageResult;
  isSelected: boolean;
  onSelect: () => void;
}

export function SidebarPageItem({ page, isSelected, onSelect }: Props) {
  const counts = getPageCounts(page);
  const overall = getPageOverallStatus(page);
  const brief = getPageBriefLines(page);
  const title = page.title || page.pathname;
  const allGood = counts.fail === 0 && counts.warning === 0;

  // Left accent strip color by status
  const accentColor = {
    fail:    'bg-red-500',
    warning: 'bg-amber-400',
    pass:    'bg-emerald-500',
    skip:    'bg-zinc-300',
  }[overall];

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left flex items-stretch rounded-lg overflow-hidden transition-all
        ${isSelected
          ? 'bg-zinc-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]'
          : 'hover:bg-zinc-50'}
      `}
    >
      {/* Left accent strip */}
      <div className={`w-[3px] shrink-0 ${isSelected ? accentColor : 'bg-transparent'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0 px-2.5 py-2.5">
        {/* Title */}
        <p className={`text-[12px] font-medium leading-tight truncate ${isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>
          {title}
        </p>

        {/* Path */}
        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{page.pathname}</p>

        {/* Count row */}
        <div className="flex items-center gap-1.5 mt-1.5">
          {counts.fail > 0 && (
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
              {counts.fail} fail
            </span>
          )}
          {counts.warning > 0 && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
              {counts.warning} warn
            </span>
          )}
          {allGood && (
            <span className="text-[10px] text-emerald-600">✓ passed</span>
          )}
        </div>

        {/* Brief — only when selected or has issues */}
        {isSelected && brief[0] !== 'All core checks passed' && brief.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {brief.slice(0, 2).map((line, i) => (
              <p key={i} className="text-[10px] text-zinc-400 truncate">
                {line}
              </p>
            ))}
            {brief.length > 2 && (
              <p className="text-[10px] text-zinc-300">+{brief.length - 2} more</p>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
