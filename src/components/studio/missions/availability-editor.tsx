"use client";

import * as React from "react";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type {
  ExpiryRule,
  Mission,
  MissionType,
  ReleaseRule,
} from "@/lib/domain/types";
import { DurationField } from "../duration-field";
import { fromLocalInput, stampMs, toLocalInput } from "../studio-utils";

/* The API takes epoch millis where the stored document holds a Timestamp. */
export type ReleaseInput =
  | { kind: "chase_start" }
  | { kind: "relative"; anchor: "start" | "end"; offsetMs: number }
  | { kind: "specific"; atMs: number | null }
  | { kind: "mission"; missionId: string; requireCorrect: boolean }
  | { kind: "points"; points: number };

export type ExpiryInput =
  | { kind: "chase_end" }
  | { kind: "relative"; anchor: "start" | "end"; offsetMs: number }
  | { kind: "specific"; atMs: number | null };

export function releaseToInput(rule: ReleaseRule | undefined): ReleaseInput {
  if (!rule) return { kind: "chase_start" };
  if (rule.kind === "specific") return { kind: "specific", atMs: stampMs(rule.at) };
  return rule;
}

export function expiryToInput(rule: ExpiryRule | undefined): ExpiryInput {
  if (!rule) return { kind: "chase_end" };
  if (rule.kind === "specific") return { kind: "specific", atMs: stampMs(rule.at) };
  return rule;
}

const RELEASE_OPTIONS: Array<{ value: ReleaseInput["kind"]; label: string }> = [
  { value: "chase_start", label: "When the chase starts" },
  { value: "relative", label: "Relative to the start or end" },
  { value: "specific", label: "At a specific time" },
  { value: "mission", label: "When another mission is completed" },
  { value: "points", label: "When the team reaches a point total" },
];

const EXPIRY_OPTIONS: Array<{ value: ExpiryInput["kind"]; label: string }> = [
  { value: "chase_end", label: "When the chase ends" },
  { value: "relative", label: "Relative to the start or end" },
  { value: "specific", label: "At a specific time" },
];

function AnchorRow({
  offsetMs,
  anchor,
  onChange,
  idPrefix,
}: {
  offsetMs: number;
  anchor: "start" | "end";
  onChange: (next: { offsetMs: number; anchor: "start" | "end" }) => void;
  idPrefix: string;
}) {
  const before = offsetMs < 0;
  return (
    <div className="space-y-2">
      <DurationField
        idPrefix={idPrefix}
        valueMs={offsetMs}
        onChange={(ms) => onChange({ anchor, offsetMs: before ? -ms : ms })}
      />
      <div className="flex flex-wrap gap-2">
        <Select
          aria-label="Before or after"
          value={before ? "before" : "after"}
          onChange={(e) =>
            onChange({
              anchor,
              offsetMs:
                e.target.value === "before"
                  ? -Math.abs(offsetMs)
                  : Math.abs(offsetMs),
            })
          }
          className="max-w-32"
        >
          <option value="after">after</option>
          <option value="before">before</option>
        </Select>
        <Select
          aria-label="Anchor"
          value={anchor}
          onChange={(e) =>
            onChange({ anchor: e.target.value as "start" | "end", offsetMs })
          }
          className="max-w-40"
        >
          <option value="start">the chase start</option>
          <option value="end">the chase end</option>
        </Select>
      </div>
    </div>
  );
}

