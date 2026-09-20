import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createTeamSchema } from "@/lib/domain/schemas";
import type { Team } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { handler, readJson } from "@/lib/server/http";
import { teamsRef } from "@/lib/server/collections";
import { chaseRef } from "@/lib/server/scoring";
import { setTeamPasscode } from "@/lib/server/secrets";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/** Pre-created teams: participants then join them by name and passcode. */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    await requireOrganizer(chaseId, request);
    const input = createTeamSchema.parse(await readJson(request));

    const ref = teamsRef(chaseId).doc();
    const team: Omit<Team, "id"> = {
      chaseId,
      name: input.name,
      photoUrl: input.photoUrl,
      // The real passcode lives in private/settings; see lib/server/secrets.ts.
      passcode: null,
      hasPasscode: Boolean(input.passcode),
      mode: input.mode,
      maxMembers: input.mode === "solo" ? 1 : input.maxMembers,
      memberCount: 0,
      createdBy: "organizer",
      basePoints: 0,
      bonusPoints: 0,
      points: 0,
      submissionCount: 0,
      lastSubmissionAt: null,
      createdAt: Timestamp.now(),
    };

    await ref.set(team);
    if (input.passcode) await setTeamPasscode(chaseId, ref.id, input.passcode);
    await chaseRef(chaseId).update({
      "stats.teamCount": FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { team: { id: ref.id, ...team, passcode: input.passcode } };
  });
}
