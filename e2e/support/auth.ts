/**
 * Mints real Firebase ID tokens from the Auth emulator so the E2E suite can
 * call route handlers exactly as a signed-in browser would — the handlers
 * accept `Authorization: Bearer <id token>` alongside the session cookie.
 */
const AUTH_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-api-key";
const BASE = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;

async function call(path: string, body: unknown) {
  const response = await fetch(`${BASE}/${path}?key=${API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `${path} failed: ${payload?.error?.message ?? response.status}`,
    );
  }
  return payload as { idToken: string; localId: string };
}

export async function signUp(email: string, password: string) {
  return call("accounts:signUp", { email, password, returnSecureToken: true });
}

export async function signIn(email: string, password: string) {
  return call("accounts:signInWithPassword", {
    email,
    password,
    returnSecureToken: true,
  });
}

export async function signUpGuest(displayName: string) {
  const session = await call("accounts:signUp", { returnSecureToken: true });
  await call("accounts:update", {
    idToken: session.idToken,
    displayName,
    returnSecureToken: true,
  });
  // Re-read so the token carries the name the handlers read off the claim.
  const refreshed = await call("accounts:update", {
    idToken: session.idToken,
    displayName,
    returnSecureToken: true,
  });
  return { ...session, idToken: refreshed.idToken ?? session.idToken };
}

/** A tiny typed fetch wrapper bound to one user's token. */
export function client(baseURL: string, idToken: string) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; data: T }> {
    const response = await fetch(`${baseURL}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${idToken}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data: data as T };
  }

  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
    patch: <T>(p: string, b: unknown) => request<T>("PATCH", p, b),
    del: <T>(p: string, b?: unknown) => request<T>("DELETE", p, b),
  };
}
