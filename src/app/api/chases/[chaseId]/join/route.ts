import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { joinChaseSchema } from "@/lib/domain/schemas";
import type { Participant, Team } from "@/lib/domain/types";
import { loadChase, loadParticipant, requireCaller } from "@/lib/server/guards";
import { badRequest, conflict, forbidden, handler, notFound, readJson } from "@/lib/server/http";
import { participantsRef, teamsRef } from "@/lib/server/collections";
import { teamCapacity } from "@/lib/server/projections";
import { chaseRef } from "@/lib/server/scoring";
import { loadSecrets, matches, setTeamPasscode } from "@/lib/server/secrets";

export const runtime = "nodejs";

type Params = { params: Promise<{ chaseId: string }> };

/**
 * Join a chase, optionally creating a team on the way in.
 *
 * Follows Goosechase's rule that a correct TEAM passcode bypasses the chase
 * password: the passcode is the stronger secret, and asking for both is the
 * single most common support complaint about their flow.
 */
export async function POST(request: Request, { params }: Params) {
  return handler(async () => {
    const { chaseId } = await params;
    const caller = await requireCaller(request);
    const input = joinChaseSchema.parse(await readJson(request));
    const chase = await loadChase(chaseId);

    // Joining twice is a no-op, not an error: the join link gets re-opened.
    const existing = await loadParticipant(chaseId, caller.uid);
    if (existing) {
      const team = await teamsRef(chaseId).doc(existing.teamId).get();
      return {
        participant: existing,
        team: team.exists ? { id: team.id, ...team.data() } : null,
      };
    }

    if (chase.status === "ended") throw conflict("This chase has already ended.");

    const secrets = await loadSecrets(chaseId);
    const mode = chase.participantMode;

    /* ---------------------------------------------------------- team choice */

    let teamRefDoc = input.teamId ? teamsRef(chaseId).doc(input.teamId) : null;
    let creating: { name: string; mode: "team" | "solo"; passcode: string | null } | null =
      null;

    if (input.teamId) {
      const snap = await teamRefDoc!.get();
      if (!snap.exists) throw notFound("That team doesn't exist any more.");
      const team = { id: snap.id, ...snap.data() } as Team;

      const passcode = secrets.teamPasscodes[team.id] ?? null;
      if (passcode) {
        if (!matches(passcode, input.teamPasscode)) {
          throw forbidden("That team passcode isn't right.");
        }
      } else if (!matches(secrets.password, input.chasePassword)) {
        throw forbidden("That chase password isn't right.");
      }

      if (mode === "teams_only" && team.mode === "solo") {
        throw badRequest("This chase is teams only.");
      }
      if (mode === "solo_only" && team.mode === "team") {
        throw badRequest("This chase is for individuals only.");
      }
    } else {
      if (!matches(secrets.password, input.chasePassword)) {
        throw forbidden("That chase password isn't right.");
      }
      if (mode === "organizer_managed") {
        throw forbidden("The organizer assigns teams in this chase.");
      }

      const wantsTeam = Boolean(input.newTeam);
      if (wantsTeam && !chase.allowSelfCreatedTeams) {
        throw forbidden("Only the organizer can create teams here.");
      }
      if (wantsTeam && mode === "solo_only") {
        throw badRequest("This chase is for individuals only.");
      }
      if (!wantsTeam && mode === "teams_only") {
        throw badRequest("Pick or create a team to join this chase.");
      }

      creating = wantsTeam
        ? {
            name: input.newTeam!.name?.trim() || input.displayName,
            // A "solo" team created from the join form is still a one-seater.
            mode: input.newTeam!.mode === "solo" ? "solo" : "team",
            passcode: input.newTeam!.passcode?.trim() || null,
          }
        : { name: input.displayName, mode: "solo", passcode: null };

      teamRefDoc = teamsRef(chaseId).doc();
    }

    const targetTeam = teamRefDoc!;
    const participantDoc = participantsRef(chaseId).doc(caller.uid);
    const joinedAt = Timestamp.now();

    /* ------------------------------------------------------------ the write */

    await adminDb().runTransaction(async (tx) => {
      // Capacity has to be read inside the transaction or two people racing
      // for the last seat both win it.
      const teamSnap = creating ? null : await tx.get(targetTeam);
      if (!creating && !teamSnap?.exists) {
        throw notFound("That team doesn't exist any more.");
      }

      if (teamSnap) {
        const team = { id: teamSnap.id, ...teamSnap.data() } as Team;
        const capacity = teamCapacity(team, chase);
        if (capacity !== null && team.memberCount >= capacity) {
          throw conflict(`"${team.name}" is full.`);
        }
      }

      const participant: Omit<Participant, "uid"> = {
        chaseId,
        teamId: targetTeam.id,
        displayName: input.displayName,
        photoURL: input.photoURL ?? null,
        email: chase.collectEmails ? (input.email ?? caller.email ?? null) : null,
        submissionCount: 0,
        lastSubmissionAt: null,
        joinedAt,
      };
      tx.set(participantDoc, participant);

      if (creating) {
        const team: Omit<Team, "id"> = {
          chaseId,
          name: creating.name,
          photoUrl: input.newTeam?.photoUrl ?? null,
          // Passcodes live in private/settings, never on the readable team doc.
          passcode: null,
          hasPasscode: Boolean(creating.passcode),
          mode: creating.mode,
          maxMembers:
            creating.mode === "solo" ? 1 : (input.newTeam?.maxMembers ?? null),
          memberCount: 1,
          createdBy: "participant",
          basePoints: 0,
          bonusPoints: 0,
          points: 0,
          submissionCount: 0,
          lastSubmissionAt: null,
          createdAt: joinedAt,
        };
        tx.set(targetTeam, team);
      } else {
        tx.update(targetTeam, { memberCount: FieldValue.increment(1) });
      }

      tx.update(chaseRef(chaseId), {
        "stats.participantCount": FieldValue.increment(1),
        ...(creating ? { "stats.teamCount": FieldValue.increment(1) } : {}),
      });
    });

    if (creating?.passcode) {
      await setTeamPasscode(chaseId, targetTeam.id, creating.passcode);
    }

    const [participantSnap, teamSnap] = await Promise.all([
      participantDoc.get(),
      targetTeam.get(),
    ]);

    return {
      participant: { uid: participantSnap.id, ...participantSnap.data() },
      team: { id: teamSnap.id, ...teamSnap.data() },
    };
  });
}
