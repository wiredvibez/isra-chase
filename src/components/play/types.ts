/**
 * Participant-facing shapes.
 *
 * These mirror the projections documented in API_CONTRACT.md rather than the
 * Firestore documents in `@/lib/domain/types`: the API deliberately strips the
 * answer key, the GPS target and locked missions before they reach a player's
 * browser, so the play surface must never assume it has the full document.
 *
 * Anything that arrives as JSON also loses its Firestore `Timestamp` methods,
 * which is why nothing here is typed as `Stamp` — timestamps are only ever
 * read from the live Firestore subscriptions, never from an API response.
 */
import type {
  CameraConfig,
  ChaseStatus,
  LeaderboardVisibility,
  MissionType,
  ParticipantMode,
  SubmissionStatus,
} from "@/lib/domain/types";

export type TextBadge = "open" | "exact" | "approximate";

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
  text: { badge: TextBadge } | null;
  gps: { radiusM: number } | null;
  availability: { state: "available" | "expired"; expiresAt: number | null };
  completed: boolean;
  submission: { id: string; status: SubmissionStatus; points: number } | null;
}

/** The join-code preview. Passwords and passcodes are reduced to booleans. */
export interface PublicChase {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  splashImageUrl: string | null;
  status: ChaseStatus;
  joinCode: string;
  participantMode: ParticipantMode;
  allowSelfCreatedTeams: boolean;
  maxTeamMembers: number | null;
  requiresPassword: boolean;
  leaderboardVisibility?: LeaderboardVisibility;
  termsUrl?: string | null;
  startAtMs?: number | null;
  endAtMs?: number | null;
}

export interface PublicTeam {
  id: string;
  name: string;
  photoUrl: string | null;
  mode: "team" | "solo";
  memberCount: number;
  maxMembers: number | null;
  requiresPasscode: boolean;
}

export interface JoinPreview {
  chase: PublicChase;
  teams: PublicTeam[];
}

/**
 * The grading result returned alongside a new submission. The contract names
 * the field but not its shape, so every property is optional and the UI falls
 * back to the (fully specified) submission document it comes with.
 */
export interface SubmissionVerdict {
  status?: SubmissionStatus;
  correct?: boolean;
  points?: number;
  bonusPoints?: number;
  gradeReason?: string | null;
  distanceM?: number | null;
  withinRadius?: boolean;
  radiusM?: number | null;
}

/** JSON-serialised submission: identical to `Submission` minus the timestamps. */
export interface SubmissionResponse {
  id: string;
  missionId: string;
  missionName: string;
  missionType: MissionType;
  status: SubmissionStatus;
  points: number;
  bonusPoints: number;
  gradeReason: string | null;
  caption: string | null;
  location: {
    lat: number;
    lng: number;
    accuracyM: number | null;
    distanceM: number;
  } | null;
}

export interface CreateSubmissionResponse {
  submission: SubmissionResponse;
  verdict?: SubmissionVerdict;
}

/**
 * The missions endpoint is documented as returning `PlayMission[]`, but not
 * whether it is wrapped in an envelope. Accept either, so whichever shape the
 * API agent ships, the player still sees their missions.
 */
export function unwrapMissions(payload: unknown): PlayMission[] {
  if (Array.isArray(payload)) return payload as PlayMission[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.missions)) return record.missions as PlayMission[];
    if (Array.isArray(record.data)) return record.data as PlayMission[];
  }
  return [];
}
