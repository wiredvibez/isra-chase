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
import { rankTeams } from "@/lib/domain/leaderboard";
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
  visible: "השחקנים רואים עכשיו את טבלת המובילים המלאה.",
  hidden_until_reveal:
    "השחקנים רואים רק את סך הנקודות של עצמם, עד שתחשפו את הטבלה.",
  hidden_until_end:
    "טבלת המובילים תיפתח לשחקנים כשהמרדף יסתיים. עד אז כל קבוצה רואה רק את הסך שלה.",
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
      toastError(error, "לא הצלחנו לעדכן את הגדרות הטבלה.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="טבלת המובילים"
        description="דירוג בשיטה האולימפית: קבוצות עם אותן נקודות ואותו תזמון חולקות מקום."
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="leaderboard-visibility"
            className="text-sm font-semibold"
          >
            מי רואה את הטבלה
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
            <option value="visible">גלויה לשחקנים</option>
            <option value="hidden_until_reveal">מוסתרת עד שאחשוף אותה</option>
            <option value="hidden_until_end">מוסתרת עד שהמרדף יסתיים</option>
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
              toast.success("טבלת המובילים נחשפה.");
            }}
          >
            <Eye className="size-4" aria-hidden />
            {chase.leaderboardRevealed ? "נחשפה" : "לחשוף עכשיו"}
          </Button>
        )}
      </Card>

      {loading && <SkeletonList rows={4} />}

      {!loading && !ranked.length && (
        <EmptyState
          icon={<Trophy className="size-6" aria-hidden />}
          title="עוד אין קבוצות בטבלה"
          description="ברגע שהשחקנים יצטרפו ויתחילו לשלוח הגשות, הקבוצות יטפסו לכאן בזמן אמת."
        />
      )}

      {ranked.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <caption className="sr-only">
              טבלת המובילים, מדורגת לפי סך הנקודות
            </caption>
            <thead>
              <tr className="border-b border-border text-start">
                <th scope="col" className="px-4 py-3 font-semibold">
                  מקום
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  קבוצה
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  בסיס
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  בונוס
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  {'סה"כ'}
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  הגשות
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  הגשה אחרונה
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">פעולות</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ team, rank, tied }) => (
                <tr key={team.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-bold tabular-nums">
                    {rank}
                    {tied && (
                      <Badge tone="neutral" className="ms-1.5">
                        תיקו
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
                      label={`פעולות על הקבוצה ${team.name}`}
                      items={[
                        {
                          id: "adjust",
                          label: "לעדכן ניקוד",
                          icon: <Scale className="size-4" aria-hidden />,
                          onSelect: () => setAdjustTeam(team),
                        },
                        {
                          id: "history",
                          label: "היסטוריית בונוסים",
                          icon: <History className="size-4" aria-hidden />,
                          onSelect: () => setHistoryTeam(team),
                        },
                        {
                          id: "broadcast",
                          label: "לשלוח הודעה",
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
