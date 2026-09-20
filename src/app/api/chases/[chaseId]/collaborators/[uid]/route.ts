import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { loadChase, requireOrganizer } from "@/lib/server/guards";
import { badRequest, handler } from "@/lib/server/http";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; uid: string }> };

/** `uid` may also be the invited email, for invites never claimed. */
export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, uid } = await params;
    const { chase } = await requireOrganizer(chaseId, request);
    const key = decodeURIComponent(uid);

    if (key === chase.ownerUid) throw badRequest("The owner can't be removed.");

    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (key.includes("@")) {
      update.collaboratorEmails = FieldValue.arrayRemove(key.toLowerCase());
    } else {
      update[`collaborators.${key}`] = FieldValue.delete();
      // Drop the email too, or the next dashboard load would re-claim the uid.
      const user = await adminAuth().getUser(key).catch(() => null);
      if (user?.email) {
        update.collaboratorEmails = FieldValue.arrayRemove(user.email.toLowerCase());
      }
    }

    await chaseRef(chaseId).update(update);
    return { chase: await loadChase(chaseId) };
  });
}
