import type { Timestamp } from "firebase/firestore";

/** Firestore timestamps arrive as Timestamp on the client and as the Admin
 *  SDK's own Timestamp on the server; both expose toMillis(). */
export interface TimeLike {
  toMillis(): number;
  toDate(): Date;
}
export type Stamp = Timestamp | TimeLike;

/* ------------------------------------------------------------------ users */

export interface UserDoc {
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  createdAt: Stamp;
  updatedAt: Stamp;
}

/* ----------------------------------------------------------------- chases */

export type ChaseStatus = "draft" | "scheduled" | "live" | "ended";

export type ParticipantMode =
  | "teams_or_solo"
  | "teams_only"
  | "solo_only"
  | "organizer_managed";

export type MissionOrder = "points" | "alphabetical" | "random" | "custom";

export type LeaderboardVisibility =
  | "visible"
  | "hidden_until_reveal"
  | "hidden_until_end";

/** Goosechase auto-approves everything. "review" is our addition. */
export type ModerationMode = "auto" | "review";

export interface ChaseLocation {
  label: string;
  lat: number;
  lng: number;
}

export interface Chase {
  id: string;
  ownerUid: string;
  workspaceId: string | null;
  /** Flat co-owner role, as Goosechase's single Collaborator role. */
  collaborators: Record<string, true>;
  collaboratorEmails: string[];

  name: string;
  /** Goosechase caps this at 200 characters. */
  description: string;
  imageUrl: string | null;
  location: ChaseLocation | null;

  /**
   * The join password is NOT stored here — any signed-in user can read a chase
   * document, so it lives in `chases/{id}/private/settings`, which the rules
   * restrict to organizers. This flag is the safe, public projection.
   */
  hasPassword: boolean;
  /** Populated only on organizer-facing API responses, never in a snapshot. */
  password?: string | null;
  searchVisibility: "hidden" | "public";

  splashImageUrl: string | null;
  termsUrl: string | null;

  /** Captured from the creator's device at creation and then locked. */
  timezone: string;

  status: ChaseStatus;
  startMode: "now" | "scheduled";
  startAt: Stamp | null;
  endAt: Stamp | null;

  participantMode: ParticipantMode;
  allowSelfCreatedTeams: boolean;
  maxTeamMembers: number | null;

  missionOrder: MissionOrder;
  leaderboardVisibility: LeaderboardVisibility;
  leaderboardRevealed: boolean;

  /** Beyond Goosechase: optional manual review queue. */
  moderationMode: ModerationMode;
  profanityFilter: boolean;
  collectEmails: boolean;

  joinCode: string;

  stats: {
    teamCount: number;
    participantCount: number;
    submissionCount: number;
    missionCount: number;
  };

  createdAt: Stamp;
  updatedAt: Stamp;
}

/* --------------------------------------------------------------- missions */

export type MissionType = "camera" | "text" | "gps";

export type CameraAccepts = "photos" | "videos" | "both";
export type CameraSources = "live_and_library" | "live_only";

/** Goosechase exposes exactly these eight radii. */
export const GPS_RADII = [25, 50, 100, 250, 500, 1000, 2000, 5000] as const;
export type GpsRadius = (typeof GPS_RADII)[number];

export interface CameraConfig {
  accepts: CameraAccepts;
  sources: CameraSources;
  /** Seconds; Goosechase caps video at 30. */
  maxVideoSeconds: number;
}

export interface TextConfig {
  /** Empty ⇒ open-ended: anything is accepted. */
  acceptedResponses: string[];
  approximate: boolean;
}

export interface GpsConfig {
  lat: number;
  lng: number;
  radiusM: GpsRadius;
  address: string | null;
}

export type ReleaseRule =
  | { kind: "chase_start" }
  | { kind: "relative"; anchor: "start" | "end"; offsetMs: number }
  | { kind: "specific"; at: Stamp }
  | { kind: "mission"; missionId: string; requireCorrect: boolean }
  | { kind: "points"; points: number };

export type ExpiryRule =
  | { kind: "chase_end" }
  | { kind: "relative"; anchor: "start" | "end"; offsetMs: number }
  | { kind: "specific"; at: Stamp };

export interface Mission {
  id: string;
  chaseId: string;
  name: string;
  description: string;
  points: number;
  type: MissionType;

  imageUrl: string | null;
  linkUrl: string | null;

  /** Hidden missions keep submissions out of the cross-team feed. */
  feedVisibility: "shown" | "hidden";

  /** Built but not yet published to participants. */
  isDraft: boolean;
  order: number;

  camera: CameraConfig | null;
  text: TextConfig | null;
  gps: GpsConfig | null;

