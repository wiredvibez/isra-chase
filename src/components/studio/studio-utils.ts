"use client";

import { toast } from "sonner";
import { ApiClientError } from "@/lib/api-client";
import type {
  BroadcastSchedule,
  Chase,
  ExpiryRule,
  MissionOrder,
  MissionType,
  ParticipantMode,
  ReleaseRule,
  Stamp,
} from "@/lib/domain/types";

/* ------------------------------------------------------------------ errors */

export function toastError(error: unknown, fallback = "משהו השתבש.") {
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
  if (days) bits.push(days === 1 ? "יום" : `${days} ימים`);
  if (hours) bits.push(hours === 1 ? "שעה" : `${hours} שע'`);
  if (minutes || !bits.length) bits.push(minutes === 1 ? "דקה" : `${minutes} דק'`);
  return bits.join(" ");
}

/** "נשארו 2 ימים 4 שע'" — the ticking label beside a live chase. */
export function countdownLabel(toMs: number | null, now = Date.now()): string {
  if (toMs === null) return "";
  const diff = toMs - now;
  if (diff <= 0) return "הסתיים";
  const mins = Math.floor(diff / MINUTE);
  if (mins < 1) return "נשארה פחות מדקה";
  if (mins < 60) return mins === 1 ? "נשארה דקה" : `נשארו ${mins} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `נשארו ${hours} שע' ${mins % 60} דק'`;
  const days = Math.floor(hours / 24);
  return days === 1
    ? `נשארו יום ו-${hours % 24} שע'`
    : `נשארו ${days} ימים ו-${hours % 24} שע'`;
}

/** "250 מ'" / "5 ק"מ" — the accept radius of a GPS mission. */
export function radiusLabel(metres: number): string {
  return metres < 1000 ? `${metres} מ'` : `${metres / 1000} ק"מ`;
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

/* --------------------------------------------------------------- bidi/time */

/**
 * Wraps a Latin/numeric run in a Unicode isolate so it keeps its own order
 * inside the Hebrew, RTL UI — the string equivalent of <span dir="ltr">.
 */
export function ltr(text: string): string {
  return `\u2066${text}\u2069`;
}

/** "20.9.2026, 19:44" — a timestamp in Hebrew, isolated so RTL cannot flip it. */
export function msLabel(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return "—";
  return ltr(
    new Date(ms).toLocaleString("he-IL", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}

export function dateTimeLabel(stamp: Stamp | null | undefined): string {
  return msLabel(stampMs(stamp));
}

/* ------------------------------------------------------------------ labels */

export const STATUS_TONE = {
  draft: "neutral",
  scheduled: "info",
  live: "success",
  ended: "warning",
} as const;

export const STATUS_LABEL: Record<Chase["status"], string> = {
  draft: "טיוטה",
  scheduled: "מתוזמן",
  live: "באוויר",
  ended: "הסתיים",
};

export const MISSION_TYPE_LABEL: Record<MissionType, string> = {
  camera: "צילום",
  text: "טקסט",
  gps: "מיקום",
};

/** The badge on a text mission, per the glossary. */
export const TEXT_BADGE_LABEL: Record<"open" | "exact" | "approximate", string> = {
  open: "תשובה חופשית",
  exact: "התאמה מדויקת",
  approximate: "בערך מספיק",
};

export const MISSION_ORDER_LABEL: Record<MissionOrder, string> = {
  custom: "מותאם אישית",
  points: "לפי ניקוד",
  alphabetical: "לפי א־ב",
  random: "אקראי לכל קבוצה",
};

export const PARTICIPANT_MODE_LABEL: Record<ParticipantMode, string> = {
  teams_or_solo: "קבוצות או משתתפים יחידים",
  teams_only: "קבוצות בלבד",
  solo_only: "משתתפים יחידים בלבד",
  organizer_managed: "רק קבוצות שהמארגן יצר",
};

export const PARTICIPANT_MODE_HINT: Record<ParticipantMode, string> = {
  teams_or_solo: "כל שחקן בוחר אם להצטרף לקבוצה או לשחק לבד.",
  teams_only: "כולם חייבים להיות בקבוצה.",
  solo_only: "כל אחד משחק בפרופיל אישי משלו.",
  organizer_managed: "אפשר להצטרף רק לקבוצות שאתם יצרתם.",
};

/** The badge Goosechase shows on a text mission. */
export function textBadge(
  accepted: string[],
  approximate: boolean,
): "open" | "exact" | "approximate" {
  if (!accepted.filter((r) => r.trim()).length) return "open";
  return approximate ? "approximate" : "exact";
}

/** "לפני תחילת המרדף" / "אחרי סיום המרדף" and the like. */
function anchorPhrase(anchor: "start" | "end", offsetMs: number): string {
  const when = offsetMs < 0 ? "לפני" : "אחרי";
  return `${when} ${anchor === "start" ? "תחילת המרדף" : "סיום המרדף"}`;
}

export function releaseSummary(release: ReleaseRule): string {
  switch (release.kind) {
    case "chase_start":
      return "נפתחת עם תחילת המרדף";
    case "relative":
      return `נפתחת ${durationLabel(release.offsetMs)} ${anchorPhrase(release.anchor, release.offsetMs)}`;
    case "specific":
      return "נפתחת בשעה מסוימת";
    case "mission":
      return release.requireCorrect
        ? "נפתחת אחרי שמשימה אחרת נענתה נכון"
        : "נפתחת אחרי שמשימה אחרת הושלמה";
    case "points":
      return `נפתחת ב-${release.points} נקודות`;
  }
}

export function expirySummary(expiry: ExpiryRule): string {
  switch (expiry.kind) {
    case "chase_end":
      return "נסגרת עם סיום המרדף";
    case "relative":
      return `נסגרת ${durationLabel(expiry.offsetMs)} ${anchorPhrase(expiry.anchor, expiry.offsetMs)}`;
    case "specific":
      return "נסגרת בשעה מסוימת";
  }
}

export function broadcastScheduleSummary(schedule: BroadcastSchedule): string {
  switch (schedule.kind) {
    case "now":
      return "מיד";
    case "before_start":
      return `${durationLabel(schedule.offsetMs)} לפני תחילת המרדף`;
    case "at_start":
      return "עם תחילת המרדף";
    case "during_relative":
      return `${durationLabel(schedule.offsetMs)} ${anchorPhrase(schedule.anchor, schedule.offsetMs)}`;
    case "during_specific":
      return "בשעה מסוימת";
    case "at_end":
      return "עם סיום המרדף";
    case "after_end":
      return `${durationLabel(schedule.offsetMs)} אחרי סיום המרדף`;
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
