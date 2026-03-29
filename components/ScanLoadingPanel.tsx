'use client';

import { useEffect, useState } from 'react';
import { ProgressBar } from './ProgressBar';

interface Props {
  url: string;
  elapsed: number;
  isDark?: boolean;
}

interface Phase {
  label: string;
  detail: string;
  untilSeconds: number;
  targetProgress: number;
}

const PHASES: Phase[] = [
  { label: 'Starting browser',  detail: 'Launching headless Chromium…',               untilSeconds: 6,       targetProgress: 10 },
  { label: 'Crawling pages',    detail: 'Discovering internal links and pages…',       untilSeconds: 20,      targetProgress: 30 },
  { label: 'Running checks',    detail: 'Analyzing DOM, fonts, links, hover states…',  untilSeconds: 70,      targetProgress: 75 },
  { label: 'Finalizing',        detail: 'Aggregating results across all pages…',       untilSeconds: 100,     targetProgress: 92 },
  { label: 'Almost done',       detail: 'Taking a bit longer than usual — hang tight…', untilSeconds: Infinity, targetProgress: 98 },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function getPhaseState(elapsed: number): { phase: Phase; phaseIndex: number; progress: number } {
  let prev = { untilSeconds: 0, targetProgress: 0 };
  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    if (elapsed < phase.untilSeconds) {
      const t = (elapsed - prev.untilSeconds) / (phase.untilSeconds - prev.untilSeconds);
      return { phase, phaseIndex: i, progress: lerp(prev.targetProgress, phase.targetProgress, t) };
    }
    prev = phase;
  }
  return { phase: PHASES[PHASES.length - 1], phaseIndex: PHASES.length - 1, progress: 98 };
}

export function ScanLoadingPanel({ url, elapsed, isDark = false }: Props) {
  const { phase, phaseIndex, progress } = getPhaseState(elapsed);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const id = setInterval(() => setDots((d) => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] shadow-black/30' : 'bg-white border-zinc-200'}`}>
      <div className="px-6 pt-6 pb-5">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`shrink-0 w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-blue-400' : 'border-zinc-900'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {phase.label}{dots}
            </p>
            <p className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-white/40' : 'text-zinc-400'}`}>{url}</p>
          </div>
          <span className={`text-xs tabular-nums shrink-0 ${isDark ? 'text-white/40' : 'text-zinc-400'}`}>{elapsed}s</span>
        </div>

        {/* Progress bar */}
        <ProgressBar progress={progress} isDark={isDark} />
        <div className="mt-2 flex items-center justify-between">
          <p className={`text-[11px] ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>{phase.detail}</p>
          <p className={`text-[11px] tabular-nums ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>{Math.round(progress)}%</p>
        </div>
      </div>

      {/* Phase steps */}
      <div className={`border-t px-6 py-3.5 flex items-center gap-0 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-zinc-100 bg-zinc-50'}`}>
        {PHASES.slice(0, 4).map((p, i) => {
          const isDone    = i < phaseIndex;
          const isCurrent = i === phaseIndex;
          return (
            <div key={i} className="flex-1 flex flex-col gap-1 pr-3 last:pr-0">
              <div className={`h-px rounded-full transition-colors duration-500 ${
                isDone    ? (isDark ? 'bg-blue-500' : 'bg-zinc-900') :
                isCurrent ? (isDark ? 'bg-blue-400/50' : 'bg-zinc-400') :
                             (isDark ? 'bg-white/[0.08]' : 'bg-zinc-200')
              }`} />
              <p className={`text-[10px] leading-tight transition-colors ${
                isCurrent ? (isDark ? 'text-white/70 font-medium' : 'text-zinc-700 font-medium') :
                isDone    ? (isDark ? 'text-white/30' : 'text-zinc-400') :
                             (isDark ? 'text-white/15' : 'text-zinc-300')
              }`}>
                {p.label}
              </p>
            </div>
          );
        })}
      </div>

      <p className={`text-[10px] text-center px-6 py-2.5 border-t ${isDark ? 'border-white/[0.06] text-white/25' : 'border-zinc-100 text-zinc-400'}`}>
        Typically 1–3 minutes · keep this tab open
      </p>
    </div>
  );
}
