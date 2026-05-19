import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: number | string | null;
  unit?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: { num: 'text-base', label: 'text-[9px]' },
  md: { num: 'text-xl', label: 'text-[10px]' },
  lg: { num: 'text-3xl', label: 'text-[11px]' },
} as const;

export function Metric({ label, value, unit, color = 'var(--color-fg)', size = 'md', className }: Props) {
  const s = SIZE[size];
  return (
    <div className={cn('flex flex-col leading-tight', className)}>
      <span className={cn('label', s.label)}>{label}</span>
      <span className={cn('num font-bold', s.num)} style={{ color: value == null ? 'var(--color-fg-faint)' : color }}>
        {value ?? '—'}
        {unit && value != null && <span className="text-[var(--color-fg-muted)] text-[60%] ml-0.5 font-medium">{unit}</span>}
      </span>
    </div>
  );
}
