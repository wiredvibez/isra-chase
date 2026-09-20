import { requireOrganizer } from "@/lib/server/guards";
import { handler, notFound } from "@/lib/server/http";
import { removeParticipant } from "@/lib/server/purge";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; uid: string }> };

/** Drops the person, their submissions and their points — the team lives on. */
export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, uid } = await params;
    await requireOrganizer(chaseId, request);
    const removed = await removeParticipant(chaseId, uid);
    if (!removed) throw notFound("They aren't in this chase.");
    return { ok: true };
  });
}
