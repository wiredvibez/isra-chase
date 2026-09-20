import type { Chase, ExpiryRule, Mission, ReleaseRule, Stamp } from "./types";

export type MissionAvailability =
  | { state: "draft"; reason: string }
  | { state: "locked"; reason: string; releasesAt: number | null }
  | { state: "available"; expiresAt: number | null }
  | { state: "expired"; reason: string };

function ms(value: Stamp | null | undefined): number | null {
  return value ? value.toMillis() : null;
}

/** A team's progress, as far as availability is concerned. */
export interface TeamProgress {
  points: number;
  /** missionId -> whether that team's submission was graded correct. */
  completed: Record<string, { correct: boolean }>;
}

export function resolveReleaseAt(
  rule: ReleaseRule,
  chase: Pick<Chase, "startAt" | "endAt">,
): number | null {
  const start = ms(chase.startAt);
  const end = ms(chase.endAt);
  switch (rule.kind) {
    case "chase_start":
      return start;
    case "relative": {
      const anchor = rule.anchor === "start" ? start : end;
      return anchor === null ? null : anchor + rule.offsetMs;
    }
    case "specific":
      return ms(rule.at);
    default:
      // mission- and points-triggered releases have no wall-clock time.
      return null;
  }
}

export function resolveExpiryAt(
  rule: ExpiryRule,
  chase: Pick<Chase, "startAt" | "endAt">,
): number | null {
  const start = ms(chase.startAt);
  const end = ms(chase.endAt);
  switch (rule.kind) {
    case "chase_end":
      return end;
    case "relative": {
      const anchor = rule.anchor === "start" ? start : end;
      return anchor === null ? null : anchor + rule.offsetMs;
    }
    case "specific":
      return ms(rule.at);
  }
}

/**
 * Whether a mission is visible and playable for a given team right now.
 *
 * Mirrors Goosechase: locked missions are entirely invisible; a completed
 * mission stays visible after expiry; a point-threshold mission disappears
 * again if the team's total drops back below the threshold before they
 * complete it.
 */
export function missionAvailability(
  mission: Mission,
  chase: Pick<Chase, "startAt" | "endAt" | "status">,
  progress: TeamProgress,
  now = Date.now(),
): MissionAvailability {
  if (mission.isDraft) {
    return { state: "draft", reason: "המשימה עדיין טיוטה." };
  }

  const alreadyCompleted = Boolean(progress.completed[mission.id]);
  const expiresAt = resolveExpiryAt(mission.expiry, chase);

  // Gate first, since a locked mission must not even hint that it exists.
  const gate = mission.release;
  if (gate.kind === "mission") {
    const trigger = progress.completed[gate.missionId];
    const satisfied = gate.requireCorrect ? trigger?.correct === true : Boolean(trigger);
    if (!satisfied && !alreadyCompleted) {
      return {
        state: "locked",
        reason: "נפתחת אחרי שמשלימים משימה אחרת.",
        releasesAt: null,
      };
    }
  } else if (gate.kind === "points") {
    if (progress.points < gate.points && !alreadyCompleted) {
      return {
        state: "locked",
        reason: `נפתחת ב-${gate.points} נקודות.`,
        releasesAt: null,
      };
    }
  } else {
    const releasesAt = resolveReleaseAt(gate, chase);
    if (releasesAt !== null && now < releasesAt) {
      return {
        state: "locked",
        reason: "עוד לא נפתחה.",
        releasesAt,
      };
    }
    // A chase that has not started yet keeps everything locked.
    if (releasesAt === null && chase.status !== "live" && chase.status !== "ended") {
      return {
        state: "locked",
        reason: "המרדף עוד לא התחיל.",
        releasesAt: null,
      };
    }
  }

  if (expiresAt !== null && now > expiresAt && !alreadyCompleted) {
    return { state: "expired", reason: "המשימה נסגרה." };
  }

  return { state: "available", expiresAt };
}

/** Sort missions the way the chase's `missionOrder` setting says to. */
export function orderMissions(
  missions: Mission[],
  order: Chase["missionOrder"],
  seed: string,
): Mission[] {
  const list = [...missions];
  switch (order) {
    case "points":
      return list.sort((a, b) => a.points - b.points || a.name.localeCompare(b.name));
    case "alphabetical":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "custom":
      return list.sort((a, b) => a.order - b.order);
    case "random":
      // Stable per-team shuffle: same team always sees the same order.
      return list
        .map((m) => ({ m, k: hash(`${seed}:${m.id}`) }))
        .sort((a, b) => a.k - b.k)
        .map(({ m }) => m);
  }
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
