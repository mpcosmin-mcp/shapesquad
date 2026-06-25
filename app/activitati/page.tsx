'use client';
import { WeeklyCalendar } from '@/components/activities/WeeklyCalendar';
import { AriaLogo } from '@/components/ui/AriaLogo';

export default function ActivitatiPage() {
  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-4">
      <div className="fade-in-up delay-0 flex items-center gap-3.5">
        <AriaLogo size={56} className="shrink-0 drop-shadow-[0_0_12px_rgba(34,197,94,0.15)]" />
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-fg)]">
              Activități Aria
            </h1>
            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-good)]/10 text-[var(--color-good)] border border-[var(--color-good)]/30">
              Parteneriat Aumovio
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">
            Acces gratuit · rezervă-ți locul · vezi cine merge
          </p>
        </div>
      </div>

      <div className="fade-in-up delay-1">
        <WeeklyCalendar />
      </div>
    </div>
  );
}
