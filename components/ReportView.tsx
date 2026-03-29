'use client';

import { useState } from 'react';
import type { ScanResult } from '@/lib/scanner/types';
import { ReportOverviewCards } from './ReportOverviewCards';
import { SidebarPageItem } from './SidebarPageItem';
import { PageDetailPanel } from './PageDetailPanel';
import { IssueSummaryPanel } from './IssueSummaryPanel';

interface Props {
  result: ScanResult;
  elapsed?: number;
  onNewScan?: () => void;
}

export function ReportView({ result, elapsed, onNewScan }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const selectedPage = result.pages[selectedIndex] ?? null;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <ReportOverviewCards result={result} elapsed={elapsed} onNewScan={onNewScan} />

      {/* Issue summary action bar */}
      {result.pages.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSummary((v) => !v)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-lg border transition-all ${
              showSummary
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900'
            }`}
          >
            {showSummary ? '▲ Hide summary' : '▼ Issue summary'}
          </button>
          <span className="text-[11px] text-zinc-400">
            grouped view · easy to copy and share
          </span>
        </div>
      )}

      {/* Issue summary panel */}
      {showSummary && result.pages.length > 0 && (
        <IssueSummaryPanel result={result} onClose={() => setShowSummary(false)} />
      )}

      {/* Crawl errors */}
      {result.crawlErrors.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
          <h3 className="text-[10px] font-semibold text-orange-600 uppercase tracking-widest mb-2">
            Crawl errors · {result.crawlErrors.length}
          </h3>
          <ul className="space-y-1.5">
            {result.crawlErrors.map((e, i) => (
              <li key={i} className="text-xs font-mono text-orange-700 flex gap-2">
                <span className="text-orange-400 shrink-0 break-all">{e.url}</span>
                <span className="text-orange-300">—</span>
                <span className="text-orange-600">{e.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sidebar + detail */}
      {result.pages.length > 0 && (
        <div className="flex gap-3 items-start">
          {/* Sidebar */}
          <aside className="w-52 lg:w-60 shrink-0 sticky top-14 max-h-[calc(100vh-4.5rem)] flex flex-col">
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col min-h-0 flex-1">
              <div className="px-3 pt-3 pb-2 border-b border-zinc-100">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                  Pages · {result.pages.length}
                </p>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
                {result.pages.map((page, i) => (
                  <SidebarPageItem
                    key={page.url}
                    page={page}
                    isSelected={i === selectedIndex}
                    onSelect={() => setSelectedIndex(i)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Detail panel */}
          <div className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            {selectedPage ? (
              <PageDetailPanel page={selectedPage} />
            ) : (
              <p className="text-sm text-zinc-400 py-8 text-center">
                Select a page from the sidebar to view its QA report.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
