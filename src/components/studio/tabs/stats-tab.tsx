"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api-client";
import type { Submission } from "@/lib/domain/types";
import { dateTime, shortDateTime } from "@/lib/format";
import { useLoadedChase } from "../chase-context";
import {
  useMissions,
  useParticipants,
  useSubmissions,
  useTeams,
} from "../data-hooks";
import { TabHeader } from "../section";
import { BarChart, type BarRow } from "../stats/bar-chart";

/**
 * The stats route's payload shape is only sketched in the API contract, so
 * every field is optional here and the tab falls back to numbers derived from
 * the live Firestore data it already has.
 */
interface StatsResponse {
  tiles?: {
    activeTeams?: number;
    totalTeams?: number;
    submissions?: number;
    missionCompletionPct?: number;
  };
  // GET /api/chases/[id]/stats returns chart rows already shaped for display.
  popularMissions?: BarRow[];
  engagedTeams?: BarRow[];
}

const STATUS_LABEL: Record<Submission["status"], string> = {
  pending: "ממתינה",
  approved: "אושרה",
  rejected: "נדחתה",
};

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function ExportRow({
  chaseId,
  report,
  label,
}: {
  chaseId: string;
  report: "participants" | "submissions" | "leaderboard";
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      {(["csv", "xlsx", "json"] as const).map((format) => (
        <a
          key={format}
          href={`/api/chases/${chaseId}/export?report=${report}&format=${format}`}
          download
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border-strong px-3 text-sm font-semibold hover:bg-surface-muted"
        >
          <Download className="size-3.5" aria-hidden />
          {format.toUpperCase()}
          <span className="sr-only"> ייצוא של {label}</span>
        </a>
      ))}
    </div>
  );
}

