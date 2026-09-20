"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { joinDuration, splitDuration } from "./studio-utils";

/** Days / hours / minutes triple used by every relative-time control. */
export function DurationField({
  valueMs,
  onChange,
  idPrefix,
  showDays = true,
}: {
  valueMs: number;
  onChange: (ms: number) => void;
  idPrefix: string;
  showDays?: boolean;
}) {
  const parts = splitDuration(Math.abs(valueMs));

  function update(key: "days" | "hours" | "minutes", raw: string) {
    const n = Math.max(0, Math.min(999, Number(raw) || 0));
    onChange(joinDuration({ ...parts, [key]: n }));
  }

  const cells: Array<{ key: "days" | "hours" | "minutes"; label: string }> = [
    ...(showDays ? [{ key: "days" as const, label: "Days" }] : []),
    { key: "hours", label: "Hours" },
    { key: "minutes", label: "Minutes" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {cells.map((cell) => (
        <div key={cell.key} className="w-20">
          <label
            htmlFor={`${idPrefix}-${cell.key}`}
            className="mb-1 block text-xs text-muted-foreground"
          >
            {cell.label}
          </label>
          <Input
            id={`${idPrefix}-${cell.key}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={parts[cell.key]}
            onChange={(e) => update(cell.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
