"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface BarRow {
  id: string;
  label: string;
  value: number;
}

/**
 * CSS bars rather than a charting library: the numbers are always visible as
 * text, so the chart is readable by screen readers and at phone width.
 */
export function BarChart({
  title,
  rows,
  unit = "submissions",
  emptyMessage,
  tone = "brand",
}: {
  title: string;
  rows: BarRow[];
  unit?: string;
  emptyMessage: string;
  tone?: "brand" | "accent";
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const top = rows.slice(0, 8);

  return (
    <Card>
      <CardContent className="pt-5">
        <h3 className="font-display text-base font-bold">{title}</h3>
        {top.length ? (
          <ul className="mt-3 space-y-2">
            {top.map((row) => (
              <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                <span className="truncate text-sm font-medium">{row.label}</span>
                <span className="text-sm font-bold tabular-nums">
                  {row.value}
                  <span className="sr-only"> {unit}</span>
                </span>
                <span
                  aria-hidden
                  className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-inset"
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      tone === "brand" ? "bg-primary" : "bg-accent",
                    )}
                    style={{ width: `${(row.value / max) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState className="mt-3 py-8" title={emptyMessage} />
        )}
      </CardContent>
    </Card>
  );
}
