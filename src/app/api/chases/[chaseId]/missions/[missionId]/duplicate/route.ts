import { FieldValue } from "firebase-admin/firestore";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound } from "@/lib/server/http";
import { missionsRef } from "@/lib/server/collections";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; missionId: string }> };

export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, missionId } = await params;
    await requireOrganizer(chaseId, request);

    const source = await missionsRef(chaseId).doc(missionId).get();
    if (!source.exists) throw notFound("That mission doesn't exist.");

    const last = await missionsRef(chaseId).orderBy("order", "desc").limit(1).get();
    const order = last.empty ? 0 : Number(last.docs[0].data().order ?? 0) + 1;

    const ref = missionsRef(chaseId).doc();
    const now = FieldValue.serverTimestamp();
    const data = source.data() ?? {};
    await ref.set({
      ...data,
      name: `${data.name} (copy)`,
      order,
      // A copy starts as a draft so it cannot go live half-edited.
      isDraft: true,
      createdAt: now,
      updatedAt: now,
    });
    await chaseRef(chaseId).update({
      "stats.missionCount": FieldValue.increment(1),
      updatedAt: now,
    });

    const snap = await ref.get();
    return { mission: { id: snap.id, ...snap.data() } };
  });
}
