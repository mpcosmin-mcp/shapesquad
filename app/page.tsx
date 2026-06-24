'use client';
import { useMemo } from 'react';
import { PERSON_COLORS } from '@/lib/shape';
import { useShapeData } from '@/lib/useShapeData';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { PersonalMetrics } from '@/components/dashboard/PersonalMetrics';
import { PersonalHistory } from '@/components/dashboard/PersonalHistory';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

/**
 * Single-page dashboard — always YOUR data (loggedInUser).
 *
 *   1. PersonalMetrics — grid de mini-module pentru toate metricele
 *   2. PersonalHistory — ultimele logs tabular + pills personal-trend.
 *
 * Colegii se vizualizează via SquadRail (click → PeekModal blur-overlay).
 */
export default function Home() {
  const { loading, people } = useShapeData();
  const { loggedInUser } = useLoggedInUser();

  const me = useMemo(() => people.find((p) => p.name === loggedInUser), [people, loggedInUser]);
  const meColor = useMemo(() => {
    const idx = people.findIndex((p) => p.name === loggedInUser);
    return PERSON_COLORS[(idx < 0 ? 0 : idx) % PERSON_COLORS.length];
  }, [people, loggedInUser]);

  if (loading) return <DashboardSkeleton />;
  if (!loggedInUser) return null;
  if (!me) {
    return (
      <div className="max-w-6xl mx-auto w-full px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Nu există date pentru &quot;{loggedInUser}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:gap-4 w-full">
      <div className="fade-in-up delay-0">
        <PersonalMetrics person={me} accent={meColor} />
      </div>

      <div className="fade-in-up delay-1">
        <PersonalHistory person={me} />
      </div>
    </div>
  );
}
