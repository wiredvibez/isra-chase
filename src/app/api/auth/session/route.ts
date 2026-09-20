import { NextResponse } from "next/server";
import { adminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth/session";

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
    return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
  }

  try {
    // Reject stale tokens: the client must have authenticated in the last 5 min.
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json(
        { error: "Recent sign-in required." },
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
    return NextResponse.json({ error: "Invalid ID token." }, { status: 401 });
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
