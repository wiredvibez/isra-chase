"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ListChecks, Rss, Trophy, UsersRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { points as fmtPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlay } from "./play-provider";
import { useNotifications, useReadState } from "./use-notifications";
import { NotificationsSheet } from "./notifications-sheet";
import { Countdown } from "./countdown";

const TABS = [
  { id: "missions", label: "Missions", icon: ListChecks, segment: "" },
  { id: "feed", label: "Feed", icon: Rss, segment: "/feed" },
  { id: "leaderboard", label: "Ranks", icon: Trophy, segment: "/leaderboard" },
  { id: "me", label: "Me", icon: UsersRound, segment: "/me" },
] as const;

/** Reserves room for the fixed tab bar, including the home-indicator inset. */
const CONTENT_PADDING = "pb-[calc(4.75rem+env(safe-area-inset-bottom))]";

function BottomTabBar({ chaseId }: { chaseId: string }) {
  const pathname = usePathname();
  const base = `/play/${chaseId}`;

  return (
    <nav
      aria-label="Play sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const href = `${base}${tab.segment}`;
          const active = tab.segment
            ? pathname.startsWith(href)
            : pathname === base;
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-bold transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-[1.375rem]", active && "fill-primary/10")} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function PlayHeader() {
  const { chase, chaseId, team, uid, participant } = usePlay();
  const [open, setOpen] = React.useState(false);
  const { notifications, loading } = useNotifications(
    chaseId,
    participant?.teamId ?? null,
  );
  const { read, markRead } = useReadState(uid, chaseId);

  const unread = notifications.filter((n) => !read.has(n.id)).length;

  // Opening the sheet is the read receipt — the same gesture in every app.
  function openSheet() {
    setOpen(true);
    markRead(notifications.map((n) => n.id));
  }

  const endsAt = chase?.endAt?.toMillis?.() ?? null;
  const startsAt = chase?.startAt?.toMillis?.() ?? null;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold leading-tight">
            {chase?.name ?? <Skeleton className="h-4 w-32" />}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {team && (
              <span className="font-semibold text-foreground">
                {fmtPoints(team.points)} pts
              </span>
            )}
            {chase?.status === "live" && endsAt && (
              <Countdown toMs={endsAt} className="tabular-nums" />
            )}
            {chase?.status === "scheduled" && startsAt && (
              <span className="tabular-nums">
                starts in <Countdown toMs={startsAt} />
              </span>
            )}
            {chase?.status === "ended" && <span>Chase ended</span>}
            {chase?.status === "draft" && <span>Not started yet</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={openSheet}
          aria-label={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
          className="relative flex size-11 items-center justify-center rounded-full text-foreground hover:bg-surface-muted"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute end-1 top-1 min-w-[1.125rem] rounded-full bg-accent px-1 text-[10px] font-bold leading-[1.125rem] text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      <NotificationsSheet
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifications}
        loading={loading}
        readIds={read}
      />
    </header>
  );
}

function Gate({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center p-4">
      <Card className="w-full">
        <CardContent className="space-y-3 p-6 text-center">
          <h1 className="font-display text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {action}
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * The app shell. Mission detail deliberately takes over the whole screen —
 * a composer with a bottom-anchored submit button has no room to share the
 * thumb zone with a tab bar — so the chrome is dropped on that route while
 * the provider (and its subscriptions) stay mounted.
 */
export function PlayShell({ children }: { children: React.ReactNode }) {
  const { chaseId, chase, uid, authLoading, membershipLoading, participant } =
    usePlay();
  const pathname = usePathname();
  const immersive = pathname.includes("/missions/");

  if (authLoading || membershipLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!uid) {
    return (
      <Gate
        title="Sign in to play"
        description="Enter your join code to get into the chase — no account required."
        action={
          <Link
            href="/join"
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground"
          >
            Go to join
          </Link>
        }
      />
    );
  }

  if (!participant) {
    return (
      <Gate
        title="You haven't joined this chase"
        description="Ask the organizer for the join code, or scan their QR code."
        action={
          <Link
            href={chase?.joinCode ? `/join/${chase.joinCode}` : "/join"}
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground"
          >
            Join this chase
          </Link>
        }
      />
    );
  }

  if (immersive) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-background">
      <PlayHeader />
      <main className={cn("mx-auto max-w-2xl px-4 py-4", CONTENT_PADDING)}>
        {children}
      </main>
      <BottomTabBar chaseId={chaseId} />
    </div>
  );
}
