"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, QrCode, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { countdown } from "@/lib/format";
import { useChase } from "./chase-context";
import { InvitePanel } from "./invite-panel";
import { StudioNav } from "./studio-nav";
import { STATUS_LABEL, STATUS_TONE, stampMs } from "./studio-utils";

/** Ticking "2 d 4 h left" next to the status badge while a chase is live. */
function Countdown({ endMs }: { endMs: number }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-sm font-semibold text-muted-foreground tabular-nums">
      {countdown(endMs, now)}
    </span>
  );
}

export function ChaseShell({ children }: { children: React.ReactNode }) {
  const { chase, chaseId, loading, error } = useChase();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !chase) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <EmptyState
          icon={<TriangleAlert className="size-6" aria-hidden />}
          title="This chase isn't available"
          description={
            error?.message ??
            "It may have been deleted, or you no longer have access to it."
          }
          action={
            <Button onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const endMs = stampMs(chase.endAt);

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All chases
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {chase.name}
            </h1>
            <Badge tone={STATUS_TONE[chase.status]}>
              {STATUS_LABEL[chase.status]}
            </Badge>
            {chase.status === "live" && endMs && <Countdown endMs={endMs} />}
          </div>
        </div>
        <Button
          variant="outline"
          className="lg:hidden"
          onClick={() => setInviteOpen(true)}
        >
          <QrCode className="size-4" aria-hidden />
          Invite
        </Button>
      </div>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <StudioNav chaseId={chaseId} />
          <div className="mt-4 hidden rounded-lg border border-border bg-surface p-4 shadow-card lg:block">
            <p className="mb-3 font-display text-sm font-bold">Invite players</p>
            <InvitePanel chase={chase} />
          </div>
        </div>

        <div className="min-w-0 py-5 lg:py-0">{children}</div>
      </div>

      <Sheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite players"
      >
        <InvitePanel chase={chase} />
      </Sheet>
    </div>
  );
}
