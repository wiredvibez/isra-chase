import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { bonusSchema } from "@/lib/domain/schemas";
import type { Adjustment, Submission } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import { adjustmentsRef } from "@/lib/server/collections";
import { writeNotification } from "@/lib/server/notifications";
import { applyBonusPoints, submissionRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; id: string }> };

/**
 * Bonus points on a submission. Negative values are legal — this is also the
 * penalty mechanism — and every entry is kept as the team's audit trail.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    const { caller } = await requireOrganizer(chaseId, request);
    const input = bonusSchema.parse(await readJson(request));

    const ref = adjustmentsRef(chaseId).doc();
    let teamId!: string;
    let missionName = "";

    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(submissionRef(chaseId, id));
      if (!snap.exists) throw notFound("That submission doesn't exist.");
      const submission = { id: snap.id, ...snap.data() } as Submission;
      teamId = submission.teamId;
      missionName = submission.missionName;

      const adjustment: Omit<Adjustment, "id"> = {
        chaseId,
        teamId,
        submissionId: id,
        points: input.points,
        reason: input.reason,
        byUid: caller.uid,
        byName: caller.name,
        createdAt: Timestamp.now(),
        editedAt: null,
      };
      tx.set(ref, adjustment);
      tx.update(snap.ref, { bonusPoints: FieldValue.increment(input.points) });
      applyBonusPoints(tx, chaseId, teamId, input.points);
    });

    await writeNotification(chaseId, {
      teamId,
      type: "bonus",
      title: input.points > 0 ? "Bonus points!" : "Points deducted",
      body: `${input.points > 0 ? "+" : ""}${input.points} on "${missionName}"${
        input.reason ? ` — ${input.reason}` : ""
      }`,
    });

    const snap = await ref.get();
    return { adjustment: { id: snap.id, ...snap.data() } };
  });
}
