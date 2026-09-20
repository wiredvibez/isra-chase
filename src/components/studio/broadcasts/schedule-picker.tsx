"use client";

import * as React from "react";
import { Input, Select } from "@/components/ui/input";
import type { BroadcastSchedule } from "@/lib/domain/types";
import { DurationField } from "../duration-field";
import { fromLocalInput, stampMs, toLocalInput } from "../studio-utils";

export type BroadcastScheduleInput =
  | { kind: "now" }
  | { kind: "before_start"; offsetMs: number }
  | { kind: "at_start" }
  | { kind: "during_relative"; anchor: "start" | "end"; offsetMs: number }
  | { kind: "during_specific"; atMs: number | null }
  | { kind: "at_end" }
  | { kind: "after_end"; offsetMs: number };

export function scheduleToInput(
  schedule: BroadcastSchedule | undefined,
): BroadcastScheduleInput {
  if (!schedule) return { kind: "now" };
  if (schedule.kind === "during_specific")
    return { kind: "during_specific", atMs: stampMs(schedule.at) };
  return schedule;
}

const OPTIONS: Array<{ value: BroadcastScheduleInput["kind"]; label: string }> = [
  { value: "now", label: "לשלוח עכשיו" },
  { value: "before_start", label: "לפני תחילת המרדף" },
  { value: "at_start", label: "עם תחילת המרדף" },
  { value: "during_relative", label: "במהלך המרדף — ביחס לתחילה או לסיום" },
  { value: "during_specific", label: "במהלך המרדף — בשעה מסוימת" },
  { value: "at_end", label: "עם סיום המרדף" },
  { value: "after_end", label: "אחרי סיום המרדף" },
];

export function BroadcastSchedulePicker({
  value,
  onChange,
}: {
  value: BroadcastScheduleInput;
  onChange: (next: BroadcastScheduleInput) => void;
}) {
  const ids = React.useId();

  function changeKind(kind: BroadcastScheduleInput["kind"]) {
    switch (kind) {
      case "now":
        return onChange({ kind: "now" });
      case "before_start":
        return onChange({ kind: "before_start", offsetMs: 60 * 60 * 1000 });
      case "at_start":
        return onChange({ kind: "at_start" });
      case "during_relative":
        return onChange({
          kind: "during_relative",
          anchor: "start",
          offsetMs: 60 * 60 * 1000,
        });
      case "during_specific":
        return onChange({ kind: "during_specific", atMs: null });
      case "at_end":
        return onChange({ kind: "at_end" });
      case "after_end":
        return onChange({ kind: "after_end", offsetMs: 60 * 60 * 1000 });
    }
  }

  return (
    <div className="space-y-2">
      <Select
        aria-label="מתי לשלוח"
        value={value.kind}
        onChange={(e) =>
          changeKind(e.target.value as BroadcastScheduleInput["kind"])
        }
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      {(value.kind === "before_start" || value.kind === "after_end") && (
        <DurationField
          idPrefix={`${ids}-offset`}
          valueMs={value.offsetMs}
          onChange={(ms) => onChange({ ...value, offsetMs: Math.max(60_000, ms) })}
        />
      )}

      {value.kind === "during_relative" && (
        <div className="space-y-2">
          <DurationField
            idPrefix={`${ids}-during`}
            valueMs={value.offsetMs}
            onChange={(ms) =>
              onChange({ ...value, offsetMs: value.offsetMs < 0 ? -ms : ms })
            }
          />
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="לפני או אחרי"
              className="max-w-32"
              value={value.offsetMs < 0 ? "before" : "after"}
              onChange={(e) =>
                onChange({
                  ...value,
                  offsetMs:
                    e.target.value === "before"
                      ? -Math.abs(value.offsetMs)
                      : Math.abs(value.offsetMs),
                })
              }
            >
              <option value="after">אחרי</option>
              <option value="before">לפני</option>
            </Select>
            <Select
              aria-label="נקודת ייחוס"
              className="max-w-40"
              value={value.anchor}
              onChange={(e) =>
                onChange({ ...value, anchor: e.target.value as "start" | "end" })
              }
            >
              <option value="start">תחילת המרדף</option>
              <option value="end">סיום המרדף</option>
            </Select>
          </div>
        </div>
      )}

      {value.kind === "during_specific" && (
        <Input
          type="datetime-local"
          aria-label="שעת השליחה"
          value={toLocalInput(value.atMs)}
          onChange={(e) =>
            onChange({
              kind: "during_specific",
              atMs: fromLocalInput(e.target.value),
            })
          }
        />
      )}
    </div>
  );
}
