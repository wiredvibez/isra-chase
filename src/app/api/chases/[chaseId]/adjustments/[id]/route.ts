import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { updateAdjustmentSchema } from "@/lib/domain/schemas";
import type { Adjustment } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import { adjustmentsRef } from "@/lib/server/collections";
import { writeNotification } from "@/lib/server/notifications";
import { applyBonusPoints, submissionRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; id: string }> };

/** Editing applies the delta, so the team total never has to be rebuilt. */
export async function PATCH(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    await requireOrganizer(chaseId, request);
    const input = updateAdjustmentSchema.parse(await readJson(request));

    const ref = adjustmentsRef(chaseId).doc(id);

    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw notFound("That adjustment doesn't exist.");
      const adjustment = { id: snap.id, ...snap.data() } as Adjustment;

      const points = input.points ?? adjustment.points;
      const delta = points - adjustment.points;

      tx.update(ref, {
        ...(input.points !== undefined ? { points } : {}),
        ...(input.reason !== undefined ? { reason: input.reason } : {}),
        editedAt: Timestamp.now(),
      });

      if (delta) {
        applyBonusPoints(tx, chaseId, adjustment.teamId, delta);
        if (adjustment.submissionId) {
          tx.update(submissionRef(chaseId, adjustment.submissionId), {
            bonusPoints: FieldValue.increment(delta),
          });
        }
      }
    });

    const snap = await ref.get();
    return { adjustment: { id: snap.id, ...snap.data() } };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    await requireOrganizer(chaseId, request);

    const ref = adjustmentsRef(chaseId).doc(id);
    let removed!: Adjustment;

    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw notFound("That adjustment doesn't exist.");
      removed = { id: snap.id, ...snap.data() } as Adjustment;

      tx.delete(ref);
      applyBonusPoints(tx, chaseId, removed.teamId, -removed.points);
      if (removed.submissionId) {
        tx.update(submissionRef(chaseId, removed.submissionId), {
          bonusPoints: FieldValue.increment(-removed.points),
        });
      }
    });

    await writeNotification(chaseId, {
      teamId: removed.teamId,
      type: "adjustment",
      title: "עדכון ניקוד בוטל",
      body: `${Math.abs(removed.points)} נקודות ${
        removed.points > 0 ? "שנוספו" : "שירדו"
      } בוטלו על ידי המארגן.`,
    });

    return { ok: true };
  });
}
