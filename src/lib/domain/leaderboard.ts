import type { Team } from "./types";

export interface RankedTeam {
  team: Team;
  /** Olympic-style: three teams tied for 2nd are followed by 5th. */
  rank: number;
  tied: boolean;
}

/**
 * Rank by points descending; ties are broken by whoever reached that total
 * first (earliest last-submission wins), matching Goosechase. Teams that are
 * genuinely identical on both keys share a rank, and the next rank skips.
 */
export function rankTeams(teams: Team[]): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const at = a.lastSubmissionAt?.toMillis() ?? Number.POSITIVE_INFINITY;
    const bt = b.lastSubmissionAt?.toMillis() ?? Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return a.name.localeCompare(b.name);
  });

  const out: RankedTeam[] = [];
  let rank = 0;
  let lastPoints: number | null = null;
  let lastTime: number | null = null;

  sorted.forEach((team, index) => {
    const time = team.lastSubmissionAt?.toMillis() ?? Number.POSITIVE_INFINITY;
    const samePosition = team.points === lastPoints && time === lastTime;
    if (!samePosition) rank = index + 1;
    out.push({ team, rank, tied: false });
    lastPoints = team.points;
    lastTime = time;
  });

  // Mark ties after the fact so every member of a tied group is flagged.
  const counts = new Map<number, number>();
  for (const row of out) counts.set(row.rank, (counts.get(row.rank) ?? 0) + 1);
  for (const row of out) row.tied = (counts.get(row.rank) ?? 0) > 1;

  return out;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
