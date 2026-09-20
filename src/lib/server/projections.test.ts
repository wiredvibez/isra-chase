import { describe, expect, it } from "vitest";
import { playMissions, teamProgress } from "./projections";
import type { Chase, Mission, Submission, Team } from "@/lib/domain/types";

const stamp = (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) });

const chase = {
  id: "c1",
  status: "live",
  startAt: stamp(1_000),
  endAt: stamp(9_000_000),
  missionOrder: "custom",
} as unknown as Chase;

const team = { id: "t1", points: 0 } as Team;

function mission(overrides: Partial<Mission>): Mission {
  return {
    id: "m1",
    chaseId: "c1",
    name: "Find the tower",
    description: "Go there",
    points: 10,
    type: "text",
    imageUrl: null,
    linkUrl: null,
    feedVisibility: "shown",
    isDraft: false,
    order: 0,
    camera: null,
    text: { acceptedResponses: ["Eiffel Tower"], approximate: true },
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    createdAt: stamp(0),
    updatedAt: stamp(0),
    ...overrides,
  } as Mission;
}

describe("playMissions", () => {
  it("never leaks the answer key or the GPS pin", () => {
    const missions = [
      mission({}),
      mission({
        id: "m2",
        type: "gps",
        text: null,
        gps: { lat: 48.85, lng: 2.29, radiusM: 100, address: "Paris" },
      }),
    ];

    const projected = playMissions(missions, chase, team, [], 2_000);
    const serialised = JSON.stringify(projected);

    expect(projected).toHaveLength(2);
    expect(serialised).not.toContain("Eiffel Tower");
    expect(serialised).not.toContain("48.85");
    expect(serialised).not.toContain("2.29");
    expect(projected[0].text).toEqual({ badge: "approximate" });
    expect(projected[1].gps).toEqual({ radiusM: 100 });
  });

  it("omits drafts and locked missions entirely", () => {
    const missions = [
      mission({ id: "m1" }),
      mission({ id: "m2", isDraft: true }),
      mission({
        id: "m3",
        release: { kind: "mission", missionId: "m1", requireCorrect: true },
      }),
      mission({ id: "m4", release: { kind: "points", points: 50 } }),
    ];

    const ids = playMissions(missions, chase, team, [], 2_000).map((m) => m.id);
    expect(ids).toEqual(["m1"]);
  });

  it("unlocks a gated mission once its trigger is completed", () => {
    const missions = [
      mission({ id: "m1" }),
      mission({
        id: "m3",
        release: { kind: "mission", missionId: "m1", requireCorrect: true },
      }),
    ];
    const submissions = [
      { id: "s1", missionId: "m1", status: "approved", points: 10 } as Submission,
    ];

    const projected = playMissions(missions, chase, team, submissions, 2_000);
    expect(projected.map((m) => m.id)).toEqual(["m1", "m3"]);
    expect(projected[0].completed).toBe(true);
    expect(projected[0].submission).toEqual({ id: "s1", status: "approved", points: 10 });
  });

  it("treats a rejected attempt as occupying the slot but not completing it", () => {
    const submissions = [
      { id: "s1", missionId: "m1", status: "rejected", points: 0 } as Submission,
    ];
    const [projected] = playMissions([mission({})], chase, team, submissions, 2_000);

    expect(projected.completed).toBe(false);
    expect(projected.submission?.status).toBe("rejected");
    expect(teamProgress(submissions, 0).completed.m1).toEqual({ correct: false });
  });
});
