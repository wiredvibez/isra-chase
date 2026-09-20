import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type DocumentReference,
} from "firebase-admin/firestore";
import type { z } from "zod";
import { chaseRef } from "./scoring";
import type { broadcastScheduleSchema } from "@/lib/domain/schemas";
import type { Broadcast, BroadcastSchedule, Chase, NotificationType } from "@/lib/domain/types";

export interface NotificationInput {
  /** null ⇒ everyone in the chase. */
  teamId: string | null;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string | null;
}

export const notificationsRef = (chaseId: string) =>
  chaseRef(chaseId).collection("notifications");

function body(chaseId: string, input: NotificationInput) {
  return {
    chaseId,
    teamId: input.teamId,
    type: input.type,
    title: input.title,
    body: input.body,
    linkUrl: input.linkUrl ?? null,
    readBy: {},
    createdAt: FieldValue.serverTimestamp(),
  };
}

/** The write half of a Transaction or a WriteBatch — both can queue a set. */
interface DocWriter {
  set(ref: DocumentReference, data: DocumentData): unknown;
}

/** Queue a notification inside an existing transaction or batch. */
export function addNotification(
  tx: DocWriter,
  chaseId: string,
  input: NotificationInput,
  /** Deterministic id makes materialising a broadcast idempotent. */
  id?: string,
) {
  const ref = id ? notificationsRef(chaseId).doc(id) : notificationsRef(chaseId).doc();
  tx.set(ref, body(chaseId, input));
  return ref;
}

/** Fire-and-forget notification outside a transaction. */
export async function writeNotification(chaseId: string, input: NotificationInput) {
  await notificationsRef(chaseId).add(body(chaseId, input));
}

/* -------------------------------------------------------------- broadcasts */

/** JSON carries `atMs`; the stored schedule carries a real Timestamp. */
export function scheduleFromInput(
  schedule: z.infer<typeof broadcastScheduleSchema>,
): BroadcastSchedule {
  return schedule.kind === "during_specific"
    ? { kind: "during_specific", at: Timestamp.fromMillis(schedule.atMs) }
    : schedule;
}

function ms(value: { toMillis(): number } | null | undefined): number | null {
  return value ? value.toMillis() : null;
}

/**
 * When a scheduled broadcast becomes due, in epoch millis.
 * `null` means "cannot be resolved yet" — e.g. an at_start broadcast on a
 * chase that has never been given a start time.
 */
export function broadcastDueAt(
  schedule: BroadcastSchedule,
  chase: Pick<Chase, "startAt" | "endAt">,
): number | null {
  const start = ms(chase.startAt);
  const end = ms(chase.endAt);
  switch (schedule.kind) {
    case "now":
      return 0;
    case "before_start":
      return start === null ? null : start - schedule.offsetMs;
    case "at_start":
      return start;
    case "during_relative": {
      const anchor = schedule.anchor === "start" ? start : end;
      return anchor === null ? null : anchor + schedule.offsetMs;
    }
    case "during_specific":
      return ms(schedule.at);
    case "at_end":
      return end;
    case "after_end":
      return end === null ? null : end + schedule.offsetMs;
  }
}

/**
 * Materialise every due broadcast into notifications and mark it sent.
 *
 * Called on read rather than from a cron, so it must be idempotent: the
 * notification ids are derived from the broadcast id, and the status flip is
 * what stops a second pass doing any work at all.
 */
export async function materialiseBroadcasts(
  chase: Chase,
  now = Date.now(),
): Promise<number> {
  const pending = await chaseRef(chase.id)
    .collection("broadcasts")
    .where("status", "==", "scheduled")
    .get();
  if (pending.empty) return 0;

  const batch = chaseRef(chase.id).firestore.batch();
  const sentAt = Timestamp.fromMillis(now);
  let sent = 0;

  for (const doc of pending.docs) {
    const broadcast = { id: doc.id, ...doc.data() } as Broadcast;
    const due = broadcastDueAt(broadcast.schedule, chase);
    if (due === null || due > now) continue;

    const audience = broadcast.teamIds?.length ? broadcast.teamIds : [null];
    for (const teamId of audience) {
      addNotification(
        batch,
        chase.id,
        {
          teamId,
          type: "broadcast",
          title: broadcast.createdByName || "Announcement",
          body: broadcast.body,
          linkUrl: broadcast.linkUrl,
        },
        `bc_${broadcast.id}${teamId ? `_${teamId}` : ""}`,
      );
    }
    batch.update(doc.ref, { status: "sent", sentAt });
    sent += 1;
  }

  if (sent) await batch.commit();
  return sent;
}
