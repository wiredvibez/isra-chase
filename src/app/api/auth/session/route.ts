import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";
import { canMintSession } from "@/lib/auth/session-policy";

export const runtime = "nodejs";

/** Exchange a Firebase ID token for an httpOnly session cookie. */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Server is missing FIREBASE_SERVICE_ACCOUNT_KEY." },
      { status: 500 },
    );
  }
  const { idToken } = await request.json().catch(() => ({ idToken: null }));
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "חסר idToken." }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    // A token refresh carries the ORIGINAL auth_time, so recency alone cannot
    // decide this — see lib/auth/session-policy.ts.
    const existing = (await cookies()).get(SESSION_COOKIE)?.value;
    let existingSessionUid: string | null = null;
    if (existing) {
      try {
        existingSessionUid = (await adminAuth().verifySessionCookie(existing, true)).uid;
      } catch {
        existingSessionUid = null;
      }
    }

    const decision = canMintSession({
      authTimeSec: decoded.auth_time,
      uid: decoded.uid,
      existingSessionUid,
    });
    if (!decision.allow) {
      return NextResponse.json(
        { error: "צריך להתחבר מחדש.", code: decision.reason },
        { status: 401 },
      );
    }
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "טוקן לא תקין." }, { status: 401 });
  }
}

/** Sign out: clear the cookie and revoke refresh tokens. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