  release: ReleaseRule;
  expiry: ExpiryRule;

  createdAt: Stamp;
  updatedAt: Stamp;
}

/* ------------------------------------------------------------------ teams */

export interface Team {
  id: string;
  chaseId: string;
  name: string;
  photoUrl: string | null;
  /** Like the chase password, the real passcode lives in private/settings. */
  hasPasscode: boolean;
  /** Populated only on organizer-facing API responses, never in a snapshot. */
  passcode?: string | null;
  mode: "team" | "solo";
  maxMembers: number | null;
  memberCount: number;
  createdBy: "organizer" | "participant";

  /** Denormalised totals, written only by the server. */
  basePoints: number;
  bonusPoints: number;
  points: number;
  submissionCount: number;
  /** Drives the "who got there first" tie-break. */
  lastSubmissionAt: Stamp | null;

  createdAt: Stamp;
}

export interface Participant {
  uid: string;
  chaseId: string;
  teamId: string;
  displayName: string;
  photoURL: string | null;
  email: string | null;
  submissionCount: number;
  lastSubmissionAt: Stamp | null;
  joinedAt: Stamp;
}

/* ------------------------------------------------------------ submissions */

export type SubmissionStatus = "approved" | "rejected" | "pending";

export interface SubmissionMedia {
  url: string;
  path: string;
  kind: "image" | "video" | "audio";
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
  /**
   * Videos only, and only when the container could be read. A phone will hand
   * over a perfectly valid clip with no audio track — a time-lapse or a
   * slow-mo has none — so this is recorded and shown rather than letting a
   * silent video look like a playback fault.
   */
  hasAudio?: boolean;
}

export interface Submission {
  id: string;
  chaseId: string;
  missionId: string;
  missionName: string;
  missionType: MissionType;
  teamId: string;
  teamName: string;
  participantUid: string;
  participantName: string;

  status: SubmissionStatus;
  caption: string | null;

  media: SubmissionMedia | null;
  textAnswer: string | null;
  location: {
    lat: number;
    lng: number;
    accuracyM: number | null;
    distanceM: number;
  } | null;

  /** Base points actually awarded (0 while pending or rejected). */
  points: number;
  bonusPoints: number;

  /** Why the auto-grader decided what it decided. */
  autoGraded: boolean;
  gradeReason: string | null;

  likeCount: number;

  /**
   * Denormalised from the mission's `feedVisibility`, because Firestore rules
   * cannot join across documents and the feed query has to be gated on it.
   */
  feedVisible: boolean;

  /** Moderation. Hidden keeps it out of the feed without deleting it. */
  hidden: boolean;
  flagged: boolean;
  flagReason: string | null;
  reviewedByUid: string | null;
  reviewedAt: Stamp | null;
  reviewNote: string | null;

  createdAt: Stamp;
}

/* ------------------------------------------------- adjustments (audit log) */

export interface Adjustment {
  id: string;
  chaseId: string;
  teamId: string;
  /** Set when the bonus was attached to a specific submission. */
  submissionId: string | null;
  points: number;
  reason: string | null;
  byUid: string;
  byName: string;
  createdAt: Stamp;
  editedAt: Stamp | null;
}

/* ------------------------------------------------------------- broadcasts */

export type BroadcastSchedule =
  | { kind: "now" }
  | { kind: "before_start"; offsetMs: number }
  | { kind: "at_start" }
  | { kind: "during_relative"; anchor: "start" | "end"; offsetMs: number }
  | { kind: "during_specific"; at: Stamp }
  | { kind: "at_end" }
  | { kind: "after_end"; offsetMs: number };

export interface Broadcast {
  id: string;
  chaseId: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  /** null audience ⇒ everyone. */
  teamIds: string[] | null;
  schedule: BroadcastSchedule;
  status: "scheduled" | "sent";
  sentAt: Stamp | null;
  createdByUid: string;
  createdByName: string;
  createdAt: Stamp;
}

/* ---------------------------------------------------------- notifications */

export type NotificationType =
  | "bonus"
  | "submission_deleted"
  | "submission_approved"
  | "submission_rejected"
  | "mission_unlocked"
  | "broadcast"
  | "adjustment";

export interface AppNotification {
  id: string;
  chaseId: string;
  /** null ⇒ everyone in the chase. */
  teamId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl: string | null;
  readBy: Record<string, true>;
  createdAt: Stamp;
}

/* --------------------------------------------------------------- reports  */

export interface SubmissionReport {
  id: string;
  chaseId: string;
  submissionId: string;
  reason: string;
  byUid: string;
  byName: string;
  status: "open" | "dismissed" | "actioned";
  createdAt: Stamp;
}
