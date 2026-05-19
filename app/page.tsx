'use client';
import { useMemo } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { PersonalMetrics } from '@/components/dashboard/PersonalMetrics';
import { SquadPulse } from '@/components/dashboard/SquadPulse';
import { Forum } from '@/components/dashboard/Forum';
import { ProgressWall } from '@/components/dashboard/ProgressWall';
import { PersonalHistory } from '@/components/dashboard/PersonalHistory';
import { TeamChartPane } from '@/components/dashboard/TeamChartPane';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

/**
 * Single-page dashboard — personal-first social wellness layout.
 *
 *   1. KpiCards       — 4 KPI mari (greutate / BF / muscle / visceral).
 *   2. PersonalMetrics — grid de mini-module: TOATE metricele tale, fiecare cu
 *                        sparkline + Δ start + Δ prev. Gender-aware measurements.
 *   3. SquadPulse     — strip orizontal · cine a logat luna asta + streak.
 *   4. Forum          — thread-uri Reddit-style: titlu, body, likes, comments,
 *                        replies. Free-form, niciuna legată de o măsurătoare.
 *   5. ProgressWall   — "pentru fun · cum stăm cu toții". Δ-uri per persoană,
 *                        fără ranking.
 *   6. TeamChartPane  — chart multi-metric · default doar tu, "Toți" opt-in.
 *   7. PersonalHistory — ultimele logs tabular + pills personal-trend.
 *
 * Floating bottom-right: Squad AI bubble (AppShell).
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
        <SquadPulse people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-3">
        <Forum currentUser={activeUser} allNames={allNames} />
      </div>

      <div className="fade-in-up delay-4">
        <ProgressWall people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-5">
        <TeamChartPane people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-5">
        <PersonalHistory person={me} />
      </div>
    </div>
  );
}
