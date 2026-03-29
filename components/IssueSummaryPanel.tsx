'use client';

import { useState } from 'react';
import type { ScanResult } from '@/lib/scanner/types';
import {
  buildIssueSummary,
  formatPlainText,
  type IssueGroup,
  type SummaryMode,
} from '@/lib/utils/issueSummary';

interface Props {
  result: ScanResult;
  onClose: () => void;
}

export function IssueSummaryPanel({ result, onClose }: Props) {
  const [mode, setMode] = useState<SummaryMode>('internal');
  const [copied, setCopied] = useState<SummaryMode | null>(null);

  const summary = buildIssueSummary(result.pages);

  async function handleCopy(copyMode: SummaryMode) {
    const text = formatPlainText(summary, copyMode);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(copyMode);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard not available (e.g. insecure context) — silent fail
    }
  }

  // Bucket groups by category name (preserves order from buildIssueSummary)
  const categories: Array<{ name: string; groups: IssueGroup[] }> = [];
  for (const group of summary.groups) {
    const last = categories[categories.length - 1];
    if (last && last.name === group.categoryName) {
      last.groups.push(group);
    } else {
      categories.push({ name: group.categoryName, groups: [group] });
    }
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            Issue Summary
          </p>
          <span className="text-[11px] text-zinc-400">
            {summary.totalIssueTypes} issue type{summary.totalIssueTypes !== 1 ? 's' : ''}
            {' · '}
            {summary.totalAffectedPages} page{summary.totalAffectedPages !== 1 ? 's' : ''} affected
          </span>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-[11px]">
            <button
              onClick={() => setMode('internal')}
              className={`px-3 py-1 font-medium transition-colors ${
                mode === 'internal'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              Internal
            </button>
            <button
              onClick={() => setMode('partner')}
              className={`px-3 py-1 font-medium transition-colors border-l border-zinc-200 ${
                mode === 'partner'
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              Partner
            </button>
          </div>

          <button
            onClick={() => handleCopy(mode)}
            className="text-[11px] font-medium px-3 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
          >
            {copied === mode ? '✓ Copied' : 'Copy'}
          </button>

          <button
            onClick={onClose}
            aria-label="Close summary"
            className="text-zinc-400 hover:text-zinc-700 transition-colors text-base leading-none px-1.5"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {summary.groups.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-400">
          No issues detected — all checks passed across all pages.
        </div>
      ) : (
        <div className="px-5 py-4 space-y-5">
          {categories.map(({ name, groups }) => (
            <CategoryBlock key={name} categoryName={name} groups={groups} mode={mode} />
          ))}
        </div>
      )}

      {/* ── Footer: copy both modes ── */}
      {summary.groups.length > 0 && (
        <div className="px-5 py-3 border-t border-zinc-100 flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mr-1">
            Copy
          </span>
          <button
            onClick={() => handleCopy('internal')}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-lg px-3 py-1 transition-all"
          >
            {copied === 'internal' ? '✓ Internal copied' : 'Internal summary'}
          </button>
          <button
            onClick={() => handleCopy('partner')}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 rounded-lg px-3 py-1 transition-all"
          >
            {copied === 'partner' ? '✓ Partner copied' : 'Partner summary'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryBlock({
  categoryName,
  groups,
  mode,
}: {
  categoryName: string;
  groups: IssueGroup[];
  mode: SummaryMode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2.5">
        {categoryName}
      </p>
      <div className="space-y-2">
        {groups.map((g) => (
          <IssueRow key={g.checkId} group={g} mode={mode} />
        ))}
      </div>
    </div>
  );
}

function IssueRow({ group, mode }: { group: IssueGroup; mode: SummaryMode }) {
  const title = mode === 'partner' ? group.partnerTitle : group.internalTitle;

  const severityDot =
    group.severity === 'fail'
      ? 'bg-red-400'
      : 'bg-amber-400';

  return (
    <div className="flex items-start gap-2.5">
      {/* Severity indicator */}
      <span className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${severityDot}`} />

      <div className="min-w-0">
        <p className="text-[12px] font-medium text-zinc-800 leading-snug">{title}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
          {group.affectedPages.join(', ')}
        </p>
      </div>
    </div>
  );
}
