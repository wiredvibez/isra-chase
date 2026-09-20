import { describe, expect, it } from "vitest";
import { ordinal, rankTeams } from "./leaderboard";
import type { Stamp, Team } from "./types";

const at = (ms: number): Stamp => ({
  toMillis: () => ms,
  toDate: () => new Date(ms),
});

const team = (name: string, points: number, lastMs: number | null): Team =>
  ({
    id: name,
    chaseId: "c",
    name,
    photoUrl: null,
    passcode: null,
    mode: "team",
    maxMembers: null,
    memberCount: 1,
    createdBy: "participant",
    basePoints: points,
    bonusPoints: 0,
    points,
    submissionCount: 0,
    lastSubmissionAt: lastMs === null ? null : at(lastMs),
    createdAt: at(0),
  }) as Team;

describe("rankTeams", () => {
  it("ranks by points descending", () => {
    const r = rankTeams([team("a", 100, 1), team("b", 300, 2), team("c", 200, 3)]);
    expect(r.map((x) => x.team.name)).toEqual(["b", "c", "a"]);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3]);
  });

  it("breaks ties by who reached the total first", () => {
    const r = rankTeams([team("late", 200, 5000), team("early", 200, 1000)]);
    expect(r.map((x) => x.team.name)).toEqual(["early", "late"]);
    expect(r.map((x) => x.rank)).toEqual([1, 2]);
  });

  it("uses Olympic numbering for genuine ties", () => {
    // Three teams tied on points AND time share 2nd; the next team is 5th.
    const r = rankTeams([
      team("leader", 500, 100),
      team("t1", 200, 900),
      team("t2", 200, 900),
      team("t3", 200, 900),
      team("last", 100, 950),
    ]);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 2, 2, 5]);
    expect(r.filter((x) => x.tied).map((x) => x.team.name).sort()).toEqual([
      "t1", "t2", "t3",
    ]);
  });

  it("puts teams with no submissions last", () => {
    const r = rankTeams([team("none", 0, null), team("some", 0, 10)]);
    expect(r.map((x) => x.team.name)).toEqual(["some", "none"]);
  });
});

describe("ordinal", () => {
  it("handles the teens and the usual suffixes", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st",
    ]);
  });
});
