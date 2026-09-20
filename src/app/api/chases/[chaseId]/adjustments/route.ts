import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { adjustmentSchema } from "@/lib/domain/schemas";
import type { Adjustment } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import { adjustmentsRef } from "@/lib/server/collections";
import { writeNotification } from "@/lib/server/notifications";
import { applyBonusPoints, teamRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/**
 * A standalone score adjustment. Unlike a submission bonus the reason is
 * mandatory (see `adjustmentSchema`): a team's points moving with no visible
 * cause is the fastest way to lose an event's trust.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { caller } = await requireOrganizer(chaseId, request);
    const input = adjustmentSchema.parse(await readJson(request));

    const ref = adjustmentsRef(chaseId).doc();

    await adminDb().runTransaction(async (tx) => {
      const team = await tx.get(teamRef(chaseId, input.teamId));
      if (!team.exists) throw notFound("That team doesn't exist.");

      const adjustment: Omit<Adjustment, "id"> = {
        chaseId,
        teamId: input.teamId,
        submissionId: null,
        points: input.points,
        reason: input.reason,
        byUid: caller.uid,
        byName: caller.name,
        createdAt: Timestamp.now(),
        editedAt: null,
      };
      tx.set(ref, adjustment);
      applyBonusPoints(tx, chaseId, input.teamId, input.points);
    });

    await writeNotification(chaseId, {
      teamId: input.teamId,
      type: "adjustment",
      title: input.points > 0 ? "נוספו נקודות" : "ירדו נקודות",
      body: `${Math.abs(input.points)} נקודות ${
        input.points > 0 ? "נוספו" : "ירדו"
      } — ${input.reason}`,
    });

    const snap = await ref.get();
    return { adjustment: { id: snap.id, ...snap.data() } };
  });
}
