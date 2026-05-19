import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl',
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = 'Card';
