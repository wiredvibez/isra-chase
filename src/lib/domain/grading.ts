import type { GpsConfig, TextConfig } from "./types";

/* --------------------------------------------------------------- text ---- */

/** Lowercase, strip punctuation/diacritics, collapse whitespace. */
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(input: string): string[] {
  return normalizeAnswer(input).split(" ").filter(Boolean);
}

/** Crude but effective English singularisation for plural tolerance. */
function singular(word: string): string {
  if (word.length > 3 && word.endsWith("ies"))
    return `${word.slice(0, -3)}y`;
  if (word.length > 3 && /(s|x|z|ch|sh)es$/.test(word))
    return word.replace(/es$/, "");
  if (word.length > 2 && word.endsWith("s") && !word.endsWith("ss"))
    return word.slice(0, -1);
  return word;
}

/** Order-insensitive, plural-tolerant canonical form. */
function canonical(input: string): string {
  return tokens(input).map(singular).sort().join(" ");
}

function digitRuns(input: string): string[] {
  return input.match(/\d+(?:[.,]\d+)?/g) ?? [];
}

/**
 * Damerau-Levenshtein distance (optimal string alignment): counts an adjacent
 * transposition as one edit, so "Tower" -> "Towre" costs 1 rather than 2.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        rows[i][j - 1] + 1,
        rows[i - 1][j] + 1,
        rows[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2][j - 2] + 1);
      }
      rows[i][j] = best;
    }
  }
  return rows[a.length][b.length];
}

/** 0..1 similarity ratio. */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Goosechase's documented approximate-match threshold. */
export const APPROXIMATE_THRESHOLD = 0.92;

/**
 * Goosechase also documents tolerating "one added, missing or replaced
 * letter". On a short string a single edit falls below 92% similarity
 * ("Eiffel Towre" scores 91.7%), so we accept a distance of 1 outright — but
 * only once the answer is long enough that one edit isn't the whole word.
 * Without this floor, "cat" would match "bat".
 */
export const SINGLE_EDIT_MIN_LENGTH = 6;

export type TextVerdict = {
  correct: boolean;
  matched: string | null;
  reason: string;
  score: number;
};

/**
 * Grade a text submission.
 *
 * - No accepted responses ⇒ open-ended, everything is accepted.
 * - Exact mode ⇒ normalized equality.
 * - Approximate mode ⇒ order-insensitive, plural-tolerant fuzzy match at
 *   ≥92% similarity, but any digits in the accepted answer must match exactly.
 */
export function gradeText(answer: string, config: TextConfig): TextVerdict {
  const accepted = config.acceptedResponses
    .map((r) => r.trim())
    .filter(Boolean);

  if (!accepted.length) {
    return {
      correct: true,
      matched: null,
      reason: "משימה פתוחה — כל תשובה מתקבלת.",
      score: 1,
    };
  }

  const given = normalizeAnswer(answer);
  if (!given) {
    return { correct: false, matched: null, reason: "לא כתבתם כלום.", score: 0 };
  }

  for (const candidate of accepted) {
    if (normalizeAnswer(candidate) === given) {
      return {
        correct: true,
        matched: candidate,
        reason: "בול.",
        score: 1,
      };
    }
  }

  if (!config.approximate) {
    return {
      correct: false,
      matched: null,
      reason: "לא בדיוק.",
      score: 0,
    };
  }

  let best = 0;
  let bestCandidate: string | null = null;

  for (const candidate of accepted) {
    // Numbers must be exact even in approximate mode.
    const wantDigits = digitRuns(candidate);
    if (wantDigits.length) {
      const gotDigits = digitRuns(answer);
      const sameDigits =
        wantDigits.length === gotDigits.length &&
        wantDigits.every((d, i) => d.replace(",", ".") === gotDigits[i]?.replace(",", "."));
      if (!sameDigits) continue;
    }

    const want = canonical(candidate);
    const got = canonical(answer);
    const distance = levenshtein(want, got);
    const score = similarity(want, got);

    const oneEdit =
      distance <= 1 && Math.max(want.length, got.length) >= SINGLE_EDIT_MIN_LENGTH;

    const effective = oneEdit ? Math.max(score, APPROXIMATE_THRESHOLD) : score;
    if (effective > best) {
      best = effective;
      bestCandidate = candidate;
    }
  }

  if (best >= APPROXIMATE_THRESHOLD) {
    return {
      correct: true,
      matched: bestCandidate,
      reason: `מספיק קרוב (${Math.round(best * 100)}% התאמה).`,
      score: best,
    };
  }

  return {
    correct: false,
    matched: null,
    reason: best
      ? `הכי קרוב שהגעתם זה ${Math.round(best * 100)}% התאמה.`
      : "לא בדיוק. תנסו שוב.",
    score: best,
  };
}

/** Which badge the mission shows in the list. */
export function textMissionBadge(config: TextConfig): "open" | "exact" | "approximate" {
  if (!config.acceptedResponses.filter((r) => r.trim()).length) return "open";
  return config.approximate ? "approximate" : "exact";
}

/* ---------------------------------------------------------------- gps ---- */

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance in metres. */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GpsVerdict = {
  correct: boolean;
  distanceM: number;
  reason: string;
};

export function gradeGps(
  position: { lat: number; lng: number },
  config: GpsConfig,
): GpsVerdict {
  const distanceM = Math.round(haversineMeters(position, config));
  const correct = distanceM <= config.radiusM;
  return {
    correct,
    distanceM,
    reason: correct
      ? `צ'ק-אין מ-${distanceM} מ' מהיעד (בתוך ${config.radiusM} מ').`
      : `אתם ${distanceM} מ' משם. תתקרבו ל-${config.radiusM} מ' בשביל צ'ק-אין.`,
  };
}
