import { describe, expect, it } from "vitest";
import { missionAvailability, orderMissions, type TeamProgress } from "./availability";
import type { Chase, Mission, Stamp } from "./types";

const at = (ms: number): Stamp => ({
  toMillis: () => ms,
  toDate: () => new Date(ms),
});

const T0 = 1_000_000_000_000;
const HOUR = 3_600_000;

const chase = (over: Partial<Pick<Chase, "startAt" | "endAt" | "status">> = {}) => ({
  startAt: at(T0),
  endAt: at(T0 + 24 * HOUR),
  status: "live" as const,
  ...over,
});

const mission = (over: Partial<Mission> = {}): Mission =>
  ({
    id: "m1",
    chaseId: "c1",
    name: "Mission",
    description: "",
    points: 100,
    type: "camera",
    imageUrl: null,
    linkUrl: null,
    feedVisibility: "shown",
    isDraft: false,
    order: 0,
    camera: { accepts: "both", sources: "live_and_library", maxVideoSeconds: 30 },
    text: null,
    gps: null,
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
    createdAt: at(T0),
    updatedAt: at(T0),
    ...over,
  }) as Mission;

const noProgress: TeamProgress = { points: 0, completed: {} };

describe("missionAvailability", () => {
  it("hides drafts", () => {
    const v = missionAvailability(mission({ isDraft: true }), chase(), noProgress, T0 + HOUR);
    expect(v.state).toBe("draft");
  });

  it("is available during the chase by default", () => {
    const v = missionAvailability(mission(), chase(), noProgress, T0 + HOUR);
    expect(v.state).toBe("available");
  });

  it("locks a mission released later", () => {
    const m = mission({
      release: { kind: "relative", anchor: "start", offsetMs: 3 * HOUR },
    });
    expect(missionAvailability(m, chase(), noProgress, T0 + HOUR).state).toBe("locked");
    expect(missionAvailability(m, chase(), noProgress, T0 + 4 * HOUR).state).toBe("available");
  });

  it("expires a mission after its expiry", () => {
    const m = mission({
      expiry: { kind: "relative", anchor: "start", offsetMs: 2 * HOUR },
    });
    expect(missionAvailability(m, chase(), noProgress, T0 + 3 * HOUR).state).toBe("expired");
  });

  it("keeps an expired mission available once completed", () => {
    const m = mission({
      expiry: { kind: "relative", anchor: "start", offsetMs: 2 * HOUR },
    });
    const done: TeamProgress = { points: 0, completed: { m1: { correct: true } } };
    expect(missionAvailability(m, chase(), done, T0 + 3 * HOUR).state).toBe("available");
  });

  it("locks behind another mission until that one is completed", () => {
    const m = mission({
      id: "m2",
      release: { kind: "mission", missionId: "m1", requireCorrect: false },
    });
    expect(missionAvailability(m, chase(), noProgress, T0 + HOUR).state).toBe("locked");
    const done: TeamProgress = { points: 0, completed: { m1: { correct: false } } };
    expect(missionAvailability(m, chase(), done, T0 + HOUR).state).toBe("available");
  });

  it("requires a correct trigger answer when asked to", () => {
    const m = mission({
      id: "m2",
      release: { kind: "mission", missionId: "m1", requireCorrect: true },
    });
    const wrong: TeamProgress = { points: 0, completed: { m1: { correct: false } } };
    const right: TeamProgress = { points: 0, completed: { m1: { correct: true } } };
    expect(missionAvailability(m, chase(), wrong, T0 + HOUR).state).toBe("locked");
    expect(missionAvailability(m, chase(), right, T0 + HOUR).state).toBe("available");
  });

  it("unlocks at a point threshold and re-locks if points drop", () => {
    const m = mission({ release: { kind: "points", points: 500 } });
    expect(missionAvailability(m, chase(), { points: 300, completed: {} }, T0).state).toBe("locked");
    expect(missionAvailability(m, chase(), { points: 500, completed: {} }, T0).state).toBe("available");
    // Dropping back below hides it again — unless already completed.
    expect(missionAvailability(m, chase(), { points: 400, completed: {} }, T0).state).toBe("locked");
    expect(
      missionAvailability(m, chase(), { points: 400, completed: { m1: { correct: true } } }, T0).state,
    ).toBe("available");
  });

  it("locks everything while the chase is still a draft", () => {
    const m = mission({ release: { kind: "mission", missionId: "x", requireCorrect: false } });
    expect(missionAvailability(m, chase({ status: "draft" }), noProgress, T0).state).toBe("locked");
  });
});

describe("orderMissions", () => {
  const list = [
    mission({ id: "a", name: "Charlie", points: 300, order: 2 }),
    mission({ id: "b", name: "Alpha", points: 100, order: 1 }),
    mission({ id: "c", name: "Bravo", points: 200, order: 0 }),
  ];

  it("orders by points ascending", () => {
    expect(orderMissions(list, "points", "s").map((m) => m.name)).toEqual([
      "Alpha", "Bravo", "Charlie",
    ]);
  });

  it("orders alphabetically", () => {
    expect(orderMissions(list, "alphabetical", "s").map((m) => m.name)).toEqual([
      "Alpha", "Bravo", "Charlie",
    ]);
  });

  it("honours the custom drag order", () => {
    expect(orderMissions(list, "custom", "s").map((m) => m.name)).toEqual([
      "Bravo", "Alpha", "Charlie",
    ]);
  });

  it("randomises stably per seed", () => {
    const a = orderMissions(list, "random", "team-1").map((m) => m.id);
    const b = orderMissions(list, "random", "team-1").map((m) => m.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect([...a].sort()).toEqual(["a", "b", "c"]);
  });
});
