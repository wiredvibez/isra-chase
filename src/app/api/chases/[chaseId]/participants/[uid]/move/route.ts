import { FieldValue } from "firebase-admin/firestore";
import { moveParticipantSchema } from "@/lib/domain/schemas";
import type { Submission, Team } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { badRequest, handler, notFound, readJson } from "@/lib/server/http";
import { participantsRef, submissionsRef, teamsRef } from "@/lib/server/collections";
import { teamCapacity } from "@/lib/server/projections";
import { recomputeTeamTotals } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; uid: string }> };

/**
 * Move someone between teams — the one thing Goosechase explicitly cannot do.
 *
 * Their submissions travel with them, except where the destination team has
 * already submitted that mission: those stay behind rather than break the
 * one-submission-per-mission-per-team rule.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, uid } = await params;
    const { chase } = await requireOrganizer(chaseId, request);
    const { teamId } = moveParticipantSchema.parse(await readJson(request));

    const participantDoc = participantsRef(chaseId).doc(uid);
    const [participantSnap, targetSnap] = await Promise.all([
      participantDoc.get(),
      teamsRef(chaseId).doc(teamId).get(),
    ]);
    if (!participantSnap.exists) throw notFound("They aren't in this chase.");
    if (!targetSnap.exists) throw notFound("That team doesn't exist.");

    const fromTeamId = participantSnap.data()?.teamId as string;
    if (fromTeamId === teamId) return { participant: { uid, ...participantSnap.data() } };

    const target = { id: targetSnap.id, ...targetSnap.data() } as Team;
    const capacity = teamCapacity(target, chase);
    if (capacity !== null && target.memberCount >= capacity) {
      throw badRequest(`"${target.name}" is full.`);
    }

    const [mine, targetSubmissions] = await Promise.all([
      submissionsRef(chaseId).where("participantUid", "==", uid).get(),
      submissionsRef(chaseId).where("teamId", "==", teamId).get(),
    ]);
    const taken = new Set(
      targetSubmissions.docs.map((doc) => doc.data().missionId as string),
    );

    const batch = participantDoc.firestore.batch();
    batch.update(participantDoc, { teamId });
    batch.update(teamsRef(chaseId).doc(fromTeamId), {
      memberCount: FieldValue.increment(-1),
    });
    batch.update(targetSnap.ref, { memberCount: FieldValue.increment(1) });

    for (const doc of mine.docs) {
      const submission = doc.data() as Submission;
      if (submission.teamId !== fromTeamId || taken.has(submission.missionId)) continue;
      batch.update(doc.ref, { teamId, teamName: target.name });
    }
    await batch.commit();

    // Both teams' totals and tie-break clocks have moved.
    await Promise.all([
      recomputeTeamTotals(chaseId, fromTeamId),
      recomputeTeamTotals(chaseId, teamId),
    ]);

    const snap = await participantDoc.get();
    return { participant: { uid: snap.id, ...snap.data() } };
  });
}