export function StatsTab() {
  const { chase, chaseId } = useLoadedChase();
  const { data: teams } = useTeams(chaseId);
  const { data: participants } = useParticipants(chaseId);
  const { data: missions } = useMissions(chaseId);
  const { data: submissions, loading } = useSubmissions(chaseId, 500);

  const [remote, setRemote] = React.useState<StatsResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiGet<StatsResponse>(`/api/chases/${chaseId}/stats`)
      .then((res) => {
        if (!cancelled) setRemote(res);
      })
      // A missing or failing stats route is not worth a toast: the derived
      // numbers below are already correct.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [chaseId]);

  const derived = React.useMemo(() => {
    const published = missions.filter((m) => !m.isDraft);
    const approved = submissions.filter((s) => s.status === "approved");
    const possible = published.length * Math.max(teams.length, 1);

    const byMission = new Map<string, BarRow>();
    for (const submission of approved) {
      const row = byMission.get(submission.missionId) ?? {
        id: submission.missionId,
        label: submission.missionName,
        value: 0,
      };
      row.value += 1;
      byMission.set(submission.missionId, row);
    }

    const byTeam = new Map<string, BarRow>();
    for (const submission of submissions) {
      const row = byTeam.get(submission.teamId) ?? {
        id: submission.teamId,
        label: submission.teamName,
        value: 0,
      };
      row.value += 1;
      byTeam.set(submission.teamId, row);
    }

    return {
      activeTeams: teams.filter((t) => (t.submissionCount ?? 0) > 0).length,
      totalTeams: teams.length,
      submissions: chase.stats?.submissionCount ?? submissions.length,
      completionPct: possible ? Math.round((approved.length / possible) * 100) : 0,
      popularMissions: [...byMission.values()].sort((a, b) => b.value - a.value),
      engagedTeams: [...byTeam.values()].sort((a, b) => b.value - a.value),
    };
  }, [missions, submissions, teams, chase.stats?.submissionCount]);

  const tiles = {
    activeTeams: remote?.tiles?.activeTeams ?? derived.activeTeams,
    totalTeams: remote?.tiles?.totalTeams ?? derived.totalTeams,
    submissions: remote?.tiles?.submissions ?? derived.submissions,
    completionPct:
      remote?.tiles?.missionCompletionPct ?? derived.completionPct,
  };

  // Prefer the server's rows; fall back to deriving them from the live
  // submission snapshot while the request is still in flight.
  const popularMissions =
    remote?.popularMissions?.length ? remote.popularMissions : derived.popularMissions;
  const engagedTeams =
    remote?.engagedTeams?.length ? remote.engagedTeams : derived.engagedTeams;

  const recent: Submission[] = submissions.slice(0, 50);

  return (
    <div className="space-y-5">
      <TabHeader
        title="נתונים"
        description="איך המרדף באמת מתקדם, וכל הדוחות שאפשר לקחת החוצה."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="קבוצות פעילות" value={String(tiles.activeTeams)} />
        <Tile label={'סה"כ קבוצות'} value={String(tiles.totalTeams)} />
        <Tile label="הגשות" value={String(tiles.submissions)} />
        <Tile label="השלמת משימות" value={`${tiles.completionPct}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart
          title="המשימות הכי פופולריות"
          rows={popularMissions}
          emptyMessage="עוד אין הגשות מאושרות."
        />
        <BarChart
          title="הקבוצות הכי פעילות"
          rows={engagedTeams}
          tone="accent"
          emptyMessage="אף קבוצה עוד לא שלחה הגשה."
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-display text-base font-bold">ייצוא דוחות</h2>
          <div className="mt-2 divide-y divide-border">
            <ExportRow chaseId={chaseId} report="participants" label="משתתפים" />
            <ExportRow chaseId={chaseId} report="submissions" label="הגשות" />
            <ExportRow chaseId={chaseId} report="leaderboard" label="טבלת המובילים" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-display text-base font-bold">משתתפים</h2>
        </div>
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">המשתתפים והפעילות שלהם</caption>
          <thead>
            <tr className="border-b border-border text-start">
              <th scope="col" className="px-4 py-3 font-semibold">שם</th>
              <th scope="col" className="px-4 py-3 font-semibold">קבוצה</th>
              <th scope="col" className="px-4 py-3 font-semibold">אימייל</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">
                הגשות
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">הצטרפו</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((person) => (
              <tr key={person.uid} className="border-b border-border last:border-0">
                <th scope="row" className="px-4 py-2 text-start font-semibold">
                  {person.displayName}
                </th>
                <td className="px-4 py-2">
                  {teams.find((t) => t.id === person.teamId)?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {person.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-end tabular-nums">
                  {person.submissionCount ?? 0}
                </td>
                <td className="px-4 py-2 text-muted-foreground">
                  {dateTime(person.joinedAt)}
                </td>
              </tr>
            ))}
            {!participants.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  עוד אף אחד לא הצטרף.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="overflow-x-auto">
        <div className="p-4 pb-0">
          <h2 className="font-display text-base font-bold">
            הגשות{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (50 האחרונות)
            </span>
          </h2>
        </div>
        {loading ? (
          <div className="p-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">ההגשות האחרונות</caption>
            <thead>
              <tr className="border-b border-border text-start">
                <th scope="col" className="px-4 py-3 font-semibold">משימה</th>
                <th scope="col" className="px-4 py-3 font-semibold">קבוצה</th>
                <th scope="col" className="px-4 py-3 font-semibold">שחקן</th>
                <th scope="col" className="px-4 py-3 font-semibold">סטטוס</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  נקודות
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">מתי</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((submission) => (
                <tr key={submission.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-2 text-start font-semibold">
                    {submission.missionName}
                  </th>
                  <td className="px-4 py-2">{submission.teamName}</td>
                  <td className="px-4 py-2">{submission.participantName}</td>
                  <td className="px-4 py-2">{STATUS_LABEL[submission.status]}</td>
                  <td className="px-4 py-2 text-end tabular-nums">
                    {submission.points + (submission.bonusPoints ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {shortDateTime(submission.createdAt)}
                  </td>
                </tr>
              ))}
              {!recent.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    עוד אין הגשות.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
