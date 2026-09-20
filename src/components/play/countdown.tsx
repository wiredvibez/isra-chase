"use client";

import * as React from "react";
import { durationLeft } from "@/lib/format";

/**
 * Re-renders a countdown string on its own schedule: every second inside the
 * final hour (where the seconds matter to a player), every half minute before
 * that, so a phone left open on the mission list isn't spinning needlessly.
 */
export function useCountdown(toMs: number | null): string | null {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (toMs === null) return;
    const left = toMs - Date.now();
    if (left <= 0) return;
    const step = left < 3_600_000 ? 1_000 : 30_000;
    const id = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(id);
  }, [toMs, now]);

  return toMs === null ? null : durationLeft(toMs, now);
}

export function Countdown({
  toMs,
  prefix,
  endedLabel = "נגמר הזמן",
  className,
}: {
  toMs: number | null;
  /** Framing word placed before the duration, e.g. "נשארו". */
  prefix?: string;
  /** Shown once the clock hits zero. */
  endedLabel?: string;
  className?: string;
}) {
  const left = useCountdown(toMs);
  if (toMs === null) return null;
  return (
    <span className={className} suppressHydrationWarning>
      {left === null ? endedLabel : prefix ? `${prefix} ${left}` : left}
    </span>
  );
}
