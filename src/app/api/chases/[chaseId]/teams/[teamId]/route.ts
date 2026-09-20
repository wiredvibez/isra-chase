import { FieldValue } from "firebase-admin/firestore";
import { updateTeamSchema } from "@/lib/domain/schemas";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import {
  adjustmentsRef,
  deleteRefs,
  participantsRef,
  submissionsRef,
  teamsRef,
} from "@/lib/server/collections";
import { purgeSubmissions } from "@/lib/server/purge";
import { chaseRef } from "@/lib/server/scoring";
import { loadSecrets, setTeamPasscode } from "@/lib/server/secrets";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; teamId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, teamId } = await params;
    await requireOrganizer(chaseId, request);
    const { passcode, ...input } = updateTeamSchema.parse(await readJson(request));

    const ref = teamsRef(chaseId).doc(teamId);
    if (!(await ref.get()).exists) throw notFound("That team doesn't exist.");

    if (passcode !== undefined) await setTeamPasscode(chaseId, teamId, passcode);
    await ref.update({
      ...input,
      ...(input.mode === "solo" ? { maxMembers: 1 } : {}),
      ...(passcode !== undefined ? { hasPasscode: Boolean(passcode) } : {}),
    });

    const snap = await ref.get();
    const secrets = await loadSecrets(chaseId);
    return {
      team: {
        id: snap.id,
        ...snap.data(),
        // Organizer-only response, so the live passcode can travel with it.
        passcode: secrets.teamPasscodes[teamId] ?? null,
      },
    };
  });
}

/** Removes the team, its members, its submissions, its points and its history. */
export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, teamId } = await params;
    await requireOrganizer(chaseId, request);

    const ref = teamsRef(chaseId).doc(teamId);
    if (!(await ref.get()).exists) throw notFound("That team doesn't exist.");

    const [submissions, members, adjustments] = await Promise.all([
      submissionsRef(chaseId).where("teamId", "==", teamId).get(),
      participantsRef(chaseId).where("teamId", "==", teamId).get(),
      adjustmentsRef(chaseId).where("teamId", "==", teamId).get(),
    ]);

    // The team document is about to vanish, so there is nothing to recompute.
    await purgeSubmissions(chaseId, submissions.docs, { recompute: false });
    await deleteRefs([
      ...members.docs.map((doc) => doc.ref),
      ...adjustments.docs.map((doc) => doc.ref),
    ]);
    await ref.delete();
    await setTeamPasscode(chaseId, teamId, null);

    await chaseRef(chaseId).update({
      "stats.teamCount": FieldValue.increment(-1),
      "stats.participantCount": FieldValue.increment(-members.size),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  });
}
