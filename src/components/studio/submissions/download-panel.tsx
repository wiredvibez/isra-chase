"use client";

import * as React from "react";
import { Download, FolderDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import type { Submission } from "@/lib/domain/types";
import { bytes } from "@/lib/format";
import { csvEscape, downloadTextFile } from "../studio-utils";

/**
 * Bulk media export. The API contract has no zip endpoint, so this hands the
 * organizer a per-group manifest of direct media URLs plus one-click links —
 * a server-side zip can slot in behind the same button later.
 */
export function DownloadPanel({
  submissions,
  chaseName,
}: {
  submissions: Submission[];
  chaseName: string;
}) {
  const [groupBy, setGroupBy] = React.useState<"team" | "mission">("team");

  const withMedia = submissions.filter((s) => s.media);

  const groups = React.useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const submission of withMedia) {
      const key =
        groupBy === "team" ? submission.teamName : submission.missionName;
      const list = map.get(key) ?? [];
      list.push(submission);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [withMedia, groupBy]);

  function manifest(name: string, rows: Submission[]) {
    const header = "group,mission,team,participant,submitted,type,bytes,url";
    const body = rows
      .map((s) =>
        [
          name,
          s.missionName,
          s.teamName,
          s.participantName,
          s.createdAt ? new Date(s.createdAt.toMillis()).toISOString() : "",
          s.media?.contentType ?? "",
          s.media?.bytes ?? 0,
          s.media?.url ?? "",
        ]
          .map(csvEscape)
          .join(","),
      )
      .join("\n");
    downloadTextFile(
      `${chaseName}-${name}-media.csv`.replace(/[^\w.-]+/g, "-"),
      "text/csv;charset=utf-8",
      `${header}\n${body}`,
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-base font-bold">הורדת מדיה</h2>
          <Select
            aria-label="קיבוץ ההורדות לפי"
            className="ms-auto max-w-44"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "team" | "mission")}
          >
            <option value="team">לפי קבוצה</option>
            <option value="mission">לפי משימה</option>
          </Select>
          <Button
            variant="outline"
            onClick={() => manifest("all", withMedia)}
            disabled={!withMedia.length}
          >
            <FolderDown className="size-4" aria-hidden />
            רשימת קישורים לכל המדיה
          </Button>
        </div>

        {!withMedia.length ? (
          <p className="text-sm text-muted-foreground">
            עוד אין הגשות עם תמונה או וידאו להורדה.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {groups.map(([name, rows]) => (
              <li key={name} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {rows.length} קבצים ·{" "}
                  {bytes(rows.reduce((sum, s) => sum + (s.media?.bytes ?? 0), 0))}
                </span>
                <Button size="sm" variant="ghost" onClick={() => manifest(name, rows)}>
                  <Download className="size-4" aria-hidden />
                  רשימת קישורים
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
