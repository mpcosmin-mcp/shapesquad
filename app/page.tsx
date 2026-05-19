'use client';
import { useMemo } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { SquadPulse } from '@/components/dashboard/SquadPulse';
import { ProgressWall } from '@/components/dashboard/ProgressWall';
import { TeamFeed } from '@/components/dashboard/TeamFeed';
import { PersonalHistory } from '@/components/dashboard/PersonalHistory';
import { TeamChartPane } from '@/components/dashboard/TeamChartPane';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

/**
 * Single-page dashboard — social wellness focus.
 *
 *   1. KpiCards     — personal indicators (Greutate / BF / Muscle / Visceral).
 *   2. SquadPulse   — who logged this month + consistency streaks.
 *   3. ProgressWall — equal-status grid: Δ per person vs their own past.
 *   4. TeamFeed     — likes + comments + replies (luna asta / toate).
 *   5. PersonalHistory — last logs + personal-trend pills + pattern note.
 *   6. TeamChartPane   — personal chart by default · opt-in "Toți" overlay.
 *
 * No leaderboards. No champion banners. No cross-user value comparisons.
 */
export default function Home() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();

  const me = useMemo(() => people.find((p) => p.name === activeUser), [people, activeUser]);

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
        <SquadPulse people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-2">
        <ProgressWall people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-3">
        <TeamFeed people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-4">
        <PersonalHistory person={me} />
      </div>

      <div className="fade-in-up delay-5">
        <TeamChartPane people={people} currentUser={activeUser} />
      </div>
    </div>
  );
}
