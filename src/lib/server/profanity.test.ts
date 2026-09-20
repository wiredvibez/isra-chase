import { describe, expect, it } from "vitest";
import { screen } from "./profanity";

describe("screen", () => {
  it("catches blocked words and leet-speak spellings", () => {
    expect(screen("what the fuck")).toBe("fuck");
    expect(screen(null, "sh1t")).toBe("shit");
    expect(screen("F.U.C.K")).toBe("fuck");
  });

  it("does not fire on innocent substrings", () => {
    expect(screen("Scunthorpe assassin classic")).toBeNull();
    expect(screen("this hit the target")).toBeNull();
    expect(screen("")).toBeNull();
    expect(screen(undefined)).toBeNull();
  });
});
