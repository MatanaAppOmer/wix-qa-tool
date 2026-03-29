'use client';

interface Props {
  progress: number; // 0–100
  className?: string;
  isDark?: boolean;
}

export function ProgressBar({ progress, className = '', isDark = false }: Props) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-zinc-100'} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${isDark ? 'bg-blue-500' : 'bg-zinc-900'}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
