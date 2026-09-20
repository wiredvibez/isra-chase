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

/**
 * Hebrew counts two of a thing with a dedicated dual form, so "2 days" is
 * יומיים and never "2 ימים". Everything that prints a duration goes through
 * here, so the Studio header and a mission card can never disagree.
 */
function hebrewCount(n: number, one: string, two: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${many}`;
}

const MINUTES = (n: number) => hebrewCount(n, "דקה", "שתי דקות", "דק'");
const HOURS = (n: number) => hebrewCount(n, "שעה", "שעתיים", "שע'");
const DAYS = (n: number) => hebrewCount(n, "יום", "יומיים", "ימים");

/**
 * A bare duration with no framing word — "12 דק'", "3 שע' ו-20 דק'",
 * "יומיים ו-4 שע'" — so each caller supplies its own ("נשארו …", "מתחיל
 * בעוד …"). Returns null once the clock has run out.
 */
export function durationLeft(toMs: number, now = Date.now()): string | null {
  const diff = toMs - now;
  if (diff <= 0) return null;

  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "פחות מדקה";
  if (mins < 60) return MINUTES(mins);

  const hours = Math.floor(mins / 60);
  const restMins = mins % 60;
  if (hours < 24) {
    return restMins ? `${HOURS(hours)} ו-${MINUTES(restMins)}` : HOURS(hours);
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${DAYS(days)} ו-${HOURS(restHours)}` : DAYS(days);
}

/** The framed form used in headers: "נשארו 12 דק'", or "הסתיים". */
export function countdown(toMs: number | null, now = Date.now()): string {
  if (toMs === null) return "";
  const left = durationLeft(toMs, now);
  return left === null ? "הסתיים" : `נשארו ${left}`;
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
 * Newest first, for lists we sort in memory.
 *
 * Several live queries deliberately omit `orderBy`: combining it with a
 * `where` demands a composite index, and a chase that has not had its indexes
 * built would then show an error instead of a feed. Equality-only queries are
 * served by Firestore's automatic single-field indexes, so we filter in the
 * query and order here. A single chase holds hundreds of documents at most.
 */
export function byNewest<T extends { createdAt?: Stamp | null }>(a: T, b: T) {
  return (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
}

/**
 * Wrap a Latin run so it renders in its own direction inside a Hebrew
 * sentence. Uses the Unicode isolate characters, which work in plain strings
 * where a <span dir="ltr"> cannot reach — toasts, aria-labels, title text.
 */
export function ltr(value: string): string {
  return `⁦${value}⁩`;
}
