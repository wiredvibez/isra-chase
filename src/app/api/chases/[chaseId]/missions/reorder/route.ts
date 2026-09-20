import { FieldValue } from "firebase-admin/firestore";
import { reorderMissionsSchema } from "@/lib/domain/schemas";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, readJson } from "@/lib/server/http";
import { missionsRef } from "@/lib/server/collections";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/** Writes the drag order. Ids not in the payload keep their current place. */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    await requireOrganizer(chaseId, request);
    const { order } = reorderMissionsSchema.parse(await readJson(request));

    const batch = missionsRef(chaseId).firestore.batch();
    order.forEach((missionId, index) => {
      batch.update(missionsRef(chaseId).doc(missionId), { order: index });
    });
    batch.update(chaseRef(chaseId), { updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();

    return { ok: true };
  });
}
