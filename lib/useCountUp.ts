'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Animate a number from 0 to `to` over `duration` ms using an eased curve.
 * Returns the current display value. Reanimates when `to` changes meaningfully.
 */
export function useCountUp(to: number | null, duration = 700, decimals = 1): number {
  const [val, setVal] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTarget = useRef<number | null>(null);

  useEffect(() => {
    if (to == null || !Number.isFinite(to)) {
      setVal(0);
      return;
    }
    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(to);
      return;
    }
    // Skip animation if target is identical to last target
    if (lastTarget.current != null && Math.abs(lastTarget.current - to) < 0.0001) {
      setVal(to);
      return;
    }
    lastTarget.current = to;

    const from = val;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = ease(progress);
      const current = from + (to! - from) * eased;
      setVal(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, duration]);

  return Number(val.toFixed(decimals));
}
