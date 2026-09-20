"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  ExternalLink,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, ApiClientError } from "@/lib/api-client";
import { points as fmtPoints, radiusLabel } from "@/lib/format";
import { usePlay } from "./play-provider";
import { MissionIcon } from "./mission-icon";
import { Countdown } from "./countdown";
import { CameraComposer } from "./camera-composer";
import { TextComposer } from "./text-composer";
import { GpsComposer } from "./gps-composer";
import { SubmissionSuccess } from "./submission-success";
import type { CreateSubmissionResponse } from "./types";

/** Shown when the team's last attempt at this mission was graded wrong. */
function PriorMiss() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning-surface p-4">
      <p className="font-display text-base font-bold">הניסיון הקודם לא קלע</p>
      <p className="mt-1 text-sm text-muted-foreground">
        לא הפסדתם כלום — אפשר לשלוח שוב מתי שתרצו.
      </p>
    </div>
  );
}

const TEXT_BADGE_LABEL = {
  open: "תשובה חופשית",
  exact: "התאמה מדויקת",
  approximate: "בערך מספיק",
} as const;

export function MissionDetailView({ missionId }: { missionId: string }) {
  const { chaseId, chase, uid, missions, missionsLoading, refreshMissions } =
    usePlay();
  const mission = missions.find((m) => m.id === missionId) ?? null;

  const [result, setResult] = React.useState<CreateSubmissionResponse | null>(
    null,
  );
  const [confirmRedo, setConfirmRedo] = React.useState(false);
  const [redoing, setRedoing] = React.useState(false);

  const backHref = `/play/${chaseId}`;

  async function handleResult(next: CreateSubmissionResponse) {
    setResult(next);
    // The mission list carries completion state and points, so it has to catch
    // up before the player navigates back to it.
    await refreshMissions();
  }

  async function redo() {
    const submissionId = mission?.submission?.id;
    if (!submissionId) return;
    setRedoing(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/submissions/${submissionId}`, {
        reason: null,
      });
      setResult(null);
      await refreshMissions();
      setConfirmRedo(false);
      toast.success("המשימה נפתחה מחדש. קדימה, עוד ניסיון.");
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "לא הצלחנו לפתוח את המשימה מחדש.",
      );
    } finally {
      setRedoing(false);
    }
  }

  if (!mission) {
    return (
      <div className="mx-auto min-h-dvh max-w-2xl p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {missionsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <EmptyState
            icon={<CircleAlert className="size-5" />}
            title="המשימה הזאת לא זמינה"
            description="יכול להיות שהיא הוסרה, או שהיא עוד לא נפתחה לקבוצה שלכם."
            action={
              <Link
                href={backHref}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                חזרה למשימות
              </Link>
            }
          />
        )}
      </div>
    );
  }

  const expired = mission.availability.state === "expired";
  const rejected = result?.submission.status === "rejected";
  // A wrong auto-graded answer from an earlier session: the server keeps the
  // rejected submission but leaves the mission open, so say so plainly.
  const previouslyMissed =
    result === null && mission.submission?.status === "rejected";
  const succeeded = result !== null && !rejected;
  const chaseClosed = chase !== null && chase.status !== "live";

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface/95 px-2 py-2 backdrop-blur-sm pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <Link
          href={backHref}
          aria-label="חזרה למשימות"
          className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-surface-muted"
        >
          <ArrowLeft className="size-5 flip-rtl" />
        </Link>
        <p className="min-w-0 flex-1 truncate font-display text-base font-bold">
          {mission.name}
        </p>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {mission.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mission.imageUrl}
            alt=""
            className="aspect-[2/1] w-full rounded-lg border border-border object-cover"
          />
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MissionIcon type={mission.type} />
            <h1 className="min-w-0 flex-1 font-display text-xl font-bold leading-tight break-words">
              {mission.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{`${fmtPoints(mission.points)} נק'`}</Badge>
            {mission.text && (
              <Badge tone="info">{TEXT_BADGE_LABEL[mission.text.badge]}</Badge>
            )}
            {mission.gps && (
              <Badge tone="neutral">
                <MapPin className="size-3" aria-hidden />
                ברדיוס {radiusLabel(mission.gps.radiusM)}
              </Badge>
            )}
            {mission.feedVisibility === "hidden" && (
              <Badge tone="neutral">לא מופיעה בפיד</Badge>
            )}
            {!expired && mission.availability.expiresAt && (
              <Badge tone="warning">
                <Clock className="size-3" aria-hidden />
                <Countdown
                  toMs={mission.availability.expiresAt}
                  prefix="נשארו"
                  endedLabel="נסגרה"
                />
              </Badge>
            )}
            {expired && <Badge tone="danger">נסגרה</Badge>}
          </div>

          {mission.description && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {mission.description}
            </p>
          )}

          {mission.linkUrl && (
            <a
              href={mission.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-2"
            >
              <ExternalLink className="size-4" aria-hidden />
              פותחים את הקישור
            </a>
          )}
        </div>

        {succeeded && result ? (
          <SubmissionSuccess
            chaseId={chaseId}
            mission={mission}
            result={result}
            onDone={() => setResult(null)}
          />
        ) : mission.completed ? (
          <div className="space-y-3 rounded-lg border border-success/30 bg-success-surface p-4">
            <p className="font-display text-lg font-bold">
              {mission.submission?.status === "pending"
                ? "ממתינים למארגן"
                : "את זו כבר עשיתם"}
            </p>
            <p className="text-sm text-muted-foreground">
              {mission.submission?.status === "pending"
                ? "ההגשה שלכם בתור לבדיקה. הנקודות ייכנסו ברגע שהיא תאושר."
                : `${fmtPoints(mission.submission?.points ?? mission.points)} נקודות נכנסו לקבוצה.`}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setConfirmRedo(true)}
            >
              <RotateCcw className="size-5" aria-hidden />
              לעשות שוב
            </Button>
          </div>
        ) : expired ? (
          <div className="rounded-lg border border-danger/30 bg-danger-surface p-4">
            <p className="font-display text-base font-bold">המשימה נסגרה</p>
            <p className="mt-1 text-sm text-muted-foreground">
              חלון הזמן שלה נגמר, אז אי אפשר לשלוח אליה יותר.
            </p>
          </div>
        ) : chaseClosed ? (
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="font-display text-base font-bold">
              {chase?.status === "ended"
                ? "המרדף הסתיים"
                : "המרדף עוד לא התחיל"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              אי אפשר לשלוח הגשות כרגע.
            </p>
          </div>
        ) : !uid ? null : mission.type === "camera" ? (
          <>
            {previouslyMissed && <PriorMiss />}
            {rejected && (
              <div role="status" aria-live="polite" className="rounded-lg border border-warning/30 bg-warning-surface p-4">
                <p className="font-display text-base font-bold">ההגשה לא התקבלה</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {result?.submission.gradeReason ??
                    "ההגשה הזאת לא התקבלה. נסו צילום אחר."}
                </p>
              </div>
            )}
            <CameraComposer
              chaseId={chaseId}
              mission={mission}
              uid={uid}
              onResult={(next) => void handleResult(next)}
            />
          </>
        ) : mission.type === "text" ? (
          <>
            {previouslyMissed && <PriorMiss />}
            <TextComposer
              chaseId={chaseId}
              mission={mission}
              rejection={rejected ? result : null}
              onResult={(next) => void handleResult(next)}
              onRetry={() => setResult(null)}
            />
          </>
        ) : (
          <>
            {previouslyMissed && <PriorMiss />}
            <GpsComposer
              chaseId={chaseId}
              mission={mission}
              rejection={rejected ? result : null}
              onResult={(next) => void handleResult(next)}
              onRetry={() => setResult(null)}
            />
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmRedo}
        onClose={() => setConfirmRedo(false)}
        onConfirm={redo}
        loading={redoing}
        confirmLabel="למחוק ולעשות שוב"
        title="לעשות את המשימה שוב?"
        description="ההגשה הנוכחית תימחק והנקודות שלה יירדו מהסכום של הקבוצה. אחר כך אפשר לשלוח מחדש."
      />
    </div>
  );
}
