import { requireOrganizer } from "@/lib/server/guards";
import { handler } from "@/lib/server/http";
import { materialiseBroadcasts } from "@/lib/server/notifications";
import { collectStats, statsDrift } from "@/lib/server/stats";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

export async function GET(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase } = await requireOrganizer(chaseId, request);

    const [stats] = await Promise.all([
      collectStats(chaseId),
      // The Studio polls this tab, which makes it a convenient tick source.
      materialiseBroadcasts(chase),
    ]);

    return { ...stats, drift: statsDrift(chase, stats) };
  });
}
