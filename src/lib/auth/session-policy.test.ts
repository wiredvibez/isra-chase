import { describe, expect, it } from "vitest";
import { canMintSession, RECENT_SIGN_IN_WINDOW_SEC } from "./session-policy";

const NOW = 1_700_000_000_000;
const secondsAgo = (n: number) => NOW / 1000 - n;

describe("canMintSession", () => {
  it("allows a fresh sign-in with no existing session", () => {
    const d = canMintSession({
      authTimeSec: secondsAgo(10),
      uid: "u1",
      existingSessionUid: null,
      nowMs: NOW,
    });
    expect(d).toEqual({ allow: true, reason: "recent_sign_in" });
  });

  it("allows right up to the edge of the window", () => {
    const d = canMintSession({
      authTimeSec: secondsAgo(RECENT_SIGN_IN_WINDOW_SEC),
      uid: "u1",
      existingSessionUid: null,
      nowMs: NOW,
    });
    expect(d.allow).toBe(true);
  });

  /**
   * The regression this file exists for: onIdTokenChanged fires on every
   * hourly refresh carrying the ORIGINAL auth_time, so a recency-only rule
   * rejected every refresh and the cookie stopped being renewed.
   */
  it("allows an hourly refresh for a caller already holding a session", () => {
    const d = canMintSession({
      authTimeSec: secondsAgo(3 * 60 * 60),
      uid: "u1",
      existingSessionUid: "u1",
      nowMs: NOW,
    });
    expect(d).toEqual({ allow: true, reason: "refresh" });
  });

  it("allows a refresh even days after the original sign-in", () => {
    const d = canMintSession({
      authTimeSec: secondsAgo(4 * 24 * 60 * 60),
      uid: "u1",
      existingSessionUid: "u1",
      nowMs: NOW,
    });
    expect(d.allow).toBe(true);
  });

  it("rejects a stale token from someone with no session", () => {
    const d = canMintSession({
      authTimeSec: secondsAgo(RECENT_SIGN_IN_WINDOW_SEC + 1),
      uid: "u1",
      existingSessionUid: null,
      nowMs: NOW,
    });
    expect(d).toEqual({ allow: false, reason: "stale_without_session" });
  });

  it("rejects a token presented alongside another account's cookie", () => {
    const d = canMintSession({
      authTimeSec: secondsAgo(3 * 60 * 60),
      uid: "attacker",
      existingSessionUid: "victim",
      nowMs: NOW,
    });
    expect(d).toEqual({ allow: false, reason: "session_uid_mismatch" });
  });

  it("still lets a fresh sign-in replace a different account's session", () => {
    // Signing in as someone else on a shared device must work.
    const d = canMintSession({
      authTimeSec: secondsAgo(5),
      uid: "second-user",
      existingSessionUid: "first-user",
      nowMs: NOW,
    });
    expect(d).toEqual({ allow: true, reason: "recent_sign_in" });
  });
});
