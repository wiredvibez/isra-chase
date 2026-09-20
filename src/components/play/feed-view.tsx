"use client";

import * as React from "react";
import { collection, query, where } from "firebase/firestore";
import { toast } from "sonner";
import { Flag, Heart, Rss } from "lucide-react";
import { getDb } from "@/lib/firebase/client";
import { useLiveQuery } from "@/lib/hooks/use-firestore";
import { byNewest } from "@/lib/format";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { points as fmtPoints, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Submission } from "@/lib/domain/types";
import { usePlay } from "./play-provider";
import { useLocalSet } from "./use-local-set";
import { MissionIcon } from "./mission-icon";
import { ReportDialog } from "./report-dialog";

const PAGE = 50;

/**
 * Whether *this* player has liked a submission can't be read in bulk — the
 * like lives at submissions/{id}/likes/{uid} and Firestore has no join. The
 * toggle endpoint is the source of truth; we cache its answers per device so
 * the heart doesn't reset on every navigation.
 */
function useLikedCache(uid: string | null, chaseId: string) {
  const { value, toggle } = useLocalSet(
    uid ? `isra-chase:likes:${uid}:${chaseId}` : null,
  );
  return { liked: value, set: toggle };
}

function FeedItem({
  submission,
  likeCount,
  mine,
  liked,
  onToggleLike,
  onReport,
}: {
  submission: Submission;
  /** Live count folded with this device's optimistic delta. */
  likeCount: number;
  mine: boolean;
  liked: boolean;
  onToggleLike: (submission: Submission) => void;
  onReport: (id: string) => void;
}) {
  const media = submission.media;
  const total = submission.points + (submission.bonusPoints ?? 0);

  return (
    <li>
      <Card className={cn("overflow-hidden", mine && "ring-2 ring-primary/40")}>
        <div className="flex items-center gap-2.5 p-3">
          <Avatar name={submission.teamName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {submission.teamName}
              {mine && (
                <span className="ms-1.5 text-xs font-semibold text-primary">
                  אתם
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {submission.participantName} · {timeAgo(submission.createdAt)}
            </p>
          </div>
          {total > 0 && (
            <Badge tone="accent">
              <span dir="ltr">+{fmtPoints(total)}</span>
            </Badge>
          )}
        </div>

        {media?.kind === "video" ? (
          <video
            src={media.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-square w-full bg-black object-contain"
          />
        ) : media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={submission.caption ?? `ההגשה של ${submission.teamName}`}
            loading="lazy"
            className="aspect-square w-full bg-surface-inset object-cover"
          />
        ) : submission.textAnswer ? (
          <p className="mx-3 rounded-md bg-surface-muted px-3 py-4 text-center font-display text-lg font-bold break-words">
            “{submission.textAnswer}”
          </p>
        ) : null}

        <div className="space-y-2 p-3">
          <div className="flex items-center gap-2">
            <MissionIcon type={submission.missionType} size="sm" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {submission.missionName}
            </p>
          </div>

          {submission.caption && (
            <p className="text-sm break-words text-muted-foreground">
              {submission.caption}
            </p>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleLike(submission)}
              aria-pressed={liked}
              aria-label={liked ? "מבטלים לייק" : "לייק להגשה הזאת"}
              className={cn(
                "flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-bold transition-colors",
                liked
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart
                className={cn("size-5", liked && "fill-accent")}
                aria-hidden
              />
              <span className="tabular-nums">{likeCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onReport(submission.id)}
              aria-label="לדווח על ההגשה הזאת"
              className="ms-auto flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-danger"
            >
              <Flag className="size-[1.125rem]" aria-hidden />
            </button>
          </div>
        </div>
      </Card>
    </li>
  );
}

export function FeedView() {
  const { chaseId, uid, participant } = usePlay();
  const myTeamId = participant?.teamId ?? null;

  const feedQuery = React.useMemo(
    () =>
      query(
        collection(getDb(), "chases", chaseId, "submissions"),
        // Equality filters only: adding orderBy here would need a composite
        // index, and without one the whole feed errors instead of loading.
        // The rules require all three filters, so they stay; the ordering
        // moves into the client.
        where("status", "==", "approved"),
        where("hidden", "==", false),
        where("feedVisible", "==", true),
      ),
    [chaseId],
  );

  const {
    data: allSubmissions,
    loading,
    error,
  } = useLiveQuery<Submission>(feedQuery, [chaseId]);

  const submissions = React.useMemo(
    () => [...allSubmissions].sort(byNewest).slice(0, PAGE),
    [allSubmissions],
  );

  const { liked, set: setLiked } = useLikedCache(uid, chaseId);
  // Optimistic deltas keyed by submission id, folded over the live count.
  const [delta, setDelta] = React.useState<Record<string, number>>({});
  const [reporting, setReporting] = React.useState<string | null>(null);

  async function toggleLike(submission: Submission) {
    const wasLiked = liked.has(submission.id);
    setLiked(submission.id, !wasLiked);
    setDelta((d) => ({ ...d, [submission.id]: (d[submission.id] ?? 0) + (wasLiked ? -1 : 1) }));
    try {
      const response = await apiPost<{ liked: boolean; likeCount: number }>(
        `/api/chases/${chaseId}/submissions/${submission.id}/like`,
        {},
      );
      // Trust the server's answer over our guess.
      setLiked(submission.id, response.liked);
      setDelta((d) => ({
        ...d,
        [submission.id]: response.likeCount - (submission.likeCount ?? 0),
      }));
    } catch (caught) {
      setLiked(submission.id, wasLiked);
      setDelta((d) => ({ ...d, [submission.id]: (d[submission.id] ?? 0) + (wasLiked ? 1 : -1) }));
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "הלייק לא נקלט. תנסו שוב.",
      );
    }
  }

  if (loading && submissions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    );
  }

  // A failed subscription used to fall through to the empty state, so a broken
  // feed was indistinguishable from a quiet one. Say which it is.
  if (error) {
    return (
      <EmptyState
        icon={<Rss className="size-5" />}
        title="הפיד לא נטען"
        description="משהו השתבש בדרך. תרעננו את הדף — ואם זה חוזר, תגידו למארגן."
      />
    );
  }

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={<Rss className="size-5" />}
        title="עדיין שקט כאן"
        description="תהיו הראשונים — כל הגשה של קבוצה נוחתת כאן ברגע שהיא מאושרת."
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {submissions.map((submission) => (
          <FeedItem
            key={submission.id}
            submission={submission}
            likeCount={
              (submission.likeCount ?? 0) + (delta[submission.id] ?? 0)
            }
            mine={submission.teamId === myTeamId}
            liked={liked.has(submission.id)}
            onToggleLike={toggleLike}
            onReport={setReporting}
          />
        ))}
      </ul>

      <ReportDialog
        key={reporting ?? "none"}
        chaseId={chaseId}
        submissionId={reporting}
        open={reporting !== null}
        onClose={() => setReporting(null)}
      />
    </>
  );
}
