import { cookies } from "next/headers";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";

export const SESSION_COOKIE = "isra_session";
/** 5 days, the longest Firebase will mint a session cookie for. */
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export interface SessionUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  isAnonymous: boolean;
}

/**
 * Resolves the signed-in user from the session cookie.
 * Returns null instead of throwing so layouts can redirect cleanly.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isAdminConfigured()) return null;
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
      isAnonymous: decoded.firebase?.sign_in_provider === "anonymous",
    };
  } catch {
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
