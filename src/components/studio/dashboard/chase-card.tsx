"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Trash2, UserPlus, Users, Image as ImageIcon, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Chase } from "@/lib/domain/types";
import { Menu } from "../menu";
import { STATUS_LABEL, STATUS_TONE } from "../studio-utils";

export function ChaseCard({
  chase,
  canDelete,
  onDuplicate,
  onInvite,
  onDelete,
}: {
  chase: Chase;
  canDelete: boolean;
  onDuplicate: () => void;
  onInvite: () => void;
  onDelete: () => void;
}) {
  const stats = chase.stats ?? {
    teamCount: 0,
    participantCount: 0,
    submissionCount: 0,
    missionCount: 0,
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <Link
        href={`/studio/${chase.id}/details`}
        className="block aspect-[16/9] w-full bg-surface-muted"
      >
        {chase.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chase.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-8" aria-hidden />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Badge tone={STATUS_TONE[chase.status]}>
              {STATUS_LABEL[chase.status]}
            </Badge>
            <h3 className="mt-1.5 font-display text-base font-bold">
              <Link
                href={`/studio/${chase.id}/details`}
                className="hover:underline"
              >
                {chase.name}
              </Link>
            </h3>
          </div>
          <Menu
            label={`פעולות עבור ${chase.name}`}
            items={[
              {
                id: "duplicate",
                label: "שכפול",
                icon: <Copy className="size-4" aria-hidden />,
                onSelect: onDuplicate,
              },
              {
                id: "invite",
                label: "הזמנת שותפים",
                icon: <UserPlus className="size-4" aria-hidden />,
                onSelect: onInvite,
              },
              ...(canDelete
                ? [
                    {
                      id: "delete",
                      label: "מחיקת המרדף",
                      icon: <Trash2 className="size-4" aria-hidden />,
                      tone: "danger" as const,
                      onSelect: onDelete,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden />
            <dt className="sr-only">קבוצות</dt>
            <dd>
              {stats.teamCount === 1 ? "קבוצה אחת" : `${stats.teamCount} קבוצות`}
            </dd>
          </div>
          <div className="flex items-center gap-1">
            <Camera className="size-3.5" aria-hidden />
            <dt className="sr-only">הגשות</dt>
            <dd>
              {stats.submissionCount === 1
                ? "הגשה אחת"
                : `${stats.submissionCount} הגשות`}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}
