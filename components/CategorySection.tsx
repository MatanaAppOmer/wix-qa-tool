'use client';

import { useState } from 'react';
import type { Category, CheckStatus } from '@/lib/scanner/types';
import { CheckRow } from './CheckRow';

interface Props {
  category: Category;
}

const CATEGORY_LABEL: Record<string, string> = {
  'design-content': 'Design & Content',
  'structure':      'Structure',
  'experience':     'Experience',
  'accessibility':  'Accessibility',
};

function worstStatus(statuses: CheckStatus[]): CheckStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warning')) return 'warning';
  if (statuses.includes('pass')) return 'pass';
  return 'skip';
}

export function CategorySection({ category }: Props) {
  const statuses = category.checks.map((c) => c.status);
  const status = worstStatus(statuses);
  const failCount    = statuses.filter((s) => s === 'fail').length;
  const warningCount = statuses.filter((s) => s === 'warning').length;
  const passCount    = statuses.filter((s) => s === 'pass').length;
  const allPass = failCount === 0 && warningCount === 0;

  // Collapsed by default only when all pass — saves vertical space
  const [open, setOpen] = useState(!allPass);

  const accentBar = {
    fail:    'bg-red-500',
    warning: 'bg-amber-400',
    pass:    'bg-zinc-200',
    skip:    'bg-zinc-100',
  }[status];

  const labelColor = {
    fail:    'text-zinc-700',
    warning: 'text-zinc-700',
    pass:    'text-zinc-400',
    skip:    'text-zinc-400',
  }[status];

  return (
    <div className="rounded-xl border border-zinc-100 overflow-hidden mb-2 last:mb-0">
      {/* Category header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-0 text-left hover:bg-zinc-50 transition-colors"
      >
        {/* Left accent */}
        <div className={`w-[3px] self-stretch ${accentBar}`} />

        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${labelColor}`}>
            {CATEGORY_LABEL[category.id] ?? category.name}
          </span>

          {/* Fail / warning badges */}
          <div className="flex items-center gap-1">
            {failCount > 0 && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                {failCount} fail
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                {warningCount} warn
              </span>
            )}
            {allPass && (
              <span className="text-[10px] text-emerald-500">✓ {passCount} passed</span>
            )}
          </div>

          <span className="ml-auto text-zinc-300 text-[10px]">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Checks */}
      {open && (
        <div className="px-3.5 py-2.5 bg-zinc-50/50 space-y-2 border-t border-zinc-100">
          {category.checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}
