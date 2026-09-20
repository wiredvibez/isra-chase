"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Clock, Globe, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";
import { dateTime } from "@/lib/format";
import { useLoadedChase } from "../chase-context";
import { useMissions } from "../data-hooks";
import { DurationField } from "../duration-field";
import { SettingRow, TabHeader } from "../section";
import {
  DAY,
  fromLocalInput,
  STATUS_LABEL,
  stampMs,
  toLocalInput,
  toastError,
} from "../studio-utils";

type ScheduleAction = "go_live" | "schedule" | "end" | "reset" | "update_end";

export function ScheduleTab() {
  const { chase, chaseId } = useLoadedChase();
  const { data: missions } = useMissions(chaseId);

  const [startMode, setStartMode] = React.useState<"now" | "scheduled">(
    chase.startMode ?? "now",
  );
  const [startAtMs, setStartAtMs] = React.useState<number | null>(
    stampMs(chase.startAt),
  );
  const [endMode, setEndMode] = React.useState<"duration" | "specific">(
    chase.endAt ? "specific" : "duration",
  );
  const [durationMs, setDurationMs] = React.useState<number>(DAY);
  const [endAtMs, setEndAtMs] = React.useState<number | null>(stampMs(chase.endAt));
  const [busy, setBusy] = React.useState<ScheduleAction | null>(null);
  const [confirm, setConfirm] = React.useState<"end" | "reset" | null>(null);

  const liveMissions = missions.filter((m) => !m.isDraft);

  const anchorMs =
    stampMs(chase.startAt) ?? (startMode === "scheduled" ? startAtMs : Date.now());

  const resolvedEndMs =
    endMode === "duration"
      ? anchorMs
        ? anchorMs + durationMs
        : null
      : endAtMs;

  const checklist = [
    {
      id: "missions",
      label: "At least one published mission",
      ok: liveMissions.length > 0,
      detail: `${liveMissions.length} published, ${missions.length - liveMissions.length} draft`,
    },
    {
      id: "end",
      label: "An end time",
      ok: Boolean(resolvedEndMs),
      detail: resolvedEndMs
        ? new Date(resolvedEndMs).toLocaleString()
        : "A chase cannot go live without one",
    },
    {
      id: "start",
      label: "A start time",
      ok: startMode === "now" || Boolean(startAtMs),
      detail:
        startMode === "now"
          ? "Starts the moment you go live"
          : startAtMs
            ? new Date(startAtMs).toLocaleString()
            : "Pick when the chase opens",
    },
  ];

  const blocked = checklist.some((item) => !item.ok);

  async function run(action: ScheduleAction) {
    setBusy(action);
    try {
      await apiPost(`/api/chases/${chaseId}/schedule`, {
        action,
        startAtMs: action === "schedule" ? startAtMs : undefined,
        endAtMs:
          action === "go_live" || action === "schedule" || action === "update_end"
            ? resolvedEndMs
            : undefined,
      });
      toast.success(
        action === "reset"
          ? "Chase reset to draft."
          : action === "end"
            ? "Chase ended."
            : action === "update_end"
              ? "End time updated."
              : action === "schedule"
                ? "Chase scheduled."
                : "You're live!",
      );
      setConfirm(null);
    } catch (error) {
      toastError(error, "Couldn't update the schedule.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="Start & end"
        description="When the chase opens, when it closes, and how to go live."
        actions={<Badge tone="neutral">{STATUS_LABEL[chase.status]}</Badge>}
      />

      <Card>
        <CardContent className="pt-5">
          <SettingRow label="Start" htmlFor="start-mode">
            <Select
              id="start-mode"
              value={startMode}
              disabled={chase.status === "live" || chase.status === "ended"}
              onChange={(e) =>
                setStartMode(e.target.value as "now" | "scheduled")
              }
            >
              <option value="now">Now — when I press Go live</option>
              <option value="scheduled">At a specific time</option>
            </Select>
            {startMode === "scheduled" && (
              <Input
                type="datetime-local"
                aria-label="Start time"
                className="mt-2"
                value={toLocalInput(startAtMs)}
                onChange={(e) => setStartAtMs(fromLocalInput(e.target.value))}
              />
            )}
            {chase.startAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Currently starts {dateTime(chase.startAt)}
              </p>
            )}
          </SettingRow>

          <SettingRow label="End" htmlFor="end-mode" hint="Required before going live.">
            <Select
              id="end-mode"
              value={endMode}
              onChange={(e) =>
                setEndMode(e.target.value as "duration" | "specific")
              }
            >
              <option value="duration">Run for a length of time</option>
              <option value="specific">End at a specific time</option>
            </Select>
            {endMode === "duration" ? (
              <div className="mt-2 space-y-1">
                <DurationField
                  idPrefix="chase-duration"
                  valueMs={durationMs}
                  onChange={(ms) => setDurationMs(Math.max(60_000, ms))}
                />
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {resolvedEndMs
                    ? `Ends ${new Date(resolvedEndMs).toLocaleString()}`
                    : "Pick a start time to see the end time."}
                </p>
              </div>
            ) : (
              <Input
                type="datetime-local"
                aria-label="End time"
                className="mt-2"
                value={toLocalInput(endAtMs)}
                onChange={(e) => setEndAtMs(fromLocalInput(e.target.value))}
              />
            )}
          </SettingRow>

          <SettingRow
            label="Timezone"
            hint="Captured when the chase was created and locked from then on, so schedules never shift under players. Everyone sees times in their own local clock."
          >
            <p className="flex items-center gap-2 rounded-md bg-surface-inset px-3 py-2 text-sm">
              <Globe className="size-4 text-muted-foreground" aria-hidden />
              {chase.timezone}
            </p>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-display text-base font-bold">Pre-launch checklist</h2>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {item.ok ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                )}
                <span>
                  <span className="font-semibold">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <span className="sr-only">{item.ok ? "Ready" : "Not ready"}</span>
              </li>
            ))}
          </ul>

          <div
            aria-live="polite"
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            {chase.status === "draft" && startMode === "now" && (
              <Button
                disabled={blocked}
                loading={busy === "go_live"}
                onClick={() => void run("go_live")}
              >
                <Clock className="size-4" aria-hidden />
                Go live now
              </Button>
            )}
            {chase.status === "draft" && startMode === "scheduled" && (
              <Button
                disabled={blocked}
                loading={busy === "schedule"}
                onClick={() => void run("schedule")}
              >
                <Clock className="size-4" aria-hidden />
                Schedule chase
              </Button>
            )}
            {chase.status === "scheduled" && (
              <>
                <Button
                  disabled={blocked}
                  loading={busy === "go_live"}
                  onClick={() => void run("go_live")}
                >
                  Go live now
                </Button>
                <Button
                  variant="outline"
                  loading={busy === "update_end"}
                  disabled={!resolvedEndMs}
                  onClick={() => void run("update_end")}
                >
                  Update end time
                </Button>
              </>
            )}
            {chase.status === "live" && (
              <>
                <Button
                  variant="outline"
                  loading={busy === "update_end"}
                  disabled={!resolvedEndMs}
                  onClick={() => void run("update_end")}
                >
                  Update end time
                </Button>
                <Button variant="danger" onClick={() => setConfirm("end")}>
                  End chase now
                </Button>
              </>
            )}
            {chase.status === "ended" && (
              <Button variant="outline" onClick={() => setConfirm("reset")}>
                <RotateCcw className="size-4" aria-hidden />
                Reset start &amp; end
              </Button>
            )}
            {blocked && chase.status === "draft" && (
              <p className="text-xs font-semibold text-danger">
                Fix the checklist above before going live.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm === "end"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("end")}
        loading={busy === "end"}
        title="End this chase now?"
        description="Players can no longer submit. Everything they have already submitted, and every point, is kept."
        confirmLabel="End chase"
      />

      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("reset")}
        loading={busy === "reset"}
        tone="primary"
        title="Reset start & end?"
        description="The chase goes back to draft so you can schedule it again. Participants, teams, submissions and points are all preserved — nothing is deleted."
        confirmLabel="Reset to draft"
      />
    </div>
  );
}
