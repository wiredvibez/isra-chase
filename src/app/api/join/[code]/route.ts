import type { Team } from "@/lib/domain/types";
import { loadChase, requireCaller } from "@/lib/server/guards";
import { handler, notFound } from "@/lib/server/http";
import { joinCodeRef, teamsRef } from "@/lib/server/collections";
import { publicChase, publicTeam } from "@/lib/server/projections";
import { loadSecrets } from "@/lib/server/secrets";

export const runtime = "nodejs";

type Params = { params: Promise<{ code: string }> };

/**
 * Resolve a join code to the lobby view. Everything here is deliberately
 * secret-free: the chase password and team passcodes are reduced to booleans,
 * because this is the one endpoint an un-joined stranger can reach.
 */
export async function GET(request: Request, { params }: Params) {
  return handler(async () => {
    const { code } = await params;
    await requireCaller(request);

    const snap = await joinCodeRef(code).get();
    const chaseId = snap.data()?.chaseId as string | undefined;
    if (!chaseId) throw notFound("That join code doesn't match a chase.");

    const chase = await loadChase(chaseId);
    const [teams, secrets] = await Promise.all([
      teamsRef(chaseId).orderBy("name", "asc").get(),
      loadSecrets(chaseId),
    ]);

    return {
      chase: publicChase(chase, Boolean(secrets.password)),
      teams: teams.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Team)
        .map((team) =>
          publicTeam(team, chase, Boolean(secrets.teamPasscodes[team.id])),
        ),
    };
  });
}
