import {
  missionAvailability,
  orderMissions,
  type TeamProgress,
} from "@/lib/domain/availability";
import { textMissionBadge } from "@/lib/domain/grading";
import type {
  CameraConfig,
  Chase,
  Mission,
  MissionType,
  Submission,
  SubmissionStatus,
  Team,
} from "@/lib/domain/types";

/**
 * Participant-safe mission projection.
 *
 * The answer key (`text.acceptedResponses`) and the GPS target coordinates
 * never leave the server — the participant only ever learns the badge and the
 * radius. Locked and draft missions are dropped entirely rather than returned
 * with a flag, because their existence is itself a spoiler.
 */
export interface PlayMission {
  id: string;
  name: string;
  description: string;
  points: number;
  type: MissionType;
  imageUrl: string | null;
  linkUrl: string | null;
  feedVisibility: "shown" | "hidden";
  camera: CameraConfig | null;
  text: { badge: "open" | "exact" | "approximate" } | null;
  gps: { radiusM: number } | null;
  availability: { state: "available" | "expired"; expiresAt: number | null };
  completed: boolean;
  submission: { id: string; status: SubmissionStatus; points: number } | null;
}

/**
 * What a team has done, as far as mission gating is concerned.
 *
 * Any submission occupies the mission's slot — including a rejected one, so a
 * wrong answer still keeps an unlock-on-completion mission closed until the
 * team gets it right (or deletes and retries).
 */
export function teamProgress(
  submissions: Submission[],
  points: number,
): TeamProgress {
  const completed: TeamProgress["completed"] = {};
  for (const submission of submissions) {
    completed[submission.missionId] = {
      correct: submission.status !== "rejected",
    };
  }
  return { points, completed };
}

export function playMissions(
  missions: Mission[],
  chase: Chase,
  team: Pick<Team, "id" | "points">,
  submissions: Submission[],
  now = Date.now(),
): PlayMission[] {
  const progress = teamProgress(submissions, team.points);
  const byMission = new Map(submissions.map((s) => [s.missionId, s]));
  const ordered = orderMissions(missions, chase.missionOrder, team.id);

  const out: PlayMission[] = [];
  for (const mission of ordered) {
    const availability = missionAvailability(mission, chase, progress, now);
    if (availability.state === "draft" || availability.state === "locked") continue;

    const submission = byMission.get(mission.id) ?? null;
    out.push({
      id: mission.id,
      name: mission.name,
      description: mission.description,
      points: mission.points,
      type: mission.type,
      imageUrl: mission.imageUrl ?? null,
      linkUrl: mission.linkUrl ?? null,
      feedVisibility: mission.feedVisibility,
      camera: mission.camera ?? null,
      text: mission.text ? { badge: textMissionBadge(mission.text) } : null,
      gps: mission.gps ? { radiusM: mission.gps.radiusM } : null,
      availability: {
        state: availability.state,
        expiresAt: availability.state === "available" ? availability.expiresAt : null,
      },
      completed: Boolean(submission) && submission?.status !== "rejected",
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            points: submission.points,
          }
        : null,
    });
  }
  return out;
}

/** Which mission ids a team can currently see. Used to detect fresh unlocks. */
export function visibleMissionIds(
  missions: Mission[],
  chase: Chase,
  progress: TeamProgress,
  now = Date.now(),
): Set<string> {
  const ids = new Set<string>();
  for (const mission of missions) {
    const state = missionAvailability(mission, chase, progress, now).state;
    if (state === "available") ids.add(mission.id);
  }
  return ids;
}

/* ------------------------------------------------------- public join views */

export interface PublicChase {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  splashImageUrl: string | null;
  termsUrl: string | null;
  status: Chase["status"];
  timezone: string;
  joinCode: string;
  participantMode: Chase["participantMode"];
  allowSelfCreatedTeams: boolean;
  maxTeamMembers: number | null;
  collectEmails: boolean;
  requiresPassword: boolean;
  startAt: number | null;
  endAt: number | null;
  stats: Chase["stats"];
}

export interface PublicTeam {
  id: string;
  name: string;
  photoUrl: string | null;
  mode: "team" | "solo";
  memberCount: number;
  maxMembers: number | null;
  full: boolean;
  requiresPasscode: boolean;
}

export function publicChase(chase: Chase, requiresPassword: boolean): PublicChase {
  return {
    id: chase.id,
    name: chase.name,
    description: chase.description,
    imageUrl: chase.imageUrl ?? null,
    splashImageUrl: chase.splashImageUrl ?? null,
    termsUrl: chase.termsUrl ?? null,
    status: chase.status,
    timezone: chase.timezone,
    joinCode: chase.joinCode,
    participantMode: chase.participantMode,
    allowSelfCreatedTeams: chase.allowSelfCreatedTeams,
    maxTeamMembers: chase.maxTeamMembers ?? null,
    collectEmails: chase.collectEmails,
    requiresPassword,
    startAt: chase.startAt ? chase.startAt.toMillis() : null,
    endAt: chase.endAt ? chase.endAt.toMillis() : null,
    stats: chase.stats,
  };
}

export function teamCapacity(team: Team, chase: Chase): number | null {
  if (team.mode === "solo") return 1; // solo profiles are single-device
  return team.maxMembers ?? chase.maxTeamMembers ?? null;
}

export function publicTeam(
  team: Team,
  chase: Chase,
  requiresPasscode: boolean,
): PublicTeam {
  const capacity = teamCapacity(team, chase);
  return {
    id: team.id,
    name: team.name,
    photoUrl: team.photoUrl ?? null,
    mode: team.mode,
    memberCount: team.memberCount,
    maxMembers: capacity,
    full: capacity !== null && team.memberCount >= capacity,
    requiresPasscode,
  };
}
