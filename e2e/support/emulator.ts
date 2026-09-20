/**
 * Emulator helpers for the E2E suite.
 *
 * The Admin SDK talks to the emulators purely through the *_EMULATOR_HOST
 * environment variables, so no credentials are needed — which is exactly why
 * this suite runs without billing, a live project, or a service-account key.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "isra-chase";

export function admin() {
  if (!getApps().length) {
    initializeApp({
      projectId: PROJECT,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
  return { db: getFirestore(), auth: getAuth() };
}

const SUBCOLLECTIONS = [
  "missions",
  "teams",
  "participants",
  "submissions",
  "adjustments",
  "broadcasts",
  "notifications",
  "reports",
  "private",
];

/** Remove every document the suite creates, so each run starts clean. */
export async function wipe() {
  const { db } = admin();
  for (const top of ["chases", "joinCodes", "users", "templates"]) {
    const snap = await db.collection(top).get();
    for (const docSnap of snap.docs) {
      // Delete subcollections first; deleting a parent leaves them orphaned.
      for (const sub of SUBCOLLECTIONS) {
        const kids = await docSnap.ref.collection(sub).get();
        await Promise.all(kids.docs.map((k) => k.ref.delete()));
      }
      await docSnap.ref.delete();
    }
  }
}

export async function createUser(email: string, password: string, name: string) {
  const { auth } = admin();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.deleteUser(existing.uid);
  } catch {
    // No such user yet — the normal path on a clean run.
  }
  return auth.createUser({ email, password, displayName: name });
}

export const ts = (msFromNow: number) =>
  Timestamp.fromMillis(Date.now() + msFromNow);
