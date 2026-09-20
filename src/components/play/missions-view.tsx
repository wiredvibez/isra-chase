"use client";

import * as React from "react";
import { Flag, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlay } from "./play-provider";
import { MissionCard } from "./mission-card";

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 px-1 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="text-xs font-semibold tabular-nums">{count}</span>
      </h2>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

export function MissionsView() {
  const { chaseId, missions, missionsLoading, missionsError, chase } = usePlay();

  const { remaining, completed } = React.useMemo(() => {
    return {
      remaining: missions.filter((m) => !m.completed),
      completed: missions.filter((m) => m.completed),
    };
  }, [missions]);

  if (missionsLoading && missions.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full" />
        ))}
      </div>
    );
  }

  if (missionsError && missions.length === 0) {
    return (
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        title="לא הצלחנו לטעון את המשימות"
        description={missionsError}
      />
    );
  }

  if (missions.length === 0) {
    return (
      <EmptyState
        icon={<Flag className="size-5" />}
        title={
          chase?.status === "draft" || chase?.status === "scheduled"
            ? "המרדף עוד לא התחיל"
            : "עדיין אין משימות"
        }
        description={
          chase?.status === "draft" || chase?.status === "scheduled"
            ? "המשימות יופיעו ברגע שהמארגן יפתח את המרדף. תשאירו את המסך הזה פתוח."
            : "המארגן עוד לא שחרר משימות שאפשר לעשות עכשיו."
        }
      />
    );
  }

  const total = missions.length;
  const done = completed.length;

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-sm font-bold">
              {done} מתוך {total} משימות
            </p>
            <p className="text-xs font-semibold tabular-nums text-muted-foreground">
              {total ? Math.round((done / total) * 100) : 0}%
            </p>
          </div>
          <Progress
            value={done}
            max={total}
            label={`הושלמו ${done} מתוך ${total} משימות`}
          />
        </CardContent>
      </Card>

      {remaining.length > 0 && (
        <Section title="נשארו" count={remaining.length}>
          {remaining.map((mission) => (
            <MissionCard key={mission.id} mission={mission} chaseId={chaseId} />
          ))}
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="הושלמו" count={completed.length}>
          {completed.map((mission) => (
            <MissionCard key={mission.id} mission={mission} chaseId={chaseId} />
          ))}
        </Section>
      )}

      {remaining.length === 0 && (
        <EmptyState
          icon={<Flag className="size-5" />}
          title="סיימתם הכול"
          description="לא נשארה אף משימה על הלוח. יפה. שימו עין — לפעמים צצות משימות חדשות."
        />
      )}
    </div>
  );
}
