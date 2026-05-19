import { cn } from '@/lib/utils';

const SIZE = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
} as const;

export function Avi({
  name,
  color,
  size = 'sm',
  className,
}: {
  name: string;
  color: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold tracking-tight shrink-0',
        SIZE[size],
        className,
      )}
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
