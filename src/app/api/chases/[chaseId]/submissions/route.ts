import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { createSubmissionSchema } from "@/lib/domain/schemas";
import { missionAvailability } from "@/lib/domain/availability";
import { gradeGps, gradeText } from "@/lib/domain/grading";
import type { Chase, Mission, Submission, Team } from "@/lib/domain/types";
import { requireParticipant } from "@/lib/server/guards";
import {
  badRequest,
  conflict,
  forbidden,
  handler,
  notFound,
  readJson,
} from "@/lib/server/http";
import { missionsRef, submissionsRef } from "@/lib/server/collections";
import { writeNotification } from "@/lib/server/notifications";
import { flagFor, screen } from "@/lib/server/profanity";
import { teamProgress, visibleMissionIds } from "@/lib/server/projections";
import {
  applySubmissionPoints,
  bumpSubmissionCounts,
  chaseRef,
  teamRef,
} from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

interface Verdict {
  correct: boolean;
  reason: string;
  status: Submission["status"];
  points: number;
  distanceM: number | null;
  matched: string | null;
}

/**
 * Submit a mission.
 *
 * Everything that can decide points happens inside one transaction, because
 * the availability check, the duplicate check and the score increment have to
 * see the same world: two phones tapping "submit" at once must not both score.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { caller, participant } = await requireParticipant(chaseId, request);
    const input = createSubmissionSchema.parse(await readJson(request));

    const teamId = participant.teamId;
    let verdict!: Verdict;
    let submissionId!: string;
    let before!: { chase: Chase; team: Team; submissions: Submission[] };
    let mission!: Mission;
    let awarded = 0;

    await adminDb().runTransaction(async (tx) => {
      /* ----------------------------------------------------------- reads -- */
      const [chaseSnap, missionSnap, teamSnap, teamSubmissions] = await Promise.all([
        tx.get(chaseRef(chaseId)),
        tx.get(missionsRef(chaseId).doc(input.missionId)),
        tx.get(teamRef(chaseId, teamId)),
        tx.get(submissionsRef(chaseId).where("teamId", "==", teamId)),
      ]);

      if (!chaseSnap.exists) throw notFound("That chase doesn't exist.");
      if (!missionSnap.exists) throw notFound("That mission doesn't exist.");
      if (!teamSnap.exists) throw notFound("Your team no longer exists.");

      const chase = { id: chaseSnap.id, ...chaseSnap.data() } as Chase;
      mission = { id: missionSnap.id, ...missionSnap.data() } as Mission;
      const team = { id: teamSnap.id, ...teamSnap.data() } as Team;
      const submissions = teamSubmissions.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Submission,
      );
      before = { chase, team, submissions };

      /* ------------------------------------------------------- gatekeeping */
      if (chase.status !== "live") {
        throw conflict(
          chase.status === "ended"
            ? "This chase has ended."
            : "This chase hasn't started yet.",
        );
      }
      if (mission.isDraft) throw forbidden("That mission isn't available.");

      const progress = teamProgress(submissions, team.points);
      const availability = missionAvailability(mission, chase, progress);
      if (availability.state === "locked") {
        throw forbidden("That mission isn't available.");
      }
      if (availability.state === "expired") {
        throw conflict("That mission has expired.");
      }

      // One submission per mission per team. A wrong auto-graded answer is the
      // single exception: it is overwritten, so a typo is not a dead end.
      const existing = submissions.find((s) => s.missionId === mission.id);
      const replacing =
        existing && existing.status === "rejected" && existing.autoGraded
          ? existing
          : null;
      if (existing && !replacing) {
        throw conflict("Your team has already submitted this mission.");
      }

      /* ------------------------------------------------------------ grade */
      verdict = grade(mission, input);

      const moderating = chase.moderationMode === "review";
      if (!verdict.correct) {
        verdict.status = "rejected";
        verdict.points = 0;
      } else if (moderating) {
        verdict.status = "pending";
        verdict.points = 0;
      } else {
        verdict.status = "approved";
        verdict.points = mission.points;
      }

      const term = chase.profanityFilter
        ? screen(input.caption, input.textAnswer)
        : null;

      /* ----------------------------------------------------------- writes */
      const ref = replacing
        ? submissionsRef(chaseId).doc(replacing.id)
        : submissionsRef(chaseId).doc();
      submissionId = ref.id;
      const createdAt = Timestamp.now();

      const submission: Omit<Submission, "id"> = {
        chaseId,
        missionId: mission.id,
        missionName: mission.name,
        missionType: mission.type,
        teamId,
        teamName: team.name,
        participantUid: caller.uid,
        participantName: participant.displayName,
        status: verdict.status,
        caption: input.caption,
        media: input.media,
        textAnswer: input.textAnswer,
        location: input.location
          ? { ...input.location, distanceM: verdict.distanceM ?? 0 }
          : null,
        points: verdict.points,
        bonusPoints: 0,
        autoGraded: true,
        gradeReason: verdict.reason,
        likeCount: 0,
        // Denormalised: the Firestore feed rule cannot join back to the mission.
        feedVisible: mission.feedVisibility === "shown",
        hidden: false,
        flagged: Boolean(term),
        flagReason: term ? flagFor(term) : null,
        reviewedByUid: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt,
      };
      tx.set(ref, submission);

      // A replacement occupies the slot the rejected attempt already held.
      if (!replacing) {
        bumpSubmissionCounts(tx, chaseId, teamId, caller.uid, 1, createdAt);
      }
      if (verdict.status === "approved" && mission.points) {
        awarded = mission.points;
        applySubmissionPoints(tx, chaseId, teamId, mission.points, createdAt);
      }
    });

    await announceUnlocks(before, mission, verdict, awarded, teamId);

    const snap = await submissionsRef(chaseId).doc(submissionId).get();
    return { submission: { id: snap.id, ...snap.data() }, verdict };
  });
}

