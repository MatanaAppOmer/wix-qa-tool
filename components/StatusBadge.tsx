import type { CheckStatus } from '@/lib/scanner/types';

interface Props {
  status: CheckStatus;
  size?: 'xs' | 'sm' | 'md';
}

const CONFIG: Record<CheckStatus, { label: string; className: string }> = {
  pass:    { label: 'Pass',    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  warning: { label: 'Warning', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  fail:    { label: 'Fail',    className: 'bg-red-50 text-red-700 ring-red-200' },
  skip:    { label: 'Skip',    className: 'bg-zinc-100 text-zinc-400 ring-zinc-200' },
};

const SIZE: Record<NonNullable<Props['size']>, string> = {
  xs: 'text-[10px] px-1.5 py-0 leading-5 font-semibold',
  sm: 'text-xs px-2 py-0.5 font-semibold',
  md: 'text-xs px-2.5 py-1 font-semibold',
};

export function StatusBadge({ status, size = 'md' }: Props) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full ring-1 ring-inset whitespace-nowrap ${className} ${SIZE[size]}`}>
      {label}
    </span>
  );
}

/** Dot indicator for compact sidebar use */
export function StatusDot({ status }: { status: CheckStatus }) {
  const colors: Record<CheckStatus, string> = {
    pass:    'bg-emerald-500',
    warning: 'bg-amber-400',
    fail:    'bg-red-500',
    skip:    'bg-zinc-300',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status]}`} />;
}
