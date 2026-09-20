"use client";

import Link from "next/link";
import { Check, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { points as fmtPoints, radiusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MissionIcon } from "./mission-icon";
import { Countdown } from "./countdown";
import type { PlayMission, TextBadge } from "./types";

const TEXT_BADGE_COPY: Record<TextBadge, { label: string; hint: string }> = {
  open: { label: "Open answer", hint: "Anything you write is accepted" },
  exact: { label: "Exact match", hint: "Spelling has to be spot on" },
  approximate: { label: "Close enough", hint: "Near-misses are accepted" },
};

export function MissionCard({
  mission,
  chaseId,
}: {
  mission: PlayMission;
  chaseId: string;
}) {
  const expired = mission.availability.state === "expired";
  const earned = mission.submission?.points ?? 0;
  const pending = mission.submission?.status === "pending";

  return (
    <li>
      <Link
        href={`/play/${chaseId}/missions/${mission.id}`}
        className={cn(
          "flex items-start gap-3 rounded-lg border border-border bg-surface p-3 shadow-card transition-colors",
          "min-h-[4.5rem] active:bg-surface-muted",
          mission.completed && "border-success/30 bg-success-surface/40",
          expired && !mission.completed && "opacity-60",
        )}
      >
        <MissionIcon type={mission.type} />

        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.95rem] font-bold leading-snug break-words">
            {mission.name}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={mission.completed ? "success" : "accent"}>
              {mission.completed
                ? `+${fmtPoints(earned)} pts`
                : `${fmtPoints(mission.points)} pts`}
            </Badge>

            {mission.type === "text" && mission.text && (
              <Badge tone="info" title={TEXT_BADGE_COPY[mission.text.badge].hint}>
                {TEXT_BADGE_COPY[mission.text.badge].label}
              </Badge>
            )}

            {mission.type === "gps" && mission.gps && (
              <Badge tone="neutral">
                <MapPin className="size-3" aria-hidden />
                within {radiusLabel(mission.gps.radiusM)}
              </Badge>
            )}

            {pending && <Badge tone="warning">Awaiting review</Badge>}

            {expired && !mission.completed && <Badge tone="danger">Expired</Badge>}

            {!expired && !mission.completed && mission.availability.expiresAt && (
              <Badge tone="warning">
                <Clock className="size-3" aria-hidden />
                <Countdown toMs={mission.availability.expiresAt} />
              </Badge>
            )}
          </div>
        </div>

        {mission.completed && (
          <span
            className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-white"
            aria-label="Completed"
          >
            <Check className="size-4" />
          </span>
        )}
      </Link>
    </li>
  );
}
