import { cookies } from "next/headers";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { ApiError, forbidden, notFound, unauthorized } from "./http";
import type { Chase, Participant } from "@/lib/domain/types";

export interface Caller {
  uid: string;
  email: string | null;
  name: string;
}

/** Resolve the caller from the session cookie, or from a bearer ID token. */
export async function getCaller(request?: Request): Promise<Caller | null> {
  if (!isAdminConfigured()) {
    throw new ApiError(
      500,
      "Server is missing FIREBASE_SERVICE_ACCOUNT_KEY.",
      "not_configured",
    );
  }

  const bearer = request?.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    try {
      const decoded = await adminAuth().verifyIdToken(bearer.slice(7), true);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        name: (decoded.name as string | undefined) ?? "Player",
      };
    } catch {
      return null;
    }
  }

  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? "Player",
    };
  } catch {
    return null;
  }
}

export async function requireCaller(request?: Request): Promise<Caller> {
  const caller = await getCaller(request);
  if (!caller) throw unauthorized();
  return caller;
}

export async function loadChase(chaseId: string): Promise<Chase> {
  const snap = await adminDb().collection("chases").doc(chaseId).get();
  if (!snap.exists) throw notFound("המרדף הזה לא קיים.");
  return { id: snap.id, ...snap.data() } as Chase;
}

export function isOrganizerOf(chase: Chase, uid: string): boolean {
  return chase.ownerUid === uid || Boolean(chase.collaborators?.[uid]);
}

/** Owner or collaborator. Collaborators can do everything but delete. */
export async function requireOrganizer(
  chaseId: string,
  request?: Request,
): Promise<{ caller: Caller; chase: Chase }> {
  const caller = await requireCaller(request);
  const chase = await loadChase(chaseId);
  if (!isOrganizerOf(chase, caller.uid)) {
    throw forbidden("רק המארגנים של המרדף יכולים לעשות את זה.");
  }
  return { caller, chase };
}

/** Strictly the owner — used for deleting a chase. */
export async function requireOwner(
  chaseId: string,
  request?: Request,
): Promise<{ caller: Caller; chase: Chase }> {
  const caller = await requireCaller(request);
  const chase = await loadChase(chaseId);
  if (chase.ownerUid !== caller.uid) {
    throw forbidden("רק מי שיצר את המרדף יכול לעשות את זה.");
  }
  return { caller, chase };
}

export async function loadParticipant(
  chaseId: string,
  uid: string,
): Promise<Participant | null> {
  const snap = await adminDb()
    .collection("chases")
    .doc(chaseId)
    .collection("participants")
    .doc(uid)
    .get();
  return snap.exists ? ({ uid: snap.id, ...snap.data() } as Participant) : null;
}

export async function requireParticipant(
  chaseId: string,
  request?: Request,
): Promise<{ caller: Caller; chase: Chase; participant: Participant }> {
  const caller = await requireCaller(request);
  const chase = await loadChase(chaseId);
  const participant = await loadParticipant(chaseId, caller.uid);
  if (!participant) throw forbidden("עוד לא הצטרפתם למרדף הזה.");
  return { caller, chase, participant };
}

/** Either role — for endpoints both sides can read. */
export async function requireMember(
  chaseId: string,
  request?: Request,
): Promise<{
  caller: Caller;
  chase: Chase;
  participant: Participant | null;
  organizer: boolean;
}> {
  const caller = await requireCaller(request);
  const chase = await loadChase(chaseId);
  const organizer = isOrganizerOf(chase, caller.uid);
  const participant = await loadParticipant(chaseId, caller.uid);
  if (!organizer && !participant) {
    throw forbidden("עוד לא הצטרפתם למרדף הזה.");
  }
  return { caller, chase, participant, organizer };
}
