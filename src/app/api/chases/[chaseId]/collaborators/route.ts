import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { collaboratorSchema } from "@/lib/domain/schemas";
import { loadChase, requireOrganizer } from "@/lib/server/guards";
import { badRequest, handler, readJson } from "@/lib/server/http";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/**
 * Invite by email. The uid is only known once that person has an account, so
 * the email is the durable key and the uid is backfilled on their first visit
 * (see GET /api/chases) — the Firestore rules read the uid map.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase } = await requireOrganizer(chaseId, request);
    const { email } = collaboratorSchema.parse(await readJson(request));
    const normalized = email.trim().toLowerCase();

    if (chase.collaboratorEmails?.includes(normalized)) {
      throw badRequest("They're already a collaborator.");
    }

    // No account yet is fine: the invite stands on the email alone.
    const user = await adminAuth().getUserByEmail(normalized).catch(() => null);
    if (user?.uid === chase.ownerUid) throw badRequest("They already own this chase.");

    const update: Record<string, unknown> = {
      collaboratorEmails: FieldValue.arrayUnion(normalized),
      updatedAt: FieldValue.serverTimestamp(),
      ...(user ? { [`collaborators.${user.uid}`]: true } : {}),
    };

    await chaseRef(chaseId).update(update);
    return { chase: await loadChase(chaseId) };
  });
}
