import { Timestamp } from "firebase-admin/firestore";
import type { z } from "zod";
import type { expiryRuleSchema, releaseRuleSchema } from "@/lib/domain/schemas";
import type { ExpiryRule, ReleaseRule } from "@/lib/domain/types";

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
