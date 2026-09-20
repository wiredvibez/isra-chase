# Isra Chase — API contract

All handlers live under `src/app/api/`, run on the Node.js runtime, and use
the Admin SDK. Auth comes from the `isra_session` httpOnly cookie or an
`Authorization: Bearer <firebase id token>` header (see `src/lib/server/guards.ts`).

Errors are always `{ error: string, code: string }` with a 4xx/5xx status.
Successful mutations return the affected resource, or `{ ok: true }`.

Request bodies are validated with the Zod schemas in
`src/lib/domain/schemas.ts` — the schema name is given for each route.

## Chases

| Method | Path | Guard | Body schema | Returns |
|---|---|---|---|---|
| POST | `/api/chases` | signed in | `createChaseSchema` | `{ chase }` |
| GET | `/api/chases` | signed in | — | `{ owned: Chase[], collaborating: Chase[] }` |
| GET | `/api/chases/[chaseId]` | member | — | `{ chase, organizer: boolean }` |
| PATCH | `/api/chases/[chaseId]` | organizer | `updateChaseSchema` | `{ chase }` |
| DELETE | `/api/chases/[chaseId]` | **owner** | — | `{ ok }` |
| POST | `/api/chases/[chaseId]/schedule` | organizer | `chaseScheduleSchema` | `{ chase }` |
| POST | `/api/chases/[chaseId]/duplicate` | organizer | — | `{ chase }` |
| POST | `/api/chases/[chaseId]/collaborators` | organizer | `collaboratorSchema` | `{ chase }` |
| DELETE | `/api/chases/[chaseId]/collaborators/[uid]` | organizer | — | `{ chase }` |
| POST | `/api/chases/[chaseId]/recompute` | organizer | — | `{ teams: number }` |

`schedule` actions: `go_live` (requires `endAtMs`), `schedule` (requires both),
`end`, `update_end`, and `reset` — which returns an ended chase to `draft`
while preserving participants, submissions and points.

## Missions

| Method | Path | Guard | Body schema | Returns |
|---|---|---|---|---|
| GET | `/api/chases/[chaseId]/missions?as=play` | member | — | organizer: full `Mission[]`; participant: `PlayMission[]` |
| POST | `/api/chases/[chaseId]/missions` | organizer | `missionInputSchema` | `{ mission }` |
| PATCH | `/api/chases/[chaseId]/missions/[missionId]` | organizer | `missionInputSchema.partial()` | `{ mission }` |
| DELETE | `/api/chases/[chaseId]/missions/[missionId]` | organizer | — | `{ ok }` — also deletes its submissions and reverses their points |
| POST | `/api/chases/[chaseId]/missions/[missionId]/duplicate` | organizer | — | `{ mission }` |
| POST | `/api/chases/[chaseId]/missions/reorder` | organizer | `reorderMissionsSchema` | `{ ok }` |

The response envelope is `{ missions, organizer }`. A participant **always**
receives the `PlayMission[]` projection — `?as=play` only affects an organizer
who has also joined as a player, letting them see what their participants see.

**`PlayMission`** is the participant-safe projection. It NEVER includes
`text.acceptedResponses` or `gps.lat/lng`, and locked missions are omitted
entirely:

```ts
type PlayMission = {
  id: string; name: string; description: string; points: number;
  type: MissionType; imageUrl: string | null; linkUrl: string | null;
  feedVisibility: "shown" | "hidden";
  camera: CameraConfig | null;
  text: { badge: "open" | "exact" | "approximate" } | null;
  gps: { radiusM: number } | null;
  availability: { state: "available" | "expired"; expiresAt: number | null };
  completed: boolean;
  submission: { id: string; status: SubmissionStatus; points: number } | null;
};
```

## Teams and participants

| Method | Path | Guard | Body schema | Returns |
|---|---|---|---|---|
| GET | `/api/join/[code]` | signed in | — | `{ chase: PublicChase, teams: PublicTeam[] }` |
| POST | `/api/chases/[chaseId]/join` | signed in | `joinChaseSchema` | `{ participant, team }` |

