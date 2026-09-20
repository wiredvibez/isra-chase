"use client";

import Link from "next/link";
import { Clock, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { points as fmtPoints } from "@/lib/format";
import type { CreateSubmissionResponse, PlayMission } from "./types";

/** The payoff moment: loud, legible, and announced to screen readers. */
export function SubmissionSuccess({
  chaseId,
  mission,
  result,
  onDone,
}: {
  chaseId: string;
  mission: PlayMission;
  result: CreateSubmissionResponse;
  onDone: () => void;
}) {
  const pending = result.submission.status === "pending";
  const earned = result.submission.points + (result.submission.bonusPoints ?? 0);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-lg border border-success/30 bg-success-surface px-5 py-8 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-success text-white">
        {pending ? (
          <Clock className="size-8" aria-hidden />
        ) : (
          <PartyPopper className="size-8" aria-hidden />
        )}
      </span>

      <div className="space-y-1">
        <p className="font-display text-2xl font-bold">
          {pending ? "נשלח לבדיקה" : "סגרתם את זה"}
        </p>
        <p className="text-sm text-muted-foreground">{mission.name}</p>
      </div>

      {pending ? (
        <p className="text-sm text-muted-foreground">
          המארגן יעבור על זה. {fmtPoints(mission.points)} נקודות מחכות לאישור
          שלו.
        </p>
      ) : (
        <p className="font-display text-4xl font-bold text-success tabular-nums">
          <span dir="ltr">+{fmtPoints(earned)}</span>
          <span className="ms-1 text-base font-bold">נקודות</span>
        </p>
      )}

      {result.submission.gradeReason && !pending && (
        <p className="text-sm text-muted-foreground">
          {result.submission.gradeReason}
        </p>
      )}

      <div className="flex w-full flex-col gap-2 pt-2">
        <Button size="lg" className="w-full" onClick={onDone}>
          חזרה למשימות
        </Button>
        {mission.feedVisibility === "shown" && !pending && (
          <Link
            href={`/play/${chaseId}/feed`}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border-strong bg-surface px-4 text-sm font-semibold"
          >
            לראות את זה בפיד
          </Link>
        )}
      </div>
    </div>
  );
}
