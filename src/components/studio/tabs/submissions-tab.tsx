"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, ClipboardCheck, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Submission } from "@/lib/domain/types";
import { useLoadedChase } from "../chase-context";
import { useMissions, useSubmissions, useTeams } from "../data-hooks";
import { TabHeader } from "../section";
import { DownloadPanel } from "../submissions/download-panel";
import { ReviewQueue } from "../submissions/review-queue";
import { SubmissionCard } from "../submissions/submission-card";
import { useSubmissionActions, type ModerationAction } from "../submissions/submission-actions";
import { toastError } from "../studio-utils";

type GroupBy = "mission" | "team_points" | "team_alpha";
type StatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "hidden"
  | "flagged";

export function SubmissionsTab() {
  const { chase, chaseId } = useLoadedChase();
  const { data: submissions, loading } = useSubmissions(chaseId, 500);
  const { data: missions } = useMissions(chaseId);
  const { data: teams } = useTeams(chaseId);
  const { items, dialogs, moderate } = useSubmissionActions(chaseId);

  const [groupBy, setGroupBy] = React.useState<GroupBy>("mission");
  const [status, setStatus] = React.useState<StatusFilter>(
    chase.moderationMode === "review" ? "pending" : "all",
  );
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const pending = submissions.filter((s) => s.status === "pending");

  const filtered = React.useMemo(
    () =>
      submissions.filter((s) => {
        switch (status) {
          case "all":
            return true;
          case "hidden":
            return s.hidden;
          case "flagged":
            return s.flagged;
          default:
            return s.status === status;
        }
      }),
    [submissions, status],
  );

  const groups = React.useMemo(() => {
    const map = new Map<string, { label: string; rows: Submission[] }>();
    for (const submission of filtered) {
      const key =
        groupBy === "mission" ? submission.missionId : submission.teamId;
      const label =
        groupBy === "mission" ? submission.missionName : submission.teamName;
      const entry = map.get(key) ?? { label, rows: [] };
      entry.rows.push(submission);
      map.set(key, entry);
    }

    const ordered = [...map.entries()];
    if (groupBy === "mission") {
      const order = new Map(missions.map((m, i) => [m.id, i]));
      ordered.sort(
        (a, b) => (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999),
      );
    } else if (groupBy === "team_points") {
      const order = new Map(teams.map((t, i) => [t.id, i]));
      ordered.sort(
        (a, b) => (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999),
      );
    } else {
      ordered.sort((a, b) => a[1].label.localeCompare(b[1].label));
    }
    return ordered;
  }, [filtered, groupBy, missions, teams]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(action: ModerationAction) {
    const targets = submissions.filter((s) => selected.has(s.id));
    if (!targets.length) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        targets.map((submission) => moderate(submission, action)),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) {
        toastError(new Error(`${failed} of ${targets.length} could not be updated.`));
      } else {
        toast.success(`${targets.length} submissions updated.`);
      }
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="Submissions"
        description="Judge, group and export everything players have sent in."
      />

      {chase.moderationMode === "review" && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">
            Review queue{" "}
            <span className="text-muted-foreground">({pending.length})</span>
          </h2>
          <ReviewQueue
            submissions={pending}
            onApprove={(submission) => moderate(submission, "approve")}
            onReject={(submission) => moderate(submission, "reject")}
          />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <label htmlFor="group-by" className="sr-only">
            Group submissions by
          </label>
          <Select
            id="group-by"
            className="max-w-56"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          >
            <option value="mission">Group by mission</option>
            <option value="team_points">Group by team — by points</option>
            <option value="team_alpha">Group by team — alphabetical</option>
          </Select>

          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <Select
            id="status-filter"
            className="max-w-44"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden</option>
            <option value="flagged">Flagged</option>
          </Select>
        </div>
      </div>

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-3 shadow-card"
        >
          <p className="text-sm font-semibold">{selected.size} selected</p>
          <Button size="sm" variant="success" loading={bulkBusy} onClick={() => void bulk("approve")}>
            <Check className="size-4" aria-hidden />
            Approve
          </Button>
          <Button size="sm" variant="danger" loading={bulkBusy} onClick={() => void bulk("reject")}>
            <X className="size-4" aria-hidden />
            Reject
          </Button>
          <Button size="sm" variant="outline" loading={bulkBusy} onClick={() => void bulk("hide")}>
            <EyeOff className="size-4" aria-hidden />
            Hide
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      )}

      {!loading && !filtered.length && (
        <EmptyState
          icon={<ClipboardCheck className="size-6" aria-hidden />}
          title="Nothing matches this filter"
          description="Try a different status, or wait for the next submission to land."
          action={
            <Button variant="outline" onClick={() => setStatus("all")}>
              Show everything
            </Button>
          }
        />
      )}

      {groups.map(([key, group]) => (
        <section key={key} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold">{group.label}</h2>
            <span className="text-xs text-muted-foreground">
              {group.rows.length}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() =>
                setSelected((current) => {
                  const next = new Set(current);
                  const allSelected = group.rows.every((r) => next.has(r.id));
                  for (const row of group.rows) {
                    if (allSelected) next.delete(row.id);
                    else next.add(row.id);
                  }
                  return next;
                })
              }
            >
              Select group
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.rows.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                menuItems={items(submission)}
                selected={selected.has(submission.id)}
                onToggleSelect={() => toggle(submission.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <DownloadPanel submissions={submissions} chaseName={chase.name} />

      {dialogs}
    </div>
  );
}
