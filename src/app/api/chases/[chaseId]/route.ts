import { FieldValue } from "firebase-admin/firestore";
import { updateChaseSchema } from "@/lib/domain/schemas";
import { loadChase, requireMember, requireOrganizer, requireOwner } from "@/lib/server/guards";
import { handler, readJson } from "@/lib/server/http";
import {
  adjustmentsRef,
  broadcastsRef,
  deleteQuery,
  deleteStoragePrefix,
  joinCodeRef,
  missionsRef,
  participantsRef,
  reportsRef,
  submissionsRef,
  teamsRef,
} from "@/lib/server/collections";
import { chaseRef } from "@/lib/server/scoring";
import { loadSecrets, setChasePassword } from "@/lib/server/secrets";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

export async function GET(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase, organizer } = await requireMember(chaseId, request);
    if (!organizer) return { chase, organizer };
    // Organizers are the only readers allowed to see the join password.
    const secrets = await loadSecrets(chaseId);
    return { chase: { ...chase, password: secrets.password }, organizer };
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    await requireOrganizer(chaseId, request);
    const { password, ...input } = updateChaseSchema.parse(await readJson(request));

    if (password !== undefined) await setChasePassword(chaseId, password);

    await chaseRef(chaseId).update({
      ...input,
      ...(password !== undefined ? { hasPassword: Boolean(password) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const chase = await loadChase(chaseId);
    const secrets = await loadSecrets(chaseId);
    return { chase: { ...chase, password: secrets.password } };
  });
}

/** Owner-only. Removes every trace, including uploaded media. */
export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase } = await requireOwner(chaseId, request);

    // Likes are nested under submissions, so they have to go first.
    const submissions = await submissionsRef(chaseId).get();
    await Promise.all(
      submissions.docs.map((doc) => deleteQuery(doc.ref.collection("likes"))),
    );

    await Promise.all([
      deleteQuery(missionsRef(chaseId)),
      deleteQuery(teamsRef(chaseId)),
      deleteQuery(participantsRef(chaseId)),
      deleteQuery(submissionsRef(chaseId)),
      deleteQuery(adjustmentsRef(chaseId)),
      deleteQuery(broadcastsRef(chaseId)),
      deleteQuery(reportsRef(chaseId)),
      deleteQuery(chaseRef(chaseId).collection("notifications")),
      deleteQuery(chaseRef(chaseId).collection("private")),
    ]);

    await Promise.all([
      joinCodeRef(chase.joinCode).delete(),
      deleteStoragePrefix(`chases/${chaseId}/`),
    ]);
    await chaseRef(chaseId).delete();

    return { ok: true };
  });
}
