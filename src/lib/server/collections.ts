import type { DocumentReference, Query } from "firebase-admin/firestore";
import { adminBucket, adminDb } from "@/lib/firebase/admin";
import { chaseRef } from "./scoring";

export const missionsRef = (chaseId: string) => chaseRef(chaseId).collection("missions");
export const teamsRef = (chaseId: string) => chaseRef(chaseId).collection("teams");
export const participantsRef = (chaseId: string) =>
  chaseRef(chaseId).collection("participants");
export const submissionsRef = (chaseId: string) =>
  chaseRef(chaseId).collection("submissions");
export const adjustmentsRef = (chaseId: string) =>
  chaseRef(chaseId).collection("adjustments");
export const broadcastsRef = (chaseId: string) =>
  chaseRef(chaseId).collection("broadcasts");
export const reportsRef = (chaseId: string) => chaseRef(chaseId).collection("reports");

/* -------------------------------------------------------------- join codes */

/** No I, O, 0 or 1: these codes get read aloud and typed on phones. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export const joinCodeRef = (code: string) =>
  adminDb().collection("joinCodes").doc(code.trim().toUpperCase());

/**
 * Reserve a code for a chase. `create` fails if the document already exists,
 * which is what makes the uniqueness check atomic rather than a read-then-write
 * race between two organizers clicking "create" at the same moment.
 */
export async function claimJoinCode(chaseId: string, attempts = 8): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    // Widen the code after repeated collisions rather than looping forever.
    const code = generateJoinCode(i < 5 ? 6 : 7);
    try {
      await joinCodeRef(code).create({ chaseId, createdAt: new Date() });
      return code;
    } catch {
      continue;
    }
  }
  throw new Error("Could not allocate a unique join code.");
}

/* ------------------------------------------------------------- bulk delete */

const BATCH_LIMIT = 400;

export async function deleteRefs(refs: DocumentReference[]) {
  const db = adminDb();
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
}

/** Delete everything a query matches, in pages, without loading it all twice. */
export async function deleteQuery(query: Query) {
  const snap = await query.get();
  await deleteRefs(snap.docs.map((doc) => doc.ref));
  return snap.size;
}

/** Best-effort Storage cleanup: an orphaned object must never fail a request. */
export async function deleteStorageObjects(paths: (string | null | undefined)[]) {
  const wanted = paths.filter((p): p is string => Boolean(p));
  if (!wanted.length) return;
  await Promise.all(
    wanted.map(async (path) => {
      try {
        await adminBucket().file(path).delete({ ignoreNotFound: true });
      } catch (error) {
        console.warn("[api] storage cleanup failed", path, error);
      }
    }),
  );
}

export async function deleteStoragePrefix(prefix: string) {
  try {
    await adminBucket().deleteFiles({ prefix, force: true });
  } catch (error) {
    console.warn("[api] storage prefix cleanup failed", prefix, error);
  }
}
