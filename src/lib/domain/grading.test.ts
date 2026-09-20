import { describe, expect, it } from "vitest";
import {
  APPROXIMATE_THRESHOLD,
  gradeGps,
  gradeText,
  haversineMeters,
  normalizeAnswer,
  similarity,
  textMissionBadge,
} from "./grading";
import type { GpsConfig, TextConfig } from "./types";

const exact = (responses: string[]): TextConfig => ({
  acceptedResponses: responses,
  approximate: false,
});
const fuzzy = (responses: string[]): TextConfig => ({
  acceptedResponses: responses,
  approximate: true,
});

describe("normalizeAnswer", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    expect(normalizeAnswer("  The   Eiffel-Tower!! ")).toBe("the eiffel tower");
  });

  it("strips diacritics so café matches cafe", () => {
    expect(normalizeAnswer("Café")).toBe("cafe");
  });
});

describe("gradeText — open-ended", () => {
  it("accepts anything when no responses are configured", () => {
    const v = gradeText("literally whatever", exact([]));
    expect(v.correct).toBe(true);
    expect(v.reason).toMatch(/open-ended/i);
  });

  it("treats whitespace-only accepted responses as open-ended", () => {
    expect(gradeText("anything", exact(["  ", ""])).correct).toBe(true);
  });
});

describe("gradeText — exact mode", () => {
  it("matches ignoring case and punctuation", () => {
    expect(gradeText("eiffel tower!", exact(["Eiffel Tower"])).correct).toBe(true);
  });

  it("accepts any one of several responses", () => {
    const config = exact(["red", "crimson", "scarlet"]);
    expect(gradeText("Scarlet", config).correct).toBe(true);
  });

  it("rejects a near miss when approximate is off", () => {
    const v = gradeText("eiffle tower", exact(["Eiffel Tower"]));
    expect(v.correct).toBe(false);
    expect(v.reason).toMatch(/no exact match/i);
  });

  it("rejects an empty response", () => {
    expect(gradeText("   ", exact(["anything"])).correct).toBe(false);
  });
});

describe("gradeText — approximate mode", () => {
  it("tolerates a single transposed letter", () => {
    expect(gradeText("Eiffel Towre", fuzzy(["Eiffel Tower"])).correct).toBe(true);
  });

  it("is word-order insensitive", () => {
    expect(gradeText("Tower Eiffel", fuzzy(["Eiffel Tower"])).correct).toBe(true);
  });

  it("tolerates pluralisation", () => {
    expect(gradeText("three cat", fuzzy(["three cats"])).correct).toBe(true);
    expect(gradeText("berries", fuzzy(["berry"])).correct).toBe(true);
  });

  it("still rejects a genuinely different answer", () => {
    const v = gradeText("Big Ben", fuzzy(["Eiffel Tower"]));
    expect(v.correct).toBe(false);
    expect(v.score).toBeLessThan(APPROXIMATE_THRESHOLD);
  });

  it("requires digits to match exactly", () => {
    expect(gradeText("1962", fuzzy(["1963"])).correct).toBe(false);
    expect(gradeText("1963", fuzzy(["1963"])).correct).toBe(true);
  });

  it("allows fuzzy text around an exact number", () => {
    const config = fuzzy(["2 million years"]);
    expect(gradeText("2 million year", config).correct).toBe(true);
    expect(gradeText("3 million years", config).correct).toBe(false);
  });
});

describe("textMissionBadge", () => {
  it("reports open, exact and approximate", () => {
    expect(textMissionBadge(exact([]))).toBe("open");
    expect(textMissionBadge(exact(["a"]))).toBe("exact");
    expect(textMissionBadge(fuzzy(["a"]))).toBe("approximate");
  });
});

describe("similarity", () => {
  it("is 1 for identical strings and 0 for total mismatch", () => {
    expect(similarity("abc", "abc")).toBe(1);
    expect(similarity("abc", "xyz")).toBe(0);
  });
});

describe("haversineMeters", () => {
  it("measures a known distance", () => {
    // Eiffel Tower to Arc de Triomphe is roughly 2.1 km.
    const d = haversineMeters(
      { lat: 48.8584, lng: 2.2945 },
      { lat: 48.8738, lng: 2.295 },
    );
    expect(d).toBeGreaterThan(1600);
    expect(d).toBeLessThan(1800);
  });

  it("is zero for the same point", () => {
    expect(haversineMeters({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });
});

describe("gradeGps", () => {
  const target: GpsConfig = {
    lat: 48.8584,
    lng: 2.2945,
    radiusM: 100,
    address: "Eiffel Tower",
  };

  it("accepts a check-in inside the radius", () => {
    const v = gradeGps({ lat: 48.8585, lng: 2.2946 }, target);
    expect(v.correct).toBe(true);
    expect(v.distanceM).toBeLessThanOrEqual(100);
  });

  it("rejects a check-in outside the radius and says how far", () => {
    const v = gradeGps({ lat: 48.8738, lng: 2.295 }, target);
    expect(v.correct).toBe(false);
    expect(v.reason).toMatch(/get within 100 m/i);
  });
});

describe("gradeText — single-edit floor", () => {
  it("does not let one edit match a short word", () => {
    // "cat" vs "bat" is one replaced letter, but matching it would be absurd.
    expect(gradeText("bat", fuzzy(["cat"])).correct).toBe(false);
  });

  it("does allow one edit once the answer is long enough", () => {
    expect(gradeText("Eiffel Towre", fuzzy(["Eiffel Tower"])).correct).toBe(true);
    expect(gradeText("elephant", fuzzy(["elephnat"])).correct).toBe(true);
  });
});
