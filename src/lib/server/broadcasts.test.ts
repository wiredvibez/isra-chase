import { describe, expect, it } from "vitest";
import { broadcastDueAt } from "./notifications";
import type { Chase } from "@/lib/domain/types";

const stamp = (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) });
const chase = { startAt: stamp(1_000), endAt: stamp(5_000) } as unknown as Chase;
const unscheduled = { startAt: null, endAt: null } as unknown as Chase;

describe("broadcastDueAt", () => {
  it("resolves every schedule kind against the chase clock", () => {
    expect(broadcastDueAt({ kind: "now" }, chase)).toBe(0);
    expect(broadcastDueAt({ kind: "before_start", offsetMs: 400 }, chase)).toBe(600);
    expect(broadcastDueAt({ kind: "at_start" }, chase)).toBe(1_000);
    expect(
      broadcastDueAt({ kind: "during_relative", anchor: "end", offsetMs: -500 }, chase),
    ).toBe(4_500);
    expect(broadcastDueAt({ kind: "during_specific", at: stamp(2_222) }, chase)).toBe(2_222);
    expect(broadcastDueAt({ kind: "at_end" }, chase)).toBe(5_000);
    expect(broadcastDueAt({ kind: "after_end", offsetMs: 100 }, chase)).toBe(5_100);
  });

  it("stays unresolved while the chase has no times, except for 'now'", () => {
    expect(broadcastDueAt({ kind: "at_start" }, unscheduled)).toBeNull();
    expect(broadcastDueAt({ kind: "at_end" }, unscheduled)).toBeNull();
    expect(broadcastDueAt({ kind: "now" }, unscheduled)).toBe(0);
  });
});
