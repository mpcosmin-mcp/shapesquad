'use client';
import { useMemo } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { PersonalMetrics } from '@/components/dashboard/PersonalMetrics';
import { Forum } from '@/components/dashboard/Forum';
import { PersonalHistory } from '@/components/dashboard/PersonalHistory';
import { TeamChartPane } from '@/components/dashboard/TeamChartPane';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

/**
 * Single-page dashboard — personal-first social wellness layout.
 *
 *   1. KpiCards        — 4 KPI mari (greutate / BF / muscle / visceral).
 *   2. PersonalMetrics — grid de mini-module · click → drawer detaliat.
 *   3. Forum           — thread-uri Reddit-style cu likes + comments + replies.
 *   4. TeamChartPane   — chart multi-metric · default doar tu (linie continuă),
 *                        "Toți" opt-in pentru overlay.
 *   5. PersonalHistory — ultimele logs tabular + pills personal-trend.
 */
export default function Home() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();

  const me = useMemo(() => people.find((p) => p.name === activeUser), [people, activeUser]);
  const allNames = useMemo(() => people.map((p) => p.name), [people]);

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
        <KpiCards person={me} />
      </div>

      <div className="fade-in-up delay-1">
        <PersonalMetrics person={me} />
      </div>

      <div className="fade-in-up delay-2">
        <Forum currentUser={activeUser} allNames={allNames} />
      </div>

      <div className="fade-in-up delay-3">
        <TeamChartPane people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-4">
        <PersonalHistory person={me} />
      </div>
    </div>
  );
}
