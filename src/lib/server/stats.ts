import { rankTeams } from "@/lib/domain/leaderboard";
import type {
  Chase,
  Mission,
  Participant,
  Stamp,
  Submission,
  Team,
} from "@/lib/domain/types";
import { missionsRef, participantsRef, submissionsRef, teamsRef } from "./collections";

const millis = (stamp: Stamp | null | undefined) => (stamp ? stamp.toMillis() : null);

export interface StatsTiles {
  activeTeams: number;
  totalTeams: number;
  participants: number;
  submissions: number;
  approvedSubmissions: number;
  /** Approved submissions as a share of every team × every live mission. */
  missionCompletionPct: number;
}

export interface BarDatum {
  id: string;
  label: string;
  value: number;
}

export interface ParticipantRow {
  uid: string;
  displayName: string;
  email: string | null;
  teamId: string;
  teamName: string;
  submissions: number;
  teamPoints: number;
  joinedAt: number | null;
  lastSubmissionAt: number | null;
}

export interface SubmissionRow {
  id: string;
  missionId: string;
  missionName: string;
  missionType: Submission["missionType"];
  teamId: string;
  teamName: string;
  participantName: string;
  status: Submission["status"];
  points: number;
  bonusPoints: number;
  textAnswer: string | null;
  caption: string | null;
  distanceM: number | null;
  mediaUrl: string | null;
  likeCount: number;
  flagged: boolean;
  hidden: boolean;
  gradeReason: string | null;
  createdAt: number | null;
}

export interface LeaderboardRow {
  rank: number;
  teamId: string;
  name: string;
  points: number;
  basePoints: number;
  bonusPoints: number;
  submissions: number;
  members: number;
  tied: boolean;
  lastSubmissionAt: number | null;
}

export interface ChaseStats {
  tiles: StatsTiles;
  popularMissions: BarDatum[];
  engagedTeams: BarDatum[];
  participants: ParticipantRow[];
  submissions: SubmissionRow[];
  leaderboard: LeaderboardRow[];
}

/**
 * One pass over the whole chase. Every number here is derived rather than
 * denormalised, so the Stats tab is also the check on the incremental
 * counters the scoring engine maintains.
 */
export async function collectStats(chaseId: string): Promise<ChaseStats> {
  const [missionSnap, teamSnap, participantSnap, submissionSnap] = await Promise.all([
    missionsRef(chaseId).get(),
    teamsRef(chaseId).get(),
    participantsRef(chaseId).get(),
    submissionsRef(chaseId).get(),
  ]);

  const missions = missionSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Mission);
  const teams = teamSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  const participants = participantSnap.docs.map(
    (d) => ({ uid: d.id, ...d.data() }) as Participant,
  );
  const submissions = submissionSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Submission,
  );

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const approved = submissions.filter((s) => s.status === "approved");

  const perMission = new Map<string, number>();
  const perTeam = new Map<string, number>();
  const activeTeams = new Set<string>();
  for (const submission of approved) {
    perMission.set(submission.missionId, (perMission.get(submission.missionId) ?? 0) + 1);
    perTeam.set(submission.teamId, (perTeam.get(submission.teamId) ?? 0) + 1);
    activeTeams.add(submission.teamId);
  }

  const liveMissions = missions.filter((m) => !m.isDraft);
  const possible = liveMissions.length * teams.length;

  const tiles: StatsTiles = {
    activeTeams: activeTeams.size,
    totalTeams: teams.length,
    participants: participants.length,
    submissions: submissions.length,
    approvedSubmissions: approved.length,
    missionCompletionPct: possible
      ? Math.round((approved.length / possible) * 1000) / 10
      : 0,
  };

  const popularMissions: BarDatum[] = liveMissions
    .map((mission) => ({
      id: mission.id,
      label: mission.name,
      value: perMission.get(mission.id) ?? 0,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 10);

  const engagedTeams: BarDatum[] = teams
    .map((team) => ({
      id: team.id,
      label: team.name,
      value: perTeam.get(team.id) ?? 0,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, 10);

  const participantRows: ParticipantRow[] = participants
    .map((person) => {
      const team = teamsById.get(person.teamId);
      return {
        uid: person.uid,
        displayName: person.displayName,
        email: person.email ?? null,
        teamId: person.teamId,
        teamName: team?.name ?? "(deleted team)",
        submissions: person.submissionCount ?? 0,
        teamPoints: team?.points ?? 0,
        joinedAt: millis(person.joinedAt),
        lastSubmissionAt: millis(person.lastSubmissionAt),
      };
    })
    .sort((a, b) => a.teamName.localeCompare(b.teamName) || a.displayName.localeCompare(b.displayName));

  const submissionRows: SubmissionRow[] = submissions
    .map((submission) => ({
      id: submission.id,
      missionId: submission.missionId,
      missionName: submission.missionName,
      missionType: submission.missionType,
      teamId: submission.teamId,
      teamName: submission.teamName,
      participantName: submission.participantName,
      status: submission.status,
      points: submission.points ?? 0,
      bonusPoints: submission.bonusPoints ?? 0,
      textAnswer: submission.textAnswer ?? null,
      caption: submission.caption ?? null,
      distanceM: submission.location?.distanceM ?? null,
      mediaUrl: submission.media?.url ?? null,
      likeCount: submission.likeCount ?? 0,
      flagged: Boolean(submission.flagged),
      hidden: Boolean(submission.hidden),
      gradeReason: submission.gradeReason ?? null,
      createdAt: millis(submission.createdAt),
    }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const memberCounts = new Map<string, number>();
  for (const person of participants) {
    memberCounts.set(person.teamId, (memberCounts.get(person.teamId) ?? 0) + 1);
  }

  const leaderboard: LeaderboardRow[] = rankTeams(teams).map(({ team, rank, tied }) => ({
    rank,
    teamId: team.id,
    name: team.name,
    points: team.points,
    basePoints: team.basePoints,
    bonusPoints: team.bonusPoints,
    submissions: team.submissionCount,
    members: memberCounts.get(team.id) ?? team.memberCount,
    tied,
    lastSubmissionAt: millis(team.lastSubmissionAt),
  }));

  return {
    tiles,
    popularMissions,
    engagedTeams,
    participants: participantRows,
    submissions: submissionRows,
    leaderboard,
  };
}

/** Kept so the chase's denormalised counters can be reconciled in the UI. */
export function statsDrift(chase: Chase, stats: ChaseStats) {
  return {
    teamCount: stats.tiles.totalTeams - chase.stats.teamCount,
    participantCount: stats.tiles.participants - chase.stats.participantCount,
    submissionCount: stats.tiles.submissions - chase.stats.submissionCount,
  };
}
