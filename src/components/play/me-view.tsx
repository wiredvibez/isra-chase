"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { collection, orderBy, query, where } from "firebase/firestore";
import { toast } from "sonner";
import {
  DoorOpen,
  LogOut,
  Sparkles,
  Trash,
  UsersRound,
} from "lucide-react";
import { getDb } from "@/lib/firebase/client";
import { useLiveQuery } from "@/lib/hooks/use-firestore";
import { apiDelete, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { points as fmtPoints, shortDateTime, timeAgo } from "@/lib/format";
import { plural } from "@/lib/utils";
import type { Adjustment, Participant, Submission, SubmissionStatus } from "@/lib/domain/types";
import { usePlay } from "./play-provider";
import { MissionIcon } from "./mission-icon";

const STATUS_TONE: Record<SubmissionStatus, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  approved: "Approved",
  pending: "In review",
  rejected: "Not accepted",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function MeView() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { chaseId, uid, team, participant, refreshMissions } = usePlay();
  const teamId = participant?.teamId ?? null;

  const membersQuery = React.useMemo(
    () =>
      teamId
        ? query(
            collection(getDb(), "chases", chaseId, "participants"),
            where("teamId", "==", teamId),
          )
        : null,
    [chaseId, teamId],
  );
  const { data: memberDocs } = useLiveQuery<Participant & { id: string }>(
    membersQuery,
    [chaseId, teamId],
  );
  // The participant document is keyed by uid, so that field is not stored in
  // the document — Firestore hands it back as `id`. Restore it, otherwise the
  // "this is you" check below never matches anyone.
  const members = React.useMemo(
    () => memberDocs.map((m) => ({ ...m, uid: m.uid ?? m.id })),
    [memberDocs],
  );

  const submissionsQuery = React.useMemo(
    () =>
      teamId
        ? query(
            collection(getDb(), "chases", chaseId, "submissions"),
            where("teamId", "==", teamId),
            orderBy("createdAt", "desc"),
          )
        : null,
    [chaseId, teamId],
  );
  const { data: submissions, loading: submissionsLoading } =
    useLiveQuery<Submission>(submissionsQuery, [chaseId, teamId]);

  const adjustmentsQuery = React.useMemo(
    () =>
      teamId
        ? query(
            collection(getDb(), "chases", chaseId, "adjustments"),
            where("teamId", "==", teamId),
            orderBy("createdAt", "desc"),
          )
        : null,
    [chaseId, teamId],
  );
  const { data: adjustments } = useLiveQuery<Adjustment>(adjustmentsQuery, [
    chaseId,
    teamId,
  ]);

  const [deleting, setDeleting] = React.useState<Submission | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  async function deleteSubmission() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/submissions/${deleting.id}`, {
        reason: null,
      });
      setDeleting(null);
      await refreshMissions();
      toast.success("Submission deleted — the mission is open again.");
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "Couldn't delete that submission.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function leaveChase() {
    setBusy(true);
    try {
      await apiPost(`/api/chases/${chaseId}/leave`);
      router.push("/join");
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "Couldn't leave the chase.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar name={team?.name ?? "Team"} src={team?.photoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold">
              {team?.name ?? <Skeleton className="h-6 w-32" />}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge tone="neutral">
                {team?.mode === "solo" ? "Solo player" : "Team"}
              </Badge>
              <span>
                {members.length} {plural(members.length, "member")}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 text-center">
          <p className="font-display text-5xl font-bold tabular-nums text-primary">
            {fmtPoints(team?.points ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plural(team?.points ?? 0, "point")} in total
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-surface-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">From missions</dt>
              <dd className="font-display text-lg font-bold tabular-nums">
                {fmtPoints(team?.basePoints ?? 0)}
              </dd>
            </div>
            <div className="rounded-md bg-surface-muted px-3 py-2">
              <dt className="text-xs text-muted-foreground">Bonus & adjustments</dt>
              <dd className="font-display text-lg font-bold tabular-nums">
                {fmtPoints(team?.bonusPoints ?? 0, true)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Section title="Members">
        <ul className="flex flex-col gap-2">
          {members.length === 0 ? (
            <li>
              <Skeleton className="h-14 w-full" />
            </li>
          ) : (
            members.map((member) => (
              <li
                key={member.uid}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <Avatar
                  name={member.displayName}
                  src={member.photoURL}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {member.displayName}
                    {member.uid === uid && (
                      <span className="ms-1.5 text-xs font-semibold text-primary">
                        you
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.submissionCount}{" "}
                    {plural(member.submissionCount, "submission")}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>
      </Section>

      {adjustments.length > 0 && (
        <Section title="Bonus history">
          <ul className="flex flex-col gap-2">
            {adjustments.map((adjustment) => (
              <li
                key={adjustment.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold-400/20 text-gold-500">
                  <Sparkles className="size-[1.125rem]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {fmtPoints(adjustment.points, true)} points
                  </p>
                  {adjustment.reason && (
                    <p className="text-sm break-words text-muted-foreground">
                      {adjustment.reason}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {adjustment.byName} · {timeAgo(adjustment.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Your submissions">
        {submissionsLoading && submissions.length === 0 ? (
          <Skeleton className="h-20 w-full" />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={<UsersRound className="size-5" />}
            title="Nothing submitted yet"
            description="Head to the missions tab and put something on the board."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {submissions.map((submission) => (
              <li
                key={submission.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
              >
                {submission.media?.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={submission.media.url}
                    alt=""
                    loading="lazy"
                    className="size-11 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <MissionIcon type={submission.missionType} size="sm" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {submission.missionName}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[submission.status]}>
                      {STATUS_LABEL[submission.status]}
                    </Badge>
                    {submission.status === "approved" && (
                      <Badge tone="accent">
                        +{fmtPoints(submission.points + (submission.bonusPoints ?? 0))}
                      </Badge>
                    )}
                  </p>
                  {submission.gradeReason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {submission.gradeReason}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {submission.participantName} ·{" "}
                    {shortDateTime(submission.createdAt)}
                  </p>
                </div>

                {submission.participantUid === uid && (
                  <button
                    type="button"
                    onClick={() => setDeleting(submission)}
                    aria-label={`Delete your submission for ${submission.missionName}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-danger-surface hover:text-danger"
                  >
                    <Trash className="size-[1.125rem]" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Account">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => setLeaving(true)}
          >
            <DoorOpen className="size-5" aria-hidden />
            Leave this chase
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full justify-start"
            onClick={() => {
              void signOut().then(() => router.push("/join"));
            }}
          >
            <LogOut className="size-5" aria-hidden />
            Sign out
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={deleteSubmission}
        loading={busy}
        confirmLabel="Delete submission"
        title="Delete this submission?"
        description="Its points come off your team's total and the mission opens up again."
      />

      <ConfirmDialog
        open={leaving}
        onClose={() => setLeaving(false)}
        onConfirm={leaveChase}
        loading={busy}
        confirmLabel="Leave chase"
        title="Leave this chase?"
        description="You'll drop out of your team. Depending on the organizer's settings you may need the join code to come back."
      />
    </div>
  );
}