export function AvailabilityEditor({
  release,
  expiry,
  onRelease,
  onExpiry,
  missions,
  currentMissionId,
  missionType,
}: {
  release: ReleaseInput;
  expiry: ExpiryInput;
  onRelease: (next: ReleaseInput) => void;
  onExpiry: (next: ExpiryInput) => void;
  missions: Mission[];
  currentMissionId: string | null;
  missionType: MissionType;
}) {
  const ids = React.useId();
  const candidates = missions.filter((m) => m.id !== currentMissionId);
  const trigger =
    release.kind === "mission"
      ? candidates.find((m) => m.id === release.missionId)
      : undefined;
  // Camera submissions have no notion of a correct answer, so they cannot
  // satisfy a "requires a correct answer" unlock — on either side of the link.
  const correctnessBlocked =
    trigger?.type === "camera" || missionType === "camera";

  function changeReleaseKind(kind: ReleaseInput["kind"]) {
    switch (kind) {
      case "chase_start":
        return onRelease({ kind: "chase_start" });
      case "relative":
        return onRelease({ kind: "relative", anchor: "start", offsetMs: 0 });
      case "specific":
        return onRelease({ kind: "specific", atMs: null });
      case "mission":
        return onRelease({
          kind: "mission",
          missionId: candidates[0]?.id ?? "",
          requireCorrect: false,
        });
      case "points":
        return onRelease({ kind: "points", points: 100 });
    }
  }

  function changeExpiryKind(kind: ExpiryInput["kind"]) {
    switch (kind) {
      case "chase_end":
        return onExpiry({ kind: "chase_end" });
      case "relative":
        return onExpiry({ kind: "relative", anchor: "end", offsetMs: 0 });
      case "specific":
        return onExpiry({ kind: "specific", atMs: null });
    }
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Release</legend>
        <p className="text-xs text-muted-foreground">
          A mission is either unlocked by progress or by the clock — never both.
        </p>
        <Select
          aria-label="Release rule"
          value={release.kind}
          onChange={(e) =>
            changeReleaseKind(e.target.value as ReleaseInput["kind"])
          }
        >
          {RELEASE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        {release.kind === "relative" && (
          <AnchorRow
            idPrefix={`${ids}-rel`}
            anchor={release.anchor}
            offsetMs={release.offsetMs}
            onChange={(next) => onRelease({ kind: "relative", ...next })}
          />
        )}

        {release.kind === "specific" && (
          <Input
            type="datetime-local"
            aria-label="Release time"
            value={toLocalInput(release.atMs)}
            onChange={(e) =>
              onRelease({ kind: "specific", atMs: fromLocalInput(e.target.value) })
            }
          />
        )}

        {release.kind === "mission" && (
          <div className="space-y-2">
            {candidates.length ? (
              <Select
                aria-label="Trigger mission"
                value={release.missionId}
                onChange={(e) =>
                  onRelease({ ...release, missionId: e.target.value })
                }
              >
                {candidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-xs text-danger">
                Create another mission first — there is nothing to unlock from.
              </p>
            )}
            <Switch
              checked={release.requireCorrect && !correctnessBlocked}
              disabled={correctnessBlocked}
              onChange={(v) => onRelease({ ...release, requireCorrect: v })}
              label="Requires a correct answer"
              description={
                correctnessBlocked
                  ? "Camera missions have no correct answer to wait for."
                  : "Otherwise any submission to that mission unlocks this one."
              }
            />
          </div>
        )}

        {release.kind === "points" && (
          <Input
            type="number"
            min={1}
            aria-label="Points needed"
            value={release.points}
            onChange={(e) =>
              onRelease({
                kind: "points",
                points: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="max-w-40"
          />
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Expiry</legend>
        <Select
          aria-label="Expiry rule"
          value={expiry.kind}
          onChange={(e) => changeExpiryKind(e.target.value as ExpiryInput["kind"])}
        >
          {EXPIRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        {expiry.kind === "relative" && (
          <AnchorRow
            idPrefix={`${ids}-exp`}
            anchor={expiry.anchor}
            offsetMs={expiry.offsetMs}
            onChange={(next) => onExpiry({ kind: "relative", ...next })}
          />
        )}

        {expiry.kind === "specific" && (
          <Input
            type="datetime-local"
            aria-label="Expiry time"
            value={toLocalInput(expiry.atMs)}
            onChange={(e) =>
              onExpiry({ kind: "specific", atMs: fromLocalInput(e.target.value) })
            }
          />
        )}
      </fieldset>
    </div>
  );
}
