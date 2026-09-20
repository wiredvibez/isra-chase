import { FieldValue } from "firebase-admin/firestore";
import { missionInputSchema } from "@/lib/domain/schemas";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import { missionsRef, submissionsRef } from "@/lib/server/collections";
import {
  assertTriggerCanGrade,
  expiryFromInput,
  releaseFromInput,
} from "@/lib/server/missions";
import { purgeSubmissions } from "@/lib/server/purge";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; missionId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, missionId } = await params;
    await requireOrganizer(chaseId, request);
    const input = missionInputSchema.partial().parse(await readJson(request));
    if (input.release) await assertTriggerCanGrade(chaseId, input.release);

    const ref = missionsRef(chaseId).doc(missionId);
    const existing = await ref.get();
    if (!existing.exists) throw notFound("That mission doesn't exist.");

    const update: Record<string, unknown> = {
      ...input,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (input.release) update.release = releaseFromInput(input.release);
    if (input.expiry) update.expiry = expiryFromInput(input.expiry);

    await ref.update(update);

    // feedVisibility is denormalised onto every submission, because the
    // Firestore feed query has no way to join back to the mission.
    if (input.feedVisibility && input.feedVisibility !== existing.data()?.feedVisibility) {
      const affected = await submissionsRef(chaseId)
        .where("missionId", "==", missionId)
        .get();
      const batch = ref.firestore.batch();
      for (const doc of affected.docs) {
        batch.update(doc.ref, { feedVisible: input.feedVisibility === "shown" });
      }
      if (affected.size) await batch.commit();
    }

    const snap = await ref.get();
    return { mission: { id: snap.id, ...snap.data() } };
  });
}

/** Deleting a mission also deletes its submissions and reverses their points. */
export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, missionId } = await params;
    await requireOrganizer(chaseId, request);

    const ref = missionsRef(chaseId).doc(missionId);
    if (!(await ref.get()).exists) throw notFound("That mission doesn't exist.");

    const submissions = await submissionsRef(chaseId)
      .where("missionId", "==", missionId)
      .get();
    await purgeSubmissions(chaseId, submissions.docs);

    await ref.delete();
    await chaseRef(chaseId).update({
      "stats.missionCount": FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Anything gated on this mission would now be permanently locked.
    const dependents = await missionsRef(chaseId)
      .where("release.missionId", "==", missionId)
      .get();
    if (dependents.size) {
      const batch = ref.firestore.batch();
      for (const doc of dependents.docs) {
        batch.update(doc.ref, { release: { kind: "chase_start" } });
      }
      await batch.commit();
    }

    return { ok: true };
  });
}
