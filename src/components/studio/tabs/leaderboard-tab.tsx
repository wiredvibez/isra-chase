"use client";

import * as React from "react";
import { toast } from "sonner";
import { Eye, History, Megaphone, Scale, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { SkeletonList } from "@/components/ui/skeleton";
import { apiPatch } from "@/lib/api-client";
import type { Chase, Team } from "@/lib/domain/types";
import { ordinal, rankTeams } from "@/lib/domain/leaderboard";
import { points as formatPoints, shortDateTime } from "@/lib/format";
import { useLoadedChase } from "../chase-context";
import { useAdjustments, useTeams } from "../data-hooks";
import {
  AdjustScoreDialog,
  BonusHistoryDialog,
  TeamBroadcastDialog,
} from "../leaderboard/team-dialogs";
import { Menu } from "../menu";
import { TabHeader } from "../section";
import { toastError } from "../studio-utils";

const VISIBILITY_HINT: Record<Chase["leaderboardVisibility"], string> = {
  visible: "Players can see the full leaderboard right now.",
  hidden_until_reveal:
    "Players only see their own total until you press Reveal.",
  hidden_until_end: "The leaderboard unlocks for players when the chase ends.",
};

export function LeaderboardTab() {
  const { chase, chaseId } = useLoadedChase();
  const { data: teams, loading } = useTeams(chaseId);
  const { data: adjustments } = useAdjustments(chaseId);

  const [adjustTeam, setAdjustTeam] = React.useState<Team | null>(null);
  const [historyTeam, setHistoryTeam] = React.useState<Team | null>(null);
  const [messageTeam, setMessageTeam] = React.useState<Team | null>(null);
  const [busy, setBusy] = React.useState(false);

  const ranked = React.useMemo(() => rankTeams(teams), [teams]);

  async function patchChase(patch: Partial<Chase>) {
    setBusy(true);
    try {
      await apiPatch(`/api/chases/${chaseId}`, patch);
    } catch (error) {
      toastError(error, "Couldn't update the leaderboard settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="Leaderboard"
        description="Olympic-style ranking: teams tied on points and timing share a place."
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="leaderboard-visibility"
            className="text-sm font-semibold"
          >
            Visibility
          </label>
          <Select
            id="leaderboard-visibility"
            className="mt-1 max-w-sm"
            value={chase.leaderboardVisibility}
            onChange={(e) =>
              void patchChase({
                leaderboardVisibility: e.target
                  .value as Chase["leaderboardVisibility"],
              })
            }
          >
            <option value="visible">Visible to players</option>
            <option value="hidden_until_reveal">Hidden until I reveal it</option>
            <option value="hidden_until_end">Hidden until the chase ends</option>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            {VISIBILITY_HINT[chase.leaderboardVisibility]}
          </p>
        </div>
        {chase.leaderboardVisibility === "hidden_until_reveal" && (
          <Button
            loading={busy}
            disabled={chase.leaderboardRevealed}
            onClick={() => {
              void patchChase({ leaderboardRevealed: true });
              toast.success("Leaderboard revealed.");
            }}
          >
            <Eye className="size-4" aria-hidden />
            {chase.leaderboardRevealed ? "Revealed" : "Reveal now"}
          </Button>
        )}
      </Card>

      {loading && <SkeletonList rows={4} />}

      {!loading && !ranked.length && (
        <EmptyState
          icon={<Trophy className="size-6" aria-hidden />}
          title="No teams on the board yet"
          description="Once players join and start submitting, they will rank up here in real time."
        />
      )}

      {ranked.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">
              Team leaderboard, ranked by total points
            </caption>
            <thead>
              <tr className="border-b border-border text-start">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Rank
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Team
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  Base
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  Bonus
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  Total
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  Submissions
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Last submission
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ team, rank, tied }) => (
                <tr key={team.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-bold tabular-nums">
                    {ordinal(rank)}
                    {tied && (
                      <Badge tone="neutral" className="ms-1.5">
                        tied
                      </Badge>
                    )}
                  </td>
                  <th scope="row" className="px-4 py-3 text-start font-semibold">
                    <span className="flex items-center gap-2">
                      <Avatar name={team.name} src={team.photoUrl} size="sm" />
                      {team.name}
                    </span>
                  </th>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {formatPoints(team.basePoints ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {formatPoints(team.bonusPoints ?? 0, true)}
                  </td>
                  <td className="px-4 py-3 text-end font-bold tabular-nums">
                    {formatPoints(team.points ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">
                    {team.submissionCount ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {team.lastSubmissionAt
                      ? shortDateTime(team.lastSubmissionAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Menu
                      label={`Actions for ${team.name}`}
                      items={[
                        {
                          id: "adjust",
                          label: "Adjust score",
                          icon: <Scale className="size-4" aria-hidden />,
                          onSelect: () => setAdjustTeam(team),
                        },
                        {
                          id: "history",
                          label: "Bonus history",
                          icon: <History className="size-4" aria-hidden />,
                          onSelect: () => setHistoryTeam(team),
                        },
                        {
                          id: "broadcast",
                          label: "Send a broadcast",
                          icon: <Megaphone className="size-4" aria-hidden />,
                          onSelect: () => setMessageTeam(team),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AdjustScoreDialog
        chaseId={chaseId}
        team={adjustTeam}
        onClose={() => setAdjustTeam(null)}
      />
      <BonusHistoryDialog
        chaseId={chaseId}
        team={historyTeam}
        adjustments={adjustments}
        onClose={() => setHistoryTeam(null)}
      />
      <TeamBroadcastDialog
        chaseId={chaseId}
        team={messageTeam}
        onClose={() => setMessageTeam(null)}
      />
    </div>
  );
}