Joining solo means sending `newTeam: { name, mode: "solo" }` (or omitting
`newTeam` entirely). The handler decides team-vs-solo from the **mode**, not
from whether `newTeam` was sent, so a solo join is never blocked by
`allowSelfCreatedTeams` or by a `solo_only` chase.
| POST | `/api/chases/[chaseId]/leave` | participant | — | `{ ok }` |
| POST | `/api/chases/[chaseId]/teams` | organizer | `createTeamSchema` | `{ team }` |
| PATCH | `/api/chases/[chaseId]/teams/[teamId]` | organizer | `updateTeamSchema` | `{ team }` |
| DELETE | `/api/chases/[chaseId]/teams/[teamId]` | organizer | — | `{ ok }` — removes members, submissions and points |
| POST | `/api/chases/[chaseId]/participants/[uid]/move` | organizer | `moveParticipantSchema` | `{ participant }` |
| DELETE | `/api/chases/[chaseId]/participants/[uid]` | organizer | — | `{ ok }` |

`PublicChase`/`PublicTeam` omit the password and passcodes; they expose only
`requiresPassword: boolean` and `requiresPasscode: boolean`.

## Submissions

| Method | Path | Guard | Body schema | Returns |
|---|---|---|---|---|
| POST | `/api/chases/[chaseId]/submissions` | participant | `createSubmissionSchema` | `{ submission, verdict }` |
| PATCH | `/api/chases/[chaseId]/submissions/[id]` | organizer | `moderateSubmissionSchema` | `{ submission }` |
| DELETE | `/api/chases/[chaseId]/submissions/[id]` | organizer or own team | `deleteSubmissionSchema` | `{ ok }` |
| POST | `/api/chases/[chaseId]/submissions/[id]/like` | participant | — | `{ liked, likeCount }` (toggles) |
| POST | `/api/chases/[chaseId]/submissions/[id]/bonus` | organizer | `bonusSchema` | `{ adjustment }` |
| POST | `/api/chases/[chaseId]/submissions/[id]/report` | participant | `reportSubmissionSchema` | `{ ok }` |

Submitting enforces **one submission per mission per team**, grades text and
GPS server-side, honours the chase's `moderationMode` (`auto` approves
immediately; `review` leaves it `pending` and awards no points yet), and
awards `mission.points` on approval.

## Scores, broadcasts, stats

| Method | Path | Guard | Body schema | Returns |
|---|---|---|---|---|
| POST | `/api/chases/[chaseId]/adjustments` | organizer | `adjustmentSchema` | `{ adjustment }` |
| PATCH | `/api/chases/[chaseId]/adjustments/[id]` | organizer | `updateAdjustmentSchema` | `{ adjustment }` |
| DELETE | `/api/chases/[chaseId]/adjustments/[id]` | organizer | — | `{ ok }` |
| POST | `/api/chases/[chaseId]/broadcasts` | organizer | `broadcastSchema` | `{ broadcast }` |
| PATCH | `/api/chases/[chaseId]/broadcasts/[id]` | organizer | `broadcastSchema.partial()` | `{ broadcast }` |
| DELETE | `/api/chases/[chaseId]/broadcasts/[id]` | organizer | — | `{ ok }` |
| GET | `/api/chases/[chaseId]/stats` | organizer | — | `{ tiles, popularMissions, engagedTeams, participants, submissions }` |
| GET | `/api/chases/[chaseId]/export?report=participants\|submissions\|leaderboard&format=csv\|xlsx\|json` | organizer | — | file download |
| POST | `/api/chases/[chaseId]/tick` | member | — | materialises due broadcasts into notifications; called on read |

## Client helper

Use `api`/`apiGet`/`apiPost`/`apiPatch`/`apiDelete` from `src/lib/api-client.ts`.
They attach the bearer token and throw `ApiClientError` with a usable `.message`.
