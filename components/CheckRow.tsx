'use client';

import { useState } from 'react';
import type { Check, CheckDetail } from '@/lib/scanner/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  check: Check;
}

export function CheckRow({ check }: Props) {
  // Failures auto-expand; everything else starts collapsed
  const [open, setOpen] = useState(check.status === 'fail');
  const hasDetails = (check.details?.length ?? 0) > 0;

  const rowStyle = {
    fail:    'border-red-200 bg-red-50/70',
    warning: 'border-amber-100 bg-amber-50/30',
    pass:    'border-zinc-100 bg-white',
    skip:    'border-zinc-100 bg-white',
  }[check.status];

  const summaryColor = {
    fail:    'text-zinc-700',
    warning: 'text-zinc-600',
    pass:    'text-zinc-400',
    skip:    'text-zinc-400',
  }[check.status];

  const nameColor = {
    fail:    'text-zinc-900',
    warning: 'text-zinc-800',
    pass:    'text-zinc-500',
    skip:    'text-zinc-400',
  }[check.status];

  return (
    <div className={`rounded-lg border overflow-hidden ${rowStyle}`}>
      <button
        onClick={() => hasDetails && setOpen((v) => !v)}
        className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors ${
          hasDetails ? 'cursor-pointer hover:brightness-[0.97]' : 'cursor-default'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          <StatusBadge status={check.status} size="xs" />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-medium leading-tight ${nameColor}`}>{check.name}</p>
          <p className={`text-[11px] mt-0.5 leading-relaxed ${summaryColor}`}>{check.summary}</p>
          {check.confidence !== undefined && (
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Heuristic · {Math.round(check.confidence * 100)}% confidence
            </p>
          )}
        </div>

        {hasDetails && (
          <span className="shrink-0 mt-0.5 text-[10px] text-zinc-400 flex items-center gap-0.5">
            {check.details!.length}
            <span className="ml-0.5">{open ? '▲' : '▼'}</span>
          </span>
        )}
      </button>

      {open && hasDetails && (
        <div className="border-t border-zinc-100 bg-white/80 px-3.5 py-3 space-y-1.5">
          {check.details!.map((d, i) => (
            <DetailBlock key={i} detail={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DetailBlock({ detail }: { detail: CheckDetail }) {
  const rows: { label: string; value: string; mono?: boolean; color?: string }[] = [];

  if (detail.selector) rows.push({ label: 'selector', value: detail.selector, mono: true });
  if (detail.text)     rows.push({ label: 'text',     value: `"${detail.text}"` });
  if (detail.href)     rows.push({ label: 'href',     value: detail.href || '(empty)', mono: true, color: 'text-blue-600' });
  if (detail.font)     rows.push({ label: 'font',     value: detail.font, mono: true });
  if (detail.size)     rows.push({ label: 'size',     value: detail.size, mono: true, color: 'text-red-600' });
  if (detail.value)    rows.push({ label: 'value',    value: detail.value });
  if (detail.note)     rows.push({ label: 'note',     value: detail.note, color: 'text-amber-700' });

  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 space-y-1">
      {rows.map(({ label, value, mono, color }) => (
        <div key={label} className="flex items-baseline gap-2 text-[11px]">
          <span className="shrink-0 text-zinc-400 w-14 text-right">{label}</span>
          <span className={`break-all leading-snug ${mono ? 'font-mono' : ''} ${color ?? 'text-zinc-700'}`}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
