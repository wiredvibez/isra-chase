"use client";

import * as React from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";

export interface AuthState {
  user: User | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGuest: (displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

async function postSession(idToken: string) {
  return fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
}

/** Mirror the Firebase ID token into an httpOnly cookie for server routes. */
async function syncSession(user: User | null) {
  try {
    if (!user) {
      await fetch("/api/auth/session", { method: "DELETE" });
      return;
    }

    let response = await postSession(await user.getIdToken());

    // A 401 here means the server would not mint a cookie from the cached
    // token — usually because the session expired, so the refresh path no
    // longer applies. One forced token refresh is worth trying before we
    // give up and leave server-rendered pages unauthenticated.
    if (response.status === 401) {
      response = await postSession(await user.getIdToken(true));
    }

    if (!response.ok && process.env.NODE_ENV !== "production") {
      const body = await response.json().catch(() => null);
      console.warn(
        `[auth] session sync failed (${response.status})`,
        body?.code ?? body?.error ?? "",
      );
    }
  } catch {
    // Beyond that, a failed sync only costs server-side rendering of private
    // data; the client SDK remains authenticated either way.
  }
}

/** Create the user profile document on first sign-in. */
async function ensureUserDoc(user: User) {
  const ref = doc(getDb(), "users", user.uid);
  const snap = await getDoc(ref);
  const base = {
    displayName: user.displayName ?? "Player",
    email: user.email ?? null,
    photoURL: user.photoURL ?? null,
    isAnonymous: user.isAnonymous,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) {
    await setDoc(ref, { ...base, createdAt: serverTimestamp() });
  } else {
    await setDoc(ref, base, { merge: true });
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onIdTokenChanged(getFirebaseAuth(), async (next) => {
      setUser(next);
      setLoading(false);
      await syncSession(next);
      if (next) await ensureUserDoc(next).catch(() => {});
    });
    return unsub;
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signInEmail(email, password) {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      },
      async signUpEmail(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password,
        );
        await updateProfile(cred.user, { displayName });
        await ensureUserDoc(cred.user);
        await syncSession(cred.user);
      },
      async signInGoogle() {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await signInWithPopup(getFirebaseAuth(), provider);
      },
      async signInGuest(displayName) {
        const cred = await signInAnonymously(getFirebaseAuth());
        await updateProfile(cred.user, { displayName });
        await ensureUserDoc(cred.user);
        await syncSession(cred.user);
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(getFirebaseAuth(), email);
      },
      async signOut() {
        await fbSignOut(getFirebaseAuth());
        await fetch("/api/auth/session", { method: "DELETE" });
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
