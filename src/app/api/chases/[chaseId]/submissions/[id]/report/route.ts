import { Timestamp } from "firebase-admin/firestore";
import { reportSubmissionSchema } from "@/lib/domain/schemas";
import type { SubmissionReport } from "@/lib/domain/types";
import { requireParticipant } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import { reportsRef } from "@/lib/server/collections";
import { submissionRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; id: string }> };

/**
 * Participant-filed report. It never changes the submission — an organizer
 * decides — but it does surface it in the Studio's reports queue.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    const { caller, participant } = await requireParticipant(chaseId, request);
    const { reason } = reportSubmissionSchema.parse(await readJson(request));

    if (!(await submissionRef(chaseId, id).get()).exists) {
      throw notFound("That submission doesn't exist.");
    }

    // One open report per person per submission, so a rage-tap cannot spam.
    const report: Omit<SubmissionReport, "id"> = {
      chaseId,
      submissionId: id,
      reason,
      byUid: caller.uid,
      byName: participant.displayName,
      status: "open",
      createdAt: Timestamp.now(),
    };
    await reportsRef(chaseId).doc(`${id}_${caller.uid}`).set(report);

    return { ok: true };
  });
}
