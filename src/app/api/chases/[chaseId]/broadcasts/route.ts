import { Timestamp } from "firebase-admin/firestore";
import { broadcastSchema } from "@/lib/domain/schemas";
import type { Broadcast } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, readJson } from "@/lib/server/http";
import { broadcastsRef } from "@/lib/server/collections";
import { materialiseBroadcasts, scheduleFromInput } from "@/lib/server/notifications";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { caller, chase } = await requireOrganizer(chaseId, request);
    const input = broadcastSchema.parse(await readJson(request));

    const ref = broadcastsRef(chaseId).doc();
    const broadcast: Omit<Broadcast, "id"> = {
      chaseId,
      body: input.body,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl,
      teamIds: input.teamIds,
      schedule: scheduleFromInput(input.schedule),
      status: "scheduled",
      sentAt: null,
      createdByUid: caller.uid,
      createdByName: caller.name,
      createdAt: Timestamp.now(),
    };
    await ref.set(broadcast);

    // "Send now" is just a schedule that is already due.
    await materialiseBroadcasts(chase);

    const snap = await ref.get();
    return { broadcast: { id: snap.id, ...snap.data() } };
  });
}
