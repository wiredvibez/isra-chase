"use client";

import * as React from "react";
import {
  BellOff,
  CircleCheckBig,
  CircleX,
  LockOpen,
  Megaphone,
  Scale,
  Sparkles,
  Trash,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/lib/domain/types";

const ICONS: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  bonus: { icon: Sparkles, tone: "bg-gold-400/20 text-gold-500" },
  adjustment: { icon: Scale, tone: "bg-surface-inset text-muted-foreground" },
  submission_deleted: { icon: Trash, tone: "bg-danger-surface text-danger" },
  submission_approved: {
    icon: CircleCheckBig,
    tone: "bg-success-surface text-success",
  },
  submission_rejected: { icon: CircleX, tone: "bg-danger-surface text-danger" },
  mission_unlocked: { icon: LockOpen, tone: "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100" },
  broadcast: { icon: Megaphone, tone: "bg-info-surface text-info" },
};

function NotificationRow({
  notification,
  unread,
}: {
  notification: AppNotification;
  unread: boolean;
}) {
  const meta = ICONS[notification.type] ?? ICONS.broadcast;
  const Icon = meta.icon;
  return (
    <li
      className={cn(
        "flex gap-3 rounded-md border border-border p-3",
        unread ? "bg-brand-50/60 dark:bg-brand-900/30" : "bg-surface",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          meta.tone,
        )}
        aria-hidden
      >
        <Icon className="size-[1.125rem]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{notification.title}</p>
        {notification.body && (
          <p className="mt-0.5 text-sm break-words text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {timeAgo(notification.createdAt)}
          {unread && (
            <span className="ms-2 font-bold text-primary">New</span>
          )}
        </p>
      </div>
    </li>
  );
}

export function NotificationsSheet({
  open,
  onClose,
  notifications,
  loading,
  readIds,
}: {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  loading: boolean;
  readIds: Set<string>;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Notifications">
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="size-5" />}
          title="Nothing yet"
          description="Bonus points, announcements and mission news will land here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              unread={!readIds.has(notification.id)}
            />
          ))}
        </ul>
      )}
    </Sheet>
  );
}
