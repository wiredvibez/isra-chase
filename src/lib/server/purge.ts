import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Submission } from "@/lib/domain/types";
import {
  deleteQuery,
  deleteStorageObjects,
  participantsRef,
  teamsRef,
} from "./collections";
import { chaseRef, recomputeTeamTotals } from "./scoring";

/**
 * Remove submissions wholesale — used by the mission, team and participant
 * delete cascades.
 *
 * Points are not unwound incrementally: a deletion also moves the tie-break
 * clock (`lastSubmissionAt`), which cannot be derived from the removed rows,
 * so every affected team is recomputed from scratch afterwards.
 */
export async function purgeSubmissions(
  chaseId: string,
  docs: QueryDocumentSnapshot[],
  /** Skipped when the team itself is being deleted in the same breath. */
  options: { recompute?: boolean } = {},
): Promise<string[]> {
  if (!docs.length) return [];

  const submissions = docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Submission);
  const teamIds = new Set<string>();
  const perParticipant = new Map<string, number>();

  for (const submission of submissions) {
    teamIds.add(submission.teamId);
    perParticipant.set(
      submission.participantUid,
      (perParticipant.get(submission.participantUid) ?? 0) + 1,
    );
  }

  // Likes live under each submission, so they go before their parent.
  await Promise.all(docs.map((doc) => deleteQuery(doc.ref.collection("likes"))));

  const db = adminDb();
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 400)) batch.delete(doc.ref);
    await batch.commit();
  }

  await chaseRef(chaseId).update({
    "stats.submissionCount": FieldValue.increment(-submissions.length),
  });
  // Each participant is updated on its own: one of them may already be gone
  // (their own cascade runs first) and that must not lose the others.
  await Promise.all(
    [...perParticipant].map(([uid, count]) =>
      participantsRef(chaseId)
        .doc(uid)
        .update({ submissionCount: FieldValue.increment(-count) })
        .catch(() => undefined),
    ),
  );

  await deleteStorageObjects(submissions.map((s) => s.media?.path ?? null));
  if (options.recompute !== false) {
    await Promise.all([...teamIds].map((teamId) => recomputeTeamTotals(chaseId, teamId)));
  }

  return [...teamIds];
}

/**
 * Remove one person from a chase.
 *
 * Only their own submissions and points go with them — the team survives and
 * its other members keep everything, which also reopens the missions this
 * person had claimed so a teammate can submit them again.
 */
export async function removeParticipant(chaseId: string, uid: string) {
  const participantDoc = participantsRef(chaseId).doc(uid);
  const snap = await participantDoc.get();
  if (!snap.exists) return false;
  const teamId = snap.data()?.teamId as string | undefined;

  const mine = await chaseRef(chaseId)
    .collection("submissions")
    .where("participantUid", "==", uid)
    .get();
  await purgeSubmissions(chaseId, mine.docs);

  await participantDoc.delete();
  await chaseRef(chaseId).update({
    "stats.participantCount": FieldValue.increment(-1),
  });
  if (teamId) {
    await teamsRef(chaseId)
      .doc(teamId)
      .update({ memberCount: FieldValue.increment(-1) })
      .catch(() => undefined);
  }
  return true;
}
