"use client";

import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import type {
  BroadcastSchedule,
  Chase,
  ExpiryRule,
  MissionType,
  ParticipantMode,
  ReleaseRule,
  Stamp,
} from "@/lib/domain/types";

/* ------------------------------------------------------------------ errors */

export function toastError(error: unknown, fallback = "Something went wrong.") {
  const message =
    error instanceof ApiClientError || error instanceof Error
      ? error.message || fallback
      : fallback;
  toast.error(message);
  return message;
}

/* ---------------------------------------------------------------- duration */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function stampMs(stamp: Stamp | null | undefined): number | null {
  if (!stamp) return null;
  try {
    return stamp.toMillis();
  } catch {
    return null;
  }
}

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

export function splitDuration(ms: number): DurationParts {
  const total = Math.max(0, Math.round(ms / MINUTE));
  return {
    days: Math.floor(total / (24 * 60)),
    hours: Math.floor((total % (24 * 60)) / 60),
    minutes: total % 60,
  };
}

export function joinDuration(parts: DurationParts): number {
  return parts.days * DAY + parts.hours * HOUR + parts.minutes * MINUTE;
}

export function durationLabel(ms: number): string {
  const { days, hours, minutes } = splitDuration(Math.abs(ms));
  const bits: string[] = [];
  if (days) bits.push(`${days} d`);
  if (hours) bits.push(`${hours} h`);
  if (minutes || !bits.length) bits.push(`${minutes} min`);
  return bits.join(" ");
}

/* -------------------------------------------------- <input type=datetime> */

/**
 * `datetime-local` speaks the browser's local clock, which is why the chase
 * timezone is captured once and shown read-only: organizers editing from
 * another timezone would otherwise silently shift every schedule.
 */
export function toLocalInput(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/* ------------------------------------------------------------------ labels */

export const STATUS_TONE = {
  draft: "neutral",
  scheduled: "info",
  live: "success",
  ended: "warning",
} as const;

export const STATUS_LABEL: Record<Chase["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
};

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  camera: "Camera",
  text: "Text",
  gps: "GPS",
};

export const PARTICIPANT_MODE_LABEL: Record<ParticipantMode, string> = {
  teams_or_solo: "Teams or individuals",
  teams_only: "Teams only",
  solo_only: "Individuals only",
  organizer_managed: "Organizer-managed teams only",
};

export const PARTICIPANT_MODE_HINT: Record<ParticipantMode, string> = {
  teams_or_solo: "Players choose to join a team or play solo.",
  teams_only: "Everyone must be on a team.",
  solo_only: "Everyone plays as their own one-person profile.",
  organizer_managed: "Players can only join teams you created.",
};

/** The badge Goosechase shows on a text mission. */
export function textBadge(
  accepted: string[],
  approximate: boolean,
): "open" | "exact" | "approximate" {
  if (!accepted.filter((r) => r.trim()).length) return "open";
  return approximate ? "approximate" : "exact";
}

export function releaseSummary(release: ReleaseRule): string {
  switch (release.kind) {
    case "chase_start":
      return "At chase start";
    case "relative":
      return `${durationLabel(release.offsetMs)} ${release.offsetMs < 0 ? "before" : "after"} ${release.anchor}`;
    case "specific":
      return "At a specific time";
    case "mission":
      return release.requireCorrect
        ? "After another mission is answered correctly"
        : "After another mission is completed";
    case "points":
      return `At ${release.points} points`;
  }
}

export function expirySummary(expiry: ExpiryRule): string {
  switch (expiry.kind) {
    case "chase_end":
      return "At chase end";
    case "relative":
      return `${durationLabel(expiry.offsetMs)} ${expiry.offsetMs < 0 ? "before" : "after"} ${expiry.anchor}`;
    case "specific":
      return "At a specific time";
  }
}

export function broadcastScheduleSummary(schedule: BroadcastSchedule): string {
  switch (schedule.kind) {
    case "now":
      return "Immediately";
    case "before_start":
      return `${durationLabel(schedule.offsetMs)} before the chase starts`;
    case "at_start":
      return "When the chase starts";
    case "during_relative":
      return `${durationLabel(schedule.offsetMs)} ${schedule.offsetMs < 0 ? "before" : "after"} the ${schedule.anchor}`;
    case "during_specific":
      return "At a specific time";
    case "at_end":
      return "When the chase ends";
    case "after_end":
      return `${durationLabel(schedule.offsetMs)} after the chase ends`;
  }
}

/** Slugify for Storage object names, which must be a single path segment. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-60);
  return `${Date.now()}-${cleaned || "file"}`;
}

export function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadTextFile(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
