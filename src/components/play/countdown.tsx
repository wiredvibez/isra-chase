"use client";

import * as React from "react";
import { countdown } from "@/lib/format";

/**
 * Re-renders a countdown string on its own schedule: every second inside the
 * final hour (where the seconds matter to a player), every half minute before
 * that, so a phone left open on the mission list isn't spinning needlessly.
 */
export function useCountdown(toMs: number | null): string {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (toMs === null) return;
    const remaining = toMs - Date.now();
    if (remaining <= 0) return;
    const step = remaining < 3_600_000 ? 1_000 : 30_000;
    const id = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(id);
  }, [toMs, now]);

  return countdown(toMs, now);
}

export function Countdown({
  toMs,
  className,
}: {
  toMs: number | null;
  className?: string;
}) {
  const label = useCountdown(toMs);
  if (!label) return null;
  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}
