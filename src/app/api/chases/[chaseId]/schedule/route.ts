import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { chaseScheduleSchema } from "@/lib/domain/schemas";
import { loadChase, requireOrganizer } from "@/lib/server/guards";
import { badRequest, handler, readJson } from "@/lib/server/http";
import { materialiseBroadcasts } from "@/lib/server/notifications";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/**
 * The whole chase lifecycle lives here: draft → scheduled → live → ended,
 * plus Goosechase's "Reset Start & End times", which drops an ended chase
 * back to draft WITHOUT touching participants, submissions or points.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase } = await requireOrganizer(chaseId, request);
    const input = chaseScheduleSchema.parse(await readJson(request));

    const now = Date.now();
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    switch (input.action) {
      case "go_live": {
        const endAt = Timestamp.fromMillis(input.endAtMs!);
        if (endAt.toMillis() <= now) {
          throw badRequest("The end time has already passed.");
        }
        update.status = "live";
        update.startMode = "now";
        update.startAt = Timestamp.fromMillis(now);
        update.endAt = endAt;
        break;
      }
      case "schedule": {
        const startAt = Timestamp.fromMillis(input.startAtMs!);
        const endAt = Timestamp.fromMillis(input.endAtMs!);
        if (endAt.toMillis() <= startAt.toMillis()) {
          throw badRequest("The chase has to end after it starts.");
        }
        update.status = "scheduled";
        update.startMode = "scheduled";
        update.startAt = startAt;
        update.endAt = endAt;
        break;
      }
      case "end": {
        if (chase.status !== "live" && chase.status !== "scheduled") {
          throw badRequest("Only a running chase can be ended.");
        }
        update.status = "ended";
        update.endAt = Timestamp.fromMillis(now);
        // A scheduled chase that is ended early still needs a start time so
        // mission release rules resolve to something.
        if (!chase.startAt) update.startAt = Timestamp.fromMillis(now);
        break;
      }
      case "update_end": {
        if (!input.endAtMs) throw badRequest("Pick a new end time.");
        const endAt = Timestamp.fromMillis(input.endAtMs);
        const startMs = chase.startAt?.toMillis() ?? null;
        if (startMs !== null && endAt.toMillis() <= startMs) {
          throw badRequest("The chase has to end after it starts.");
        }
        update.endAt = endAt;
        // Extending past "now" brings an ended chase back to life.
        if (chase.status === "ended" && endAt.toMillis() > now) update.status = "live";
        break;
      }
      case "reset": {
        if (chase.status !== "ended") {
          throw badRequest("Only an ended chase can have its times reset.");
        }
        update.status = "draft";
        update.startMode = "now";
        update.startAt = null;
        update.endAt = null;
        break;
      }
    }

    await chaseRef(chaseId).update(update);
    const updated = await loadChase(chaseId);
    // Going live (or ending) can make time-anchored broadcasts due at once.
    await materialiseBroadcasts(updated);
    return { chase: updated };
  });
}
