import { describe, expect, it } from "vitest";
import { missionInputSchema, missionPatchSchema, providedFields } from "./schemas";

/** The body the mission editor sends when saving an existing camera task. */
const cameraEdit = {
  name: "Find the mural",
  description: "Photograph the mural on the north wall.",
  points: 100,
  type: "camera" as const,
  imageUrl: null,
  linkUrl: null,
  feedVisibility: "shown" as const,
  isDraft: false,
  camera: {
    accepts: "both" as const,
    sources: "live_and_library" as const,
    maxVideoSeconds: 30,
  },
  text: null,
  gps: null,
  release: { kind: "chase_start" as const },
  expiry: { kind: "chase_end" as const },
};

describe("missionPatchSchema", () => {
  it("accepts a full edit, which missionInputSchema.partial() rejects", () => {
    expect(() => missionInputSchema.partial()).toThrow(/refinements/);
    expect(missionPatchSchema.parse(cameraEdit)).toMatchObject({
      name: "Find the mural",
      type: "camera",
      camera: cameraEdit.camera,
    });
  });

  it("still requires the matching config when the type is being set", () => {
    expect(() => missionPatchSchema.parse({ ...cameraEdit, camera: null })).toThrow(
      /Camera settings are required/,
    );
    expect(() =>
      missionPatchSchema.parse({
        type: "gps",
        gps: { lat: 32.08, lng: 34.78, radiusM: 100, address: null },
      }),
    ).not.toThrow();
  });

  it("keeps a one-field edit from writing defaulted fields", () => {
    const raw = { name: "  Updated name  " };
    const parsed = missionPatchSchema.parse(raw);
    expect(parsed.camera).toBeNull();
    expect(providedFields(raw, parsed)).toEqual({ name: "Updated name" });
  });
});

describe("missionInputSchema", () => {
  it("accepts the same body used to create a mission", () => {
    expect(missionInputSchema.parse(cameraEdit).name).toBe("Find the mural");
  });
});
