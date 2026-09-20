import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireMember } from "@/lib/server/guards";
import { handler, notFound } from "@/lib/server/http";
import { submissionRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string; id: string }> };

/** Toggles a like. The counter and the like doc move together or not at all. */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId, id } = await params;
    const { caller } = await requireMember(chaseId, request);

    const ref = submissionRef(chaseId, id);
    const likeRef = ref.collection("likes").doc(caller.uid);

    return adminDb().runTransaction(async (tx) => {
      const [snap, like] = await Promise.all([tx.get(ref), tx.get(likeRef)]);
      if (!snap.exists) throw notFound("That submission doesn't exist.");

      const liked = !like.exists;
      if (liked) {
        tx.set(likeRef, { uid: caller.uid, createdAt: Timestamp.now() });
      } else {
        tx.delete(likeRef);
      }
      tx.update(ref, { likeCount: FieldValue.increment(liked ? 1 : -1) });

      return {
        liked,
        likeCount: Math.max(0, Number(snap.data()?.likeCount ?? 0) + (liked ? 1 : -1)),
      };
    });
  });
}
