'use client';
import { useMemo } from 'react';
import { useShapeData } from '@/lib/useShapeData';
import { useActiveUser } from '@/lib/useActiveUser';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { Leaderboard } from '@/components/dashboard/Leaderboard';
import { TeamFeed } from '@/components/dashboard/TeamFeed';
import { PersonalHistory } from '@/components/dashboard/PersonalHistory';
import { TeamChartPane } from '@/components/dashboard/TeamChartPane';
import { DashboardSkeleton } from '@/components/ui/Skeleton';

/**
 * Single-page dashboard — Sleep Tracker v2 layout, ShapeSquad domain.
 *
 *   1. KpiCards    — Greutate / Body Fat / Muscle / Visceral (giant numbers).
 *   2. Leaderboard — clasament + period tabs + badges + sparklines.
 *   3. TeamFeed    — luna asta / toate · likes + comments + replies.
 *   4. PersonalHistory — last 6 rows + status pills + trend note.
 *   5. TeamChartPane   — multi-metric chart with person filters.
 *
 * Only AI surface = floating Squad AI bubble in AppShell.
 */
export default function Home() {
  const { loading, people } = useShapeData();
  const { activeUser } = useActiveUser();

  const me = useMemo(() => people.find((p) => p.name === activeUser), [people, activeUser]);

  if (loading) return <DashboardSkeleton />;
  if (!activeUser) return null; // AppShell handles the picker
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
        <Leaderboard people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-2">
        <TeamFeed people={people} currentUser={activeUser} />
      </div>

      <div className="fade-in-up delay-3">
        <PersonalHistory person={me} />
      </div>

      <div className="fade-in-up delay-4">
        <TeamChartPane people={people} />
      </div>
    </div>
  );
}
