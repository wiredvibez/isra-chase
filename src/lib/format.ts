import { formatDistanceToNowStrict, format, isSameDay } from "date-fns";
import type { Stamp } from "@/lib/domain/types";

export function toDate(stamp: Stamp | null | undefined): Date | null {
  if (!stamp) return null;
  try {
    return stamp.toDate();
  } catch {
    return null;
  }
}

export function timeAgo(stamp: Stamp | null | undefined): string {
  const date = toDate(stamp);
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 45_000) return "just now";
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function dateTime(stamp: Stamp | null | undefined): string {
  const date = toDate(stamp);
  return date ? format(date, "d MMM yyyy, HH:mm") : "—";
}

export function shortDateTime(stamp: Stamp | null | undefined): string {
  const date = toDate(stamp);
  if (!date) return "—";
  return isSameDay(date, new Date())
    ? format(date, "HH:mm")
    : format(date, "d MMM, HH:mm");
}

/** Points with a thousands separator and an explicit sign for adjustments. */
export function points(n: number, signed = false): string {
  const formatted = new Intl.NumberFormat("en-US").format(Math.abs(n));
  if (!signed) return new Intl.NumberFormat("en-US").format(n);
  return `${n < 0 ? "−" : "+"}${formatted}`;
}

/** "2 d 4 h left", "12 min left", or "ended". */
export function countdown(toMs: number | null, now = Date.now()): string {
  if (toMs === null) return "";
  const diff = toMs - now;
  if (diff <= 0) return "ended";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ${mins % 60} min left`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h left`;
}

export function distance(metres: number): string {
  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`;
}

export function radiusLabel(metres: number): string {
  return metres < 1000 ? `${metres} m` : `${metres / 1000} km`;
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
