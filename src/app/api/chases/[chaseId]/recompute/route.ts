import { requireOrganizer } from "@/lib/server/guards";
import { handler } from "@/lib/server/http";
import { recomputeChaseTotals } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/** Repair tool: rebuilds every team total from its submissions and adjustments. */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    await requireOrganizer(chaseId, request);
    return { teams: await recomputeChaseTotals(chaseId) };
  });
}
