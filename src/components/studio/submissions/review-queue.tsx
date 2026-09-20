"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Submission } from "@/lib/domain/types";
import { points as formatPoints, timeAgo } from "@/lib/format";
import { SubmissionMedia } from "./submission-card";

/** Moves the cursor, clamped to a queue that may have shrunk underneath it. */
const step = (index: number, delta: number, last: number) =>
  Math.min(Math.max(Math.min(index, last) + delta, 0), last);

/**
 * Our moderation addition: a keyboard-driven approve/reject queue.
 * A approves, R rejects, arrow keys move — so a backlog can be cleared
 * without the mouse ever leaving the desk.
 */
export function ReviewQueue({
  submissions,
  onApprove,
  onReject,
}: {
  submissions: Submission[];
  onApprove: (submission: Submission) => Promise<void> | void;
  onReject: (submission: Submission) => Promise<void> | void;
}) {
  const [index, setIndex] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  // The queue shrinks under us as items are reviewed, so the cursor is clamped
  // where it is read rather than corrected afterwards by an effect.
  const last = Math.max(0, submissions.length - 1);
  const safeIndex = Math.min(index, last);
  const current = submissions[safeIndex];

  const act = React.useCallback(
    async (verdict: "approve" | "reject") => {
      if (!current || busy) return;
      setBusy(true);
      try {
        if (verdict === "approve") await onApprove(current);
        else await onReject(current);
        // The live query drops the item, so the cursor stays where it is.
      } catch {
        // errors already surfaced as toasts
      } finally {
        setBusy(false);
      }
    },
    [current, busy, onApprove, onReject],
  );

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;

      switch (event.key.toLowerCase()) {
        case "a":
          event.preventDefault();
          void act("approve");
          break;
        case "r":
          event.preventDefault();
          void act("reject");
          break;
        case "arrowright":
          event.preventDefault();
          setIndex((i) => step(i, 1, last));
          break;
        case "arrowleft":
          event.preventDefault();
          setIndex((i) => step(i, -1, last));
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, last]);

  if (!submissions.length) {
    return (
      <EmptyState
        icon={<Check className="size-6" aria-hidden />}
        title="Queue clear"
        description="Every submission has been reviewed. New ones land here automatically."
      />
    );
  }

  if (!current) return null;

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">Pending review</Badge>
          <p aria-live="polite" className="text-sm font-semibold">
            {safeIndex + 1} of {submissions.length}
          </p>
          <p className="ml-auto hidden text-xs text-muted-foreground sm:block">
            <kbd className="rounded border border-border px-1">A</kbd> approve ·{" "}
            <kbd className="rounded border border-border px-1">R</kbd> reject ·{" "}
            <kbd className="rounded border border-border px-1">←</kbd>
            <kbd className="rounded border border-border px-1">→</kbd> move
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <SubmissionMedia submission={current} className="max-h-[28rem]" />

          <div className="space-y-2">
            <p className="font-display text-lg font-bold">{current.missionName}</p>
            <p className="text-sm text-muted-foreground">
              {current.teamName} · {current.participantName} ·{" "}
              {timeAgo(current.createdAt)}
            </p>
            {current.caption && (
              <p className="text-sm whitespace-pre-wrap">{current.caption}</p>
            )}
            <Badge tone="brand">{formatPoints(current.points)} pts on approval</Badge>
            {current.flagged && (
              <p className="rounded-md bg-danger-surface px-3 py-2 text-xs text-danger">
                Flagged{current.flagReason ? `: ${current.flagReason}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="success"
            size="lg"
            loading={busy}
            onClick={() => void act("approve")}
          >
            <Check className="size-5" aria-hidden />
            Approve
          </Button>
          <Button
            variant="danger"
            size="lg"
            loading={busy}
            onClick={() => void act("reject")}
          >
            <X className="size-5" aria-hidden />
            Reject
          </Button>
          <div className="ml-auto flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous submission"
              disabled={safeIndex === 0}
              onClick={() => setIndex((i) => step(i, -1, last))}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next submission"
              disabled={safeIndex >= last}
              onClick={() => setIndex((i) => step(i, 1, last))}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
