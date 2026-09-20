"use client";

import * as React from "react";
import { EyeOff, Flag, Heart, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Submission } from "@/lib/domain/types";
import { distance, points as formatPoints, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Menu, type MenuItem } from "../menu";

export function SubmissionStatusBadges({ submission }: { submission: Submission }) {
  return (
    <>
      {submission.status === "pending" && <Badge tone="warning">ממתינה</Badge>}
      {submission.status === "rejected" && <Badge tone="danger">נדחתה</Badge>}
      {submission.hidden && (
        <Badge tone="neutral">
          <EyeOff className="size-3" aria-hidden /> מוסתרת
        </Badge>
      )}
      {submission.flagged && (
        <Badge tone="danger">
          <Flag className="size-3" aria-hidden /> מסומנת
        </Badge>
      )}
    </>
  );
}

export function SubmissionMedia({
  submission,
  className,
}: {
  submission: Submission;
  className?: string;
}) {
  const media = submission.media;
  if (!media) {
    if (submission.textAnswer) {
      return (
        <blockquote
          className={cn(
            "rounded-md bg-surface-inset px-4 py-3 text-base font-semibold",
            className,
          )}
        >
          “{submission.textAnswer}”
        </blockquote>
      );
    }
    if (submission.location) {
      return (
        <p
          className={cn(
            "flex items-center gap-2 rounded-md bg-surface-inset px-4 py-3 text-sm",
            className,
          )}
        >
          <MapPin className="size-4 text-muted-foreground" aria-hidden />
          {distance(submission.location.distanceM)} מהיעד
        </p>
      );
    }
    return null;
  }

  if (media.kind === "video") {
    return (
      <video
        controls
        preload="metadata"
        src={media.url}
        className={cn("w-full rounded-md bg-black", className)}
      />
    );
  }

  if (media.kind === "audio") {
    return <audio controls src={media.url} className={cn("w-full", className)} />;
  }

  return (
    // Storage download URLs are not configured for next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      alt={submission.caption ?? `הגשה למשימה ${submission.missionName}`}
      loading="lazy"
      className={cn("w-full rounded-md object-cover", className)}
    />
  );
}

export function SubmissionCard({
  submission,
  menuItems,
  selected,
  onToggleSelect,
  className,
}: {
  submission: Submission;
  menuItems?: MenuItem[];
  selected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}) {
  const total = submission.points + (submission.bonusPoints ?? 0);

  return (
    <Card
      id={submission.id}
      className={cn(
        "overflow-hidden",
        selected && "ring-2 ring-primary",
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={onToggleSelect}
            aria-label={`לבחור את ההגשה של ${submission.teamName}`}
            className="mt-1.5 size-4"
          />
        )}
        <Avatar name={submission.teamName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{submission.teamName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {submission.participantName} · {timeAgo(submission.createdAt)}
          </p>
        </div>
        {menuItems && (
          <Menu
            label={`פעולות על ההגשה של ${submission.teamName}`}
            items={menuItems}
          />
        )}
      </div>

      <div className="px-4">
        <SubmissionMedia submission={submission} />
      </div>

      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="brand">{submission.missionName}</Badge>
          <Badge tone={total > 0 ? "success" : "neutral"}>
            {formatPoints(total)} נק'
            {submission.bonusPoints
              ? ` (${formatPoints(submission.bonusPoints, true)} בונוס)`
              : ""}
          </Badge>
          <SubmissionStatusBadges submission={submission} />
        </div>

        {submission.caption && (
          <p className="text-sm whitespace-pre-wrap">{submission.caption}</p>
        )}

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Heart className="size-3.5" aria-hidden />
          {submission.likeCount ?? 0}{" "}
          {submission.likeCount === 1 ? "לייק" : "לייקים"}
          {submission.gradeReason ? ` · ${submission.gradeReason}` : ""}
        </p>
      </div>
    </Card>
  );
}
