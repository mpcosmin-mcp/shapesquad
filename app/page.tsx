'use client';
import { useMemo } from 'react';
import { PERSON_COLORS } from '@/lib/shape';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { useLoggedInUser } from '@/lib/useLoggedInUser';
import { PersonalMetrics } from '@/components/dashboard/PersonalMetrics';
import { PersonalHistory } from '@/components/dashboard/PersonalHistory';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

/**
 * Single-page dashboard — personal-first, unified mini-tile aesthetic.
 *
 *   1. PersonalMetrics — grid de mini-module pentru toate metricele
 *                        (greutate, BF, muscle, visceral, apă +
 *                        4 măsurători gender-aware). Click → modal detalii.
 *   2. PersonalHistory — ultimele logs tabular + pills personal-trend.
 *
 * KpiCards section was retired: its 4 metrics duplicated the first 4
 * tiles in PersonalMetrics. Tiles use the same visual language now.
 */
export default function Home() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();
  const { loggedInUser } = useLoggedInUser();

  const me = useMemo(() => people.find((p) => p.name === activeUser), [people, activeUser]);
  const meColor = useMemo(() => {
    const idx = people.findIndex((p) => p.name === activeUser);
    return PERSON_COLORS[(idx < 0 ? 0 : idx) % PERSON_COLORS.length];
  }, [people, activeUser]);
  if (loading) return <DashboardSkeleton />;
  if (!activeUser) return null;
  if (!me) {
    return (
      <div className="max-w-6xl mx-auto w-full px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-fg-muted)]">
          Nu există date pentru &quot;{activeUser}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:gap-4 max-w-6xl mx-auto w-full">
      <div className="fade-in-up delay-0">
        <PersonalMetrics person={me} accent={meColor} viewer={loggedInUser} />
      </div>

      <div className="fade-in-up delay-1">
        <PersonalHistory person={me} />
      </div>
    </div>
  );
}
