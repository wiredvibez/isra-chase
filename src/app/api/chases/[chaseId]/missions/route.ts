import { FieldValue } from "firebase-admin/firestore";
import { missionInputSchema } from "@/lib/domain/schemas";
import type { Mission, Submission, Team } from "@/lib/domain/types";
import { requireMember, requireOrganizer } from "@/lib/server/guards";
import { handler, notFound, readJson } from "@/lib/server/http";
import { missionsRef, submissionsRef, teamsRef } from "@/lib/server/collections";
import {
  assertTriggerCanGrade,
  expiryFromInput,
  releaseFromInput,
} from "@/lib/server/missions";
import { playMissions } from "@/lib/server/projections";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/**
 * Organizers get the mission documents verbatim. Participants get the
 * secret-stripped, availability-resolved projection — the answer key and the
 * GPS pin are never serialised for them, and locked missions are omitted.
 */
export async function GET(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { chase, participant, organizer } = await requireMember(chaseId, request);

    const missions = (await missionsRef(chaseId).orderBy("order", "asc").get()).docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Mission,
    );

    // An organizer who also plays asks for the play projection explicitly.
    const asPlayer = new URL(request.url).searchParams.get("as") === "play";
    if (organizer && !(asPlayer && participant)) return { missions, organizer: true };
    if (!participant) return { missions: [], organizer };

    const [teamSnap, submissionSnap] = await Promise.all([
      teamsRef(chaseId).doc(participant.teamId).get(),
      submissionsRef(chaseId).where("teamId", "==", participant.teamId).get(),
    ]);
    if (!teamSnap.exists) throw notFound("Your team no longer exists.");

    const team = { id: teamSnap.id, ...teamSnap.data() } as Team;
    const submissions = submissionSnap.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Submission,
    );

    return {
      missions: playMissions(missions, chase, team, submissions),
      organizer,
    };
  });
}

export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    await requireOrganizer(chaseId, request);
    const input = missionInputSchema.parse(await readJson(request));
    await assertTriggerCanGrade(chaseId, input.release);

    // Append to the end of the custom order.
    const last = await missionsRef(chaseId).orderBy("order", "desc").limit(1).get();
    const order = last.empty ? 0 : Number(last.docs[0].data().order ?? 0) + 1;

    const ref = missionsRef(chaseId).doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({
      ...input,
      chaseId,
      order,
      release: releaseFromInput(input.release),
      expiry: expiryFromInput(input.expiry),
      createdAt: now,
      updatedAt: now,
    });
    await chaseRef(chaseId).update({
      "stats.missionCount": FieldValue.increment(1),
      updatedAt: now,
    });

    const snap = await ref.get();
    return { mission: { id: snap.id, ...snap.data() } };
  });
}
