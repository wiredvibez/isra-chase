"use client";

import * as React from "react";
import { collection, query } from "firebase/firestore";
import { EyeOff, Medal, Trophy } from "lucide-react";
import { getDb } from "@/lib/firebase/client";
import { useLiveQuery } from "@/lib/hooks/use-firestore";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { rankTeams } from "@/lib/domain/leaderboard";
import { points as fmtPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/domain/types";
import { usePlay } from "./play-provider";

/** Gold / silver / bronze, then plain. */
const PODIUM = [
  "border-gold-400/50 bg-gold-400/12",
  "border-border-strong bg-surface-inset/60",
  "border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-accent/8",
] as const;

function RankMark({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold",
          rank === 1 && "bg-gold-500 text-white",
          rank === 2 && "bg-border-strong text-foreground",
          rank === 3 && "bg-accent text-accent-foreground",
        )}
      >
        {rank === 1 ? <Trophy className="size-[1.125rem]" aria-hidden /> : <Medal className="size-[1.125rem]" aria-hidden />}
      </span>
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center font-display text-sm font-bold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

function hiddenExplanation(
  visibility: string | undefined,
  revealed: boolean,
): string {
  if (visibility === "hidden_until_end") {
    return "הדירוג המלא נחשף רק כשהמרדף נגמר. בינתיים הסכום שלכם כאן למעלה.";
  }
  if (visibility === "hidden_until_reveal" && !revealed) {
    return "הטבלה מוסתרת עד שהמארגן יחשוף אותה. בינתיים הסכום שלכם כאן למעלה.";
  }
  return "הדירוג לא גלוי כרגע.";
}

export function LeaderboardView() {
  const { chaseId, chase, participant, team } = usePlay();
  const myTeamId = participant?.teamId ?? null;

  const teamsQuery = React.useMemo(
    () => query(collection(getDb(), "chases", chaseId, "teams")),
    [chaseId],
  );
  const { data: teams, loading } = useLiveQuery<Team>(teamsQuery, [chaseId]);

  const ranked = React.useMemo(() => rankTeams(teams), [teams]);
  const mine = ranked.find((row) => row.team.id === myTeamId) ?? null;

  const visible =
    chase?.leaderboardVisibility === "visible" ||
    (chase?.leaderboardVisibility === "hidden_until_reveal" &&
      chase.leaderboardRevealed) ||
    (chase?.leaderboardVisibility === "hidden_until_end" &&
      chase.status === "ended");

  if (loading && teams.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (chase && !visible) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-2 p-5 text-center">
            <p className="text-sm font-semibold text-muted-foreground">
              {team?.name ?? "הקבוצה שלכם"}
            </p>
            <p className="font-display text-5xl font-bold tabular-nums text-primary">
              {fmtPoints(team?.points ?? 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {(team?.points ?? 0) === 0
                ? "עוד לא נפתחתם. יאללה"
                : "נקודות עד עכשיו"}
            </p>
          </CardContent>
        </Card>

        <EmptyState
          icon={<EyeOff className="size-5" />}
          title="הטבלה מוסתרת"
          description={hiddenExplanation(
            chase.leaderboardVisibility,
            chase.leaderboardRevealed,
          )}
        />
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="size-5" />}
        title="עדיין אין קבוצות"
        description="הטבלה תתמלא ברגע שקבוצות יצטרפו ויתחילו לצבור נקודות."
      />
    );
  }

  return (
    <div className="space-y-4">
      {mine && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <RankMark rank={mine.rank} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                הקבוצה שלכם
              </p>
              <p className="truncate font-display text-base font-bold">
                {mine.team.name}
              </p>
            </div>
            <div className="text-end">
              <p className="font-display text-xl font-bold tabular-nums">
                {fmtPoints(mine.team.points)}
              </p>
              <p className="text-xs text-muted-foreground">
                מקום {mine.rank}
                {mine.tied ? " · שוויון" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ol className="flex flex-col gap-2">
        {ranked.map((row) => {
          const isMine = row.team.id === myTeamId;
          return (
            <li
              key={row.team.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-surface p-3 shadow-card",
                row.rank <= 3 ? PODIUM[row.rank - 1] : "border-border",
                isMine && "ring-2 ring-primary",
              )}
            >
              <RankMark rank={row.rank} />
              <Avatar
                name={row.team.name}
                src={row.team.photoUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[0.95rem] font-bold">
                  {row.team.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.team.submissionCount === 1
                    ? "הגשה אחת"
                    : `${row.team.submissionCount} הגשות`}
                  {row.tied && " · שוויון"}
                </p>
              </div>
              {isMine && <Badge tone="brand">אתם</Badge>}
              <p className="font-display text-lg font-bold tabular-nums">
                {fmtPoints(row.team.points)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
