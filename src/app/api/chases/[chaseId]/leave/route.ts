import { requireParticipant } from "@/lib/server/guards";
import { handler } from "@/lib/server/http";
import { removeParticipant } from "@/lib/server/purge";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/** Leaving takes your submissions and their points with you. */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { caller } = await requireParticipant(chaseId, request);
    await removeParticipant(chaseId, caller.uid);
    return { ok: true };
  });
}
