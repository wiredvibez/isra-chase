import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import type { expiryRuleSchema, releaseRuleSchema } from "@/lib/domain/schemas";
import type { ExpiryRule, ReleaseRule } from "@/lib/domain/types";
import { missionsRef } from "./collections";
import { badRequest } from "./http";

/**
 * The wire format carries `atMs` because JSON has no timestamp; the stored
 * rule carries a real Firestore Timestamp so `resolveReleaseAt` can compare it
 * against the chase clock without a second conversion.
 */
export function releaseFromInput(
  rule: z.infer<typeof releaseRuleSchema>,
): ReleaseRule {
  return rule.kind === "specific"
    ? { kind: "specific", at: Timestamp.fromMillis(rule.atMs) }
    : rule;
}

export function expiryFromInput(rule: z.infer<typeof expiryRuleSchema>): ExpiryRule {
  return rule.kind === "specific"
    ? { kind: "specific", at: Timestamp.fromMillis(rule.atMs) }
    : rule;
}

/**
 * A mission can be gated on another being answered *correctly*, but only the
 * auto-graded types have a notion of correctness — a camera submission is
 * always accepted, so gating on it would deadlock the dependent mission.
 *
 * This lives here rather than in the Zod schema because it needs to read the
 * trigger mission, and it is the TRIGGER's type that matters, not the type of
 * the mission being created.
 */
export async function assertTriggerCanGrade(
  chaseId: string,
  release: { kind: string; missionId?: string; requireCorrect?: boolean },
) {
  if (release.kind !== "mission" || !release.requireCorrect) return;
  if (!release.missionId) throw badRequest("Pick a mission to unlock from.");

  const snap = await missionsRef(chaseId).doc(release.missionId).get();
  if (!snap.exists) throw badRequest("That unlocking mission doesn't exist.");

  const type = snap.data()?.type as string | undefined;
  if (type === "camera") {
    throw badRequest(
      "Camera missions are always accepted, so they have no correct answer to wait for. Use a text or GPS mission as the trigger, or drop the correct-answer requirement.",
    );
  }
}
