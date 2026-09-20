/**
 * Whether a caller may mint a session cookie from an ID token.
 *
 * Firebase's guidance is to require a recent sign-in before issuing a
 * long-lived session cookie, which is right — but only for *establishing* one.
 * The client re-syncs on every `onIdTokenChanged`, and that fires on each
 * hourly token refresh and on every page load, by which time `auth_time` is
 * the original sign-in and may be days old. Gating those on the same window
 * rejects every refresh, so the cookie quietly stops being renewed while the
 * client still believes it is signed in.
 *
 * So: a fresh sign-in passes on recency; anything later passes only by already
 * holding a valid session for the same uid.
 */
export const RECENT_SIGN_IN_WINDOW_SEC = 5 * 60;

export interface SessionMintInput {
  /** `auth_time` from the verified ID token, in seconds. */
  authTimeSec: number;
  /** uid from the verified ID token. */
  uid: string;
  /** uid from the caller's existing session cookie, if it verified. */
  existingSessionUid: string | null;
  nowMs?: number;
}

export type SessionMintDecision =
  | { allow: true; reason: "recent_sign_in" | "refresh" }
  | { allow: false; reason: "stale_without_session" | "session_uid_mismatch" };

export function canMintSession({
  authTimeSec,
  uid,
  existingSessionUid,
  nowMs = Date.now(),
}: SessionMintInput): SessionMintDecision {
  const ageSec = nowMs / 1000 - authTimeSec;
  if (ageSec <= RECENT_SIGN_IN_WINDOW_SEC) {
    return { allow: true, reason: "recent_sign_in" };
  }
  if (!existingSessionUid) {
    return { allow: false, reason: "stale_without_session" };
  }
  if (existingSessionUid !== uid) {
    // Someone is presenting one account's token alongside another's cookie.
    return { allow: false, reason: "session_uid_mismatch" };
  }
  return { allow: true, reason: "refresh" };
}
