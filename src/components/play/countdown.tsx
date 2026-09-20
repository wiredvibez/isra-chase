"use client";

import * as React from "react";

/**
 * A bare duration — "12 דק'", "3 ש' 20 דק'", "2 ימים 4 ש'" — with no framing
 * word, so each caller supplies its own ("נשארו …", "מתחיל בעוד …"). Returns
 * null once the clock runs out.
 */
function remaining(toMs: number, now: number): string | null {
  const diff = toMs - now;
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ש' ${mins % 60} דק'`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "יום" : "ימים"} ${hours % 24} ש'`;
}

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

  return toMs === null ? null : remaining(toMs, now);
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
