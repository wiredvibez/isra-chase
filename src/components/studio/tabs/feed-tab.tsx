"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedChase } from "../chase-context";
import { useSubmissions } from "../data-hooks";
import { TabHeader } from "../section";
import { SubmissionCard } from "../submissions/submission-card";
import { useSubmissionActions } from "../submissions/submission-actions";

export function FeedTab() {
  const { chaseId } = useLoadedChase();
  const { data: submissions, loading } = useSubmissions(chaseId);
  const { items, dialogs } = useSubmissionActions(chaseId);

  // Deep link from "Copy link". Read from location rather than useSearchParams
  // so this tab never needs a Suspense boundary of its own.
  React.useEffect(() => {
    if (loading) return;
    const id = new URLSearchParams(window.location.search).get("submission");
    if (!id) return;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading]);

  return (
    <div className="space-y-5">
      <TabHeader
        title="Activity feed"
        description="Everything as it lands, newest first."
      />

      <p aria-live="polite" className="sr-only">
        {submissions.length} submissions loaded
      </p>

      {loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      )}

      {!loading && !submissions.length && (
        <EmptyState
          icon={<Activity className="size-6" aria-hidden />}
          title="Nothing submitted yet"
          description="As soon as a team completes a mission it shows up here, live."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {submissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            menuItems={items(submission)}
          />
        ))}
      </div>

      {dialogs}
    </div>
  );
}