function grade(
  mission: Mission,
  input: { textAnswer: string | null; location: { lat: number; lng: number } | null; media: unknown },
): Verdict {
  const base = { status: "pending" as Submission["status"], points: 0 };

  if (mission.type === "camera") {
    if (!input.media) throw badRequest("Add a photo or video to submit this one.");
    return {
      ...base,
      correct: true,
      reason: "Camera missions are accepted automatically.",
      distanceM: null,
      matched: null,
    };
  }

  if (mission.type === "text") {
    if (!input.textAnswer) throw badRequest("Type an answer to submit this one.");
    if (!mission.text) throw badRequest("This mission is missing its answer settings.");
    const result = gradeText(input.textAnswer, mission.text);
    return {
      ...base,
      correct: result.correct,
      reason: result.reason,
      distanceM: null,
      matched: result.matched,
    };
  }

  if (!input.location) throw badRequest("We need your location to check you in.");
  if (!mission.gps) throw badRequest("This mission is missing its location settings.");
  const result = gradeGps(input.location, mission.gps);
  return {
    ...base,
    correct: result.correct,
    reason: result.reason,
    distanceM: result.distanceM,
    matched: null,
  };
}

/**
 * Completing a mission can open the next one. Availability is derived, not
 * stored, so the only way to notice is to re-resolve the whole list against
 * the team's progress before and after.
 */
async function announceUnlocks(
  before: { chase: Chase; team: Team; submissions: Submission[] },
  mission: Mission,
  verdict: Verdict,
  awarded: number,
  teamId: string,
) {
  if (!verdict.correct) return;

  const chaseId = before.chase.id;
  const missions = (await missionsRef(chaseId).get()).docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Mission,
  );

  const was = visibleMissionIds(
    missions,
    before.chase,
    teamProgress(before.submissions, before.team.points),
  );
  const now = visibleMissionIds(
    missions,
    before.chase,
    teamProgress(
      // teamProgress only reads missionId and status, so a stub is enough.
      [...before.submissions, { missionId: mission.id, status: verdict.status } as Submission],
      before.team.points + awarded,
    ),
  );

  const unlocked = missions.filter((m) => now.has(m.id) && !was.has(m.id));
  if (!unlocked.length) return;

  await writeNotification(chaseId, {
    teamId,
    type: "mission_unlocked",
    title: unlocked.length === 1 ? "נפתחה משימה חדשה" : "נפתחו משימות חדשות",
    body:
      unlocked.length === 1
        ? `"${unlocked[0].name}" פתוחה עכשיו. יאללה.`
        : `${unlocked.length} משימות חדשות נפתחו עכשיו.`,
  });
}
