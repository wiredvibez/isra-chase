import { format, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import type { Stamp } from "@/lib/domain/types";

export function toDate(stamp: Stamp | null | undefined): Date | null {
  if (!stamp) return null;
  try {
    return stamp.toDate();
  } catch {
    return null;
  }
}

/**
 * Relative time, written the way people speak rather than by rule.
 * date-fns's Hebrew locale is correct but stiff ("לפני 3 דקות" is fine,
 * "פחות מדקה" is not what a 13-year-old reads), so the short ranges are
 * spelled out here and only the long tail defers to the library.
 */
export function timeAgo(stamp: Stamp | null | undefined): string {
  const date = toDate(stamp);
  if (!date) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 45) return "ממש עכשיו";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "לפני דקה" : `לפני ${minutes} דק'`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "לפני שעה" : `לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "אתמול" : `לפני ${days} ימים`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return weeks === 1 ? "לפני שבוע" : `לפני ${weeks} שבועות`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "לפני חודש" : `לפני ${months} חודשים`;
  const years = Math.round(days / 365);
  return years === 1 ? "לפני שנה" : `לפני ${years} שנים`;
}

export function dateTime(stamp: Stamp | null | undefined): string {
  const date = toDate(stamp);
  return date ? format(date, "d MMM yyyy, HH:mm", { locale: he }) : "—";
}

export function shortDateTime(stamp: Stamp | null | undefined): string {
  const date = toDate(stamp);
  if (!date) return "—";
  return isSameDay(date, new Date())
    ? format(date, "HH:mm")
    : format(date, "d MMM, HH:mm", { locale: he });
}

/** Points with a thousands separator, and an explicit sign for adjustments. */
export function points(n: number, signed = false): string {
  const formatted = new Intl.NumberFormat("he-IL").format(Math.abs(n));
  if (!signed) return new Intl.NumberFormat("he-IL").format(n);
  return `${n < 0 ? "−" : "+"}${formatted}`;
}

/** "נשארו יומיים ו-4 שעות", "נשארו 12 דק'", or "הסתיים". */
export function countdown(toMs: number | null, now = Date.now()): string {
  if (toMs === null) return "";
  const diff = toMs - now;
  if (diff <= 0) return "הסתיים";

  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "נשארו פחות מדקה";
  if (mins < 60) return `נשארו ${mins} דק'`;

  const hours = Math.floor(mins / 60);
  const restMins = mins % 60;
  if (hours < 24) {
    const h = hours === 1 ? "שעה" : hours === 2 ? "שעתיים" : `${hours} שעות`;
    return restMins ? `נשארו ${h} ו-${restMins} דק'` : `נשארו ${h}`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  const d = days === 1 ? "יום" : days === 2 ? "יומיים" : `${days} ימים`;
  if (!restHours) return `נשארו ${d}`;
  const h = restHours === 1 ? "שעה" : restHours === 2 ? "שעתיים" : `${restHours} שעות`;
  return `נשארו ${d} ו-${h}`;
}

export function distance(metres: number): string {
  return metres < 1000
    ? `${Math.round(metres)} מ'`
    : `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} ק"מ`;
}

export function radiusLabel(metres: number): string {
  return metres < 1000 ? `${metres} מ'` : `${metres / 1000} ק"מ`;
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Wrap a Latin run so it renders in its own direction inside a Hebrew
 * sentence. Uses the Unicode isolate characters, which work in plain strings
 * where a <span dir="ltr"> cannot reach — toasts, aria-labels, title text.
 */
export function ltr(value: string): string {
  return `⁦${value}⁩`;
}
