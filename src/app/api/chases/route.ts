import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { createChaseSchema } from "@/lib/domain/schemas";
import type { Chase } from "@/lib/domain/types";
import { requireCaller } from "@/lib/server/guards";
import { handler, readJson } from "@/lib/server/http";
import { claimJoinCode } from "@/lib/server/collections";
import { chaseRef } from "@/lib/server/scoring";

export const runtime = "nodejs";

/** Create a chase. Everything else about it is edited later, Goosechase-style. */
export async function POST(request: Request) {
  return handler(async () => {
    const caller = await requireCaller(request);
    const input = createChaseSchema.parse(await readJson(request));

    const ref = adminDb().collection("chases").doc();
    const joinCode = await claimJoinCode(ref.id);
    const now = FieldValue.serverTimestamp();

    const chase: Omit<Chase, "id" | "createdAt" | "updatedAt"> = {
      ownerUid: caller.uid,
      workspaceId: null,
      collaborators: {},
      collaboratorEmails: [],
      name: input.name,
      description: input.description,
      imageUrl: null,
      location: null,
      // The real password lives in private/settings; see lib/server/secrets.ts.
      password: null,
      hasPassword: false,
      searchVisibility: "hidden",
      splashImageUrl: null,
      termsUrl: null,
      timezone: input.timezone,
      status: "draft",
      startMode: "now",
      startAt: null,
      endAt: null,
      participantMode: "teams_or_solo",
      allowSelfCreatedTeams: true,
      maxTeamMembers: null,
      missionOrder: "custom",
      leaderboardVisibility: "visible",
      leaderboardRevealed: false,
      moderationMode: "auto",
      profanityFilter: false,
      collectEmails: false,
      joinCode,
      stats: {
        teamCount: 0,
        participantCount: 0,
        submissionCount: 0,
        missionCount: 0,
      },
    };

    await ref.set({ ...chase, createdAt: now, updatedAt: now });
    const snap = await ref.get();
    return { chase: { id: snap.id, ...snap.data() } };
  });
}

/** The Studio dashboard: chases I own, plus chases I was invited to. */
export async function GET(request: Request) {
  return handler(async () => {
    const caller = await requireCaller(request);
    const db = adminDb();

    // Deliberately single-field queries sorted in memory. Adding orderBy here
    // would demand a composite index, and this is the dashboard — the first
    // page a new organizer sees. It must not 500 on a fresh project whose
    // indexes have not finished building. A person's own chases are few.
    const [owned, invited] = await Promise.all([
      db.collection("chases").where("ownerUid", "==", caller.uid).get(),
      caller.email
        ? db
            .collection("chases")
            .where("collaboratorEmails", "array-contains", caller.email.toLowerCase())
            .get()
        : null,
    ]);

    const byRecency = (a: Chase, b: Chase) =>
      (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0);

    const collaborating = (invited?.docs ?? [])
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Chase)
      .sort(byRecency);

    // An invite is issued against an email before we know the uid. Claim it on
    // first sight so the Firestore rules (which key off uid) start matching.
    await Promise.all(
      collaborating
        .filter((chase) => !chase.collaborators?.[caller.uid])
        .map((chase) =>
          chaseRef(chase.id).update({ [`collaborators.${caller.uid}`]: true }),
        ),
    );

    return {
      owned: owned.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Chase)
        .sort(byRecency),
      collaborating,
    };
  });
}
