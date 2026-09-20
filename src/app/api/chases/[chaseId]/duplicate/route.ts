import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Mission, ReleaseRule } from "@/lib/domain/types";
import { requireOrganizer } from "@/lib/server/guards";
import { handler } from "@/lib/server/http";
import { claimJoinCode, missionsRef } from "@/lib/server/collections";
import { loadSecrets, secretsRef } from "@/lib/server/secrets";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/** Copies settings, branding and every mission. Never participants or play data. */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const { caller, chase } = await requireOrganizer(chaseId, request);

    const [missions, secrets] = await Promise.all([
      missionsRef(chaseId).orderBy("order", "asc").get(),
      loadSecrets(chaseId),
    ]);

    const ref = adminDb().collection("chases").doc();
    const joinCode = await claimJoinCode(ref.id);
    const now = FieldValue.serverTimestamp();

    // Mission-unlock rules point at mission ids, so they have to be rewritten
    // to the copies or the new chase would gate on the original's missions.
    const idMap = new Map<string, string>();
    const copies = missions.docs.map((doc) => {
      const copy = missionsRef(ref.id).doc();
      idMap.set(doc.id, copy.id);
      return { copy, mission: { id: doc.id, ...doc.data() } as Mission };
    });

    // Everything except identity and play data carries over.
    const settings = { ...chase } as Partial<typeof chase>;
    delete settings.id;
    delete settings.createdAt;
    delete settings.updatedAt;

    await ref.set({
      ...settings,
      ownerUid: caller.uid,
      name: `${chase.name} (copy)`,
      joinCode,
      status: "draft",
      startMode: "now",
      startAt: null,
      endAt: null,
      leaderboardRevealed: false,
      password: null,
      hasPassword: Boolean(secrets.password),
      stats: {
        teamCount: 0,
        participantCount: 0,
        submissionCount: 0,
        missionCount: copies.length,
      },
      createdAt: now,
      updatedAt: now,
    });

    if (secrets.password) {
      await secretsRef(ref.id).set({ password: secrets.password, teamPasscodes: {} });
    }

    const batch = adminDb().batch();
    for (const { copy, mission } of copies) {
      const release: ReleaseRule =
        mission.release.kind === "mission"
          ? {
              ...mission.release,
              missionId: idMap.get(mission.release.missionId) ?? mission.release.missionId,
            }
          : mission.release;
      const rest = { ...mission } as Partial<Mission>;
      delete rest.id;
      batch.set(copy, {
        ...rest,
        chaseId: ref.id,
        release,
        createdAt: now,
        updatedAt: now,
      });
    }
    await batch.commit();

    const snap = await ref.get();
    return { chase: { id: snap.id, ...snap.data() } };
  });
}
