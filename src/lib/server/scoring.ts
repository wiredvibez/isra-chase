import { FieldValue, Timestamp, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Scoring rules
 * =============
 * A team's total is always `basePoints + bonusPoints`, where
 *   basePoints  = sum of `points` over its APPROVED submissions
 *   bonusPoints = sum of `points` over its adjustment entries
 *
 * Both halves are maintained incrementally with FieldValue.increment inside
 * the same transaction as the change that caused them, so a total can never
 * drift from a partially-applied write. `recomputeTeamTotals` rebuilds a team
 * from scratch and is used after deletions (where the incremental path cannot
 * know the new `lastSubmissionAt`) and as a repair tool.
 */

export const chaseRef = (chaseId: string) =>
  adminDb().collection("chases").doc(chaseId);

export const teamRef = (chaseId: string, teamId: string) =>
  chaseRef(chaseId).collection("teams").doc(teamId);

export const submissionRef = (chaseId: string, submissionId: string) =>
  chaseRef(chaseId).collection("submissions").doc(submissionId);

export const participantRef = (chaseId: string, uid: string) =>
  chaseRef(chaseId).collection("participants").doc(uid);

/** Apply the point effect of a submission becoming (or ceasing to be) approved. */
export function applySubmissionPoints(
  tx: Transaction,
  chaseId: string,
  teamId: string,
  deltaPoints: number,
  submittedAt: Timestamp | null,
) {
  const update: Record<string, unknown> = {
    basePoints: FieldValue.increment(deltaPoints),
    points: FieldValue.increment(deltaPoints),
  };
  // Only ever push the tie-break clock forward here; deletions recompute it.
  if (submittedAt) update.lastSubmissionAt = submittedAt;
  tx.update(teamRef(chaseId, teamId), update);
}

export function applyBonusPoints(
  tx: Transaction,
  chaseId: string,
  teamId: string,
  deltaPoints: number,
) {
  tx.update(teamRef(chaseId, teamId), {
    bonusPoints: FieldValue.increment(deltaPoints),
    points: FieldValue.increment(deltaPoints),
  });
}

export function bumpSubmissionCounts(
  tx: Transaction,
  chaseId: string,
  teamId: string,
  uid: string | null,
  delta: number,
  submittedAt: Timestamp | null,
) {
  tx.update(teamRef(chaseId, teamId), {
    submissionCount: FieldValue.increment(delta),
  });
  if (uid) {
    const update: Record<string, unknown> = {
      submissionCount: FieldValue.increment(delta),
    };
    if (submittedAt) update.lastSubmissionAt = submittedAt;
    tx.update(participantRef(chaseId, uid), update);
  }
  tx.update(chaseRef(chaseId), {
    "stats.submissionCount": FieldValue.increment(delta),
  });
}

/**
 * Rebuild a team's totals from its submissions and adjustments.
 * Runs outside a transaction: it is a convergence step, not a critical path.
 */
export async function recomputeTeamTotals(chaseId: string, teamId: string) {
  const db = adminDb();
  const [submissions, adjustments] = await Promise.all([
    db
      .collection("chases")
      .doc(chaseId)
      .collection("submissions")
      .where("teamId", "==", teamId)
      .get(),
    db
      .collection("chases")
      .doc(chaseId)
      .collection("adjustments")
      .where("teamId", "==", teamId)
      .get(),
  ]);

  let basePoints = 0;
  let submissionCount = 0;
  let lastSubmissionAt: Timestamp | null = null;

  for (const doc of submissions.docs) {
    const data = doc.data();
    submissionCount += 1;
    if (data.status !== "approved") continue;
    basePoints += Number(data.points ?? 0);
    const createdAt = data.createdAt as Timestamp | undefined;
    if (createdAt && (!lastSubmissionAt || createdAt.toMillis() > lastSubmissionAt.toMillis())) {
      lastSubmissionAt = createdAt;
    }
  }

  const bonusPoints = adjustments.docs.reduce(
    (sum, doc) => sum + Number(doc.data().points ?? 0),
    0,
  );

  await teamRef(chaseId, teamId).update({
    basePoints,
    bonusPoints,
    points: basePoints + bonusPoints,
    submissionCount,
    lastSubmissionAt,
  });

  return { basePoints, bonusPoints, points: basePoints + bonusPoints };
}

/** Recompute every team in a chase — used by the repair endpoint and seeds. */
export async function recomputeChaseTotals(chaseId: string) {
  const teams = await chaseRef(chaseId).collection("teams").get();
  const results = await Promise.all(
    teams.docs.map((doc) => recomputeTeamTotals(chaseId, doc.id)),
  );
  return results.length;
}
