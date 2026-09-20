import { requireMember } from "@/lib/server/guards";
import { handler } from "@/lib/server/http";
import { materialiseBroadcasts } from "@/lib/server/notifications";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/**
 * Materialise any due broadcasts. Called on read by both apps so the product
 * needs no cron; it is idempotent, so calling it from ten phones at once
 * produces exactly one notification per broadcast per team.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase } = await requireMember(chaseId, request);
    return { sent: await materialiseBroadcasts(chase) };
  });
}
