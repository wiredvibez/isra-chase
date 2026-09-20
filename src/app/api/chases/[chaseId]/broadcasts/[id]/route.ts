import { broadcastSchema } from "@/lib/domain/schemas";
import { requireOrganizer } from "@/lib/server/guards";
import { conflict, handler, notFound, readJson } from "@/lib/server/http";
import { broadcastsRef } from "@/lib/server/collections";
import { materialiseBroadcasts, scheduleFromInput } from "@/lib/server/notifications";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    const { chase } = await requireOrganizer(chaseId, request);
    const input = broadcastSchema.partial().parse(await readJson(request));

    const ref = broadcastsRef(chaseId).doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw notFound("That broadcast doesn't exist.");
    // A sent broadcast has already landed in people's notifications.
    if (snap.data()?.status === "sent") throw conflict("That broadcast has already been sent.");

    const { schedule, ...rest } = input;
    await ref.update({
      ...rest,
      ...(schedule ? { schedule: scheduleFromInput(schedule) } : {}),
    });
    await materialiseBroadcasts(chase);

    const updated = await ref.get();
    return { broadcast: { id: updated.id, ...updated.data() } };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    await requireOrganizer(chaseId, request);

    const ref = broadcastsRef(chaseId).doc(id);
    if (!(await ref.get()).exists) throw notFound("That broadcast doesn't exist.");
    await ref.delete();
    return { ok: true };
  });
}
