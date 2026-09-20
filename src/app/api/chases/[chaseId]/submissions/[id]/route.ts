import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { deleteSubmissionSchema, moderateSubmissionSchema } from "@/lib/domain/schemas";
import type { Mission, Submission } from "@/lib/domain/types";
import { isOrganizerOf, requireCaller, loadChase, loadParticipant } from "@/lib/server/guards";
import { forbidden, handler, notFound, readJson } from "@/lib/server/http";
import {
  adjustmentsRef,
  deleteQuery,
  deleteRefs,
  deleteStorageObjects,
  missionsRef,
} from "@/lib/server/collections";
import { writeNotification } from "@/lib/server/notifications";
import {
  applySubmissionPoints,
  bumpSubmissionCounts,
  recomputeTeamTotals,
  submissionRef,
} from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; id: string }> };

/**
 * Moderate a submission.
 *
 * approve/reject move points; hide/unhide and flag/unflag only change how the
 * submission is displayed. Every action is recorded against the reviewer, so
 * the review queue doubles as an audit trail.
 */
export async function PATCH(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    const caller = await requireCaller(request);
    const chase = await loadChase(chaseId);
    if (!isOrganizerOf(chase, caller.uid)) {
      throw forbidden("Only this chase's organizers can moderate.");
    }
    const { action, note } = moderateSubmissionSchema.parse(await readJson(request));

    let notify: { teamId: string; approved: boolean } | null = null;

    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(submissionRef(chaseId, id));
      if (!snap.exists) throw notFound("That submission doesn't exist.");
      const submission = { id: snap.id, ...snap.data() } as Submission;

      // Only approve needs the mission, but the read has to happen before any
      // write, so it is hoisted out of the switch.
      const missionSnap =
        action === "approve"
          ? await tx.get(missionsRef(chaseId).doc(submission.missionId))
          : null;

      const review = {
        reviewedByUid: caller.uid,
        reviewedAt: Timestamp.now(),
        reviewNote: note,
      };

      switch (action) {
        case "approve": {
          if (submission.status === "approved") break;
          const mission = missionSnap?.data() as Mission | undefined;
          const points = Number(mission?.points ?? 0);
          tx.update(snap.ref, { ...review, status: "approved", points });
          if (points) {
            applySubmissionPoints(
              tx,
              chaseId,
              submission.teamId,
              points,
              submission.createdAt as Timestamp,
            );
          }
          notify = { teamId: submission.teamId, approved: true };
          break;
        }
        case "reject": {
          if (submission.status === "rejected") break;
          tx.update(snap.ref, { ...review, status: "rejected", points: 0 });
          if (submission.status === "approved" && submission.points) {
            applySubmissionPoints(tx, chaseId, submission.teamId, -submission.points, null);
          }
          notify = { teamId: submission.teamId, approved: false };
          break;
        }
        case "hide":
        case "unhide":
          tx.update(snap.ref, { ...review, hidden: action === "hide" });
          break;
        case "flag":
        case "unflag":
          tx.update(snap.ref, {
            ...review,
            flagged: action === "flag",
            flagReason: action === "flag" ? (note ?? "Flagged by an organizer.") : null,
          });
          break;
      }
    });

    if (notify) {
      const { teamId, approved } = notify as { teamId: string; approved: boolean };
      await writeNotification(chaseId, {
        teamId,
        type: approved ? "submission_approved" : "submission_rejected",
        title: approved ? "Submission approved" : "Submission rejected",
        body: note ?? (approved ? "Your submission earned its points." : "An organizer rejected your submission."),
      });
    }

    const snap = await submissionRef(chaseId, id).get();
    return { submission: { id: snap.id, ...snap.data() } };
  });
}

/**
 * Organizers may delete anything; a participant may delete their own team's,
 * which is also the "redo" path — the mission reopens once the row is gone.
 */
export async function DELETE(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    const caller = await requireCaller(request);
    const chase = await loadChase(chaseId);
    const organizer = isOrganizerOf(chase, caller.uid);
    const participant = organizer ? null : await loadParticipant(chaseId, caller.uid);
    if (!organizer && !participant) throw forbidden("You haven't joined this chase.");

    const body = await request
      .json()
      .catch(() => ({}))
      .then((value) => deleteSubmissionSchema.parse(value ?? {}));

    const ref = submissionRef(chaseId, id);
    let removed!: Submission;

    await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw notFound("That submission doesn't exist.");
      removed = { id: snap.id, ...snap.data() } as Submission;

      if (!organizer && removed.teamId !== participant?.teamId) {
        throw forbidden("That isn't your team's submission.");
      }

      tx.delete(ref);
      if (removed.status === "approved" && removed.points) {
        applySubmissionPoints(tx, chaseId, removed.teamId, -removed.points, null);
      }
      bumpSubmissionCounts(tx, chaseId, removed.teamId, removed.participantUid, -1, null);
    });

    // Bonuses attached to a deleted submission would otherwise keep scoring.
    const bonuses = await adjustmentsRef(chaseId).where("submissionId", "==", id).get();
    await Promise.all([
      deleteRefs(bonuses.docs.map((doc) => doc.ref)),
      deleteQuery(ref.collection("likes")),
      deleteStorageObjects([removed.media?.path ?? null]),
    ]);

    // The tie-break clock cannot be unwound incrementally, so rebuild the team.
    await recomputeTeamTotals(chaseId, removed.teamId);

    if (organizer) {
      await writeNotification(chaseId, {
        teamId: removed.teamId,
        type: "submission_deleted",
        title: `"${removed.missionName}" was removed`,
        body:
          body.reason ??
          "An organizer deleted your submission. You can submit this mission again.",
      });
    }

    return { ok: true };
  });
}
