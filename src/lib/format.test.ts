import { describe, expect, it } from "vitest";
import { countdown, distance, durationLeft, points, radiusLabel } from "./format";

const NOW = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("durationLeft — Hebrew counts two of a thing with a dual form", () => {
  it("uses the dual rather than a numeral", () => {
    expect(durationLeft(NOW + 2 * MIN, NOW)).toBe("שתי דקות");
    expect(durationLeft(NOW + 2 * HOUR, NOW)).toBe("שעתיים");
    expect(durationLeft(NOW + 2 * DAY, NOW)).toBe("יומיים");
  });

  it("uses the singular for one", () => {
    expect(durationLeft(NOW + MIN, NOW)).toBe("דקה");
    expect(durationLeft(NOW + HOUR, NOW)).toBe("שעה");
    expect(durationLeft(NOW + DAY, NOW)).toBe("יום");
  });

  it("uses a numeral from three upwards", () => {
    expect(durationLeft(NOW + 37 * MIN, NOW)).toBe("37 דק'");
    expect(durationLeft(NOW + 5 * DAY, NOW)).toBe("5 ימים");
  });

  it("joins the two largest units with a vav", () => {
    expect(durationLeft(NOW + 21 * HOUR + 37 * MIN, NOW)).toBe("21 שע' ו-37 דק'");
    expect(durationLeft(NOW + 2 * DAY + 4 * HOUR, NOW)).toBe("יומיים ו-4 שע'");
  });

  it("drops the smaller unit when it is zero", () => {
    expect(durationLeft(NOW + 3 * HOUR, NOW)).toBe("3 שע'");
    expect(durationLeft(NOW + 3 * DAY, NOW)).toBe("3 ימים");
  });

  it("returns null once the clock has run out", () => {
    expect(durationLeft(NOW - 1, NOW)).toBeNull();
    expect(durationLeft(NOW, NOW)).toBeNull();
  });

  it("says less than a minute rather than zero", () => {
    expect(durationLeft(NOW + 45_000, NOW)).toBe("פחות מדקה");
  });
});

describe("countdown", () => {
  it("frames the duration and reports the end", () => {
    expect(countdown(NOW + 2 * HOUR, NOW)).toBe("נשארו שעתיים");
    expect(countdown(NOW - 1, NOW)).toBe("הסתיים");
    expect(countdown(null, NOW)).toBe("");
  });
});

describe("units", () => {
  it("formats metres and kilometres the Hebrew way", () => {
    expect(distance(340)).toBe("340 מ'");
    expect(distance(2500)).toBe('2.5 ק"מ');
    expect(radiusLabel(250)).toBe("250 מ'");
    expect(radiusLabel(5000)).toBe('5 ק"מ');
  });

  it("signs adjustments explicitly", () => {
    expect(points(50, true)).toBe("+50");
    expect(points(-25, true)).toBe("−25");
    expect(points(1250)).toBe("1,250");
  });
});
