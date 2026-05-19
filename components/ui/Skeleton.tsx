import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] animate-pulse', className)}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:gap-4 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-60" />
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  );
}
