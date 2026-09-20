"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone, Pencil, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SkeletonList } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import type { Broadcast } from "@/lib/domain/types";
import { dateTime } from "@/lib/format";
import { useLoadedChase } from "../chase-context";
import {
  BroadcastSchedulePicker,
  scheduleToInput,
  type BroadcastScheduleInput,
} from "../broadcasts/schedule-picker";
import { useBroadcasts, useTeams } from "../data-hooks";
import { ImageUpload } from "../image-upload";
import { TabHeader } from "../section";
import { broadcastScheduleSummary, toastError } from "../studio-utils";

interface ComposerState {
  body: string;
  imageUrl: string | null;
  linkUrl: string;
  teamIds: string[] | null;
  schedule: BroadcastScheduleInput;
}

const blank = (): ComposerState => ({
  body: "",
  imageUrl: null,
  linkUrl: "",
  teamIds: null,
  schedule: { kind: "now" },
});

export function BroadcastsTab() {
  const { chaseId } = useLoadedChase();
  const { data: broadcasts, loading } = useBroadcasts(chaseId);
  const { data: teams } = useTeams(chaseId);

  const [form, setForm] = React.useState<ComposerState>(blank);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("all");
  const [sending, setSending] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Broadcast | null>(null);
  const [busy, setBusy] = React.useState(false);

  function set<K extends keyof ComposerState>(key: K, value: ComposerState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const scheduled = broadcasts.filter((b) => b.status === "scheduled");
  const sent = broadcasts.filter((b) => b.status === "sent");
  const shown =
    filter === "scheduled" ? scheduled : filter === "sent" ? sent : broadcasts;

  function edit(broadcast: Broadcast) {
    setEditingId(broadcast.id);
    setForm({
      body: broadcast.body,
      imageUrl: broadcast.imageUrl ?? null,
      linkUrl: broadcast.linkUrl ?? "",
      teamIds: broadcast.teamIds ?? null,
      schedule: scheduleToInput(broadcast.schedule),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!form.body.trim()) {
      toast.error("Write something to send.");
      return;
    }
    if (form.schedule.kind === "during_specific" && !form.schedule.atMs) {
      toast.error("Pick the time to send this broadcast.");
      return;
    }
    const link = form.linkUrl.trim();
    if (link) {
      try {
        new URL(link);
      } catch {
        toast.error("That link isn't a valid URL.");
        return;
      }
    }

    setSending(true);
    const payload = {
      body: form.body.trim(),
      imageUrl: form.imageUrl,
      linkUrl: link || null,
      teamIds: form.teamIds?.length ? form.teamIds : null,
      schedule: form.schedule,
    };
    try {
      if (editingId) {
        await apiPatch(`/api/chases/${chaseId}/broadcasts/${editingId}`, payload);
        toast.success("Broadcast updated.");
      } else {
        await apiPost(`/api/chases/${chaseId}/broadcasts`, payload);
        toast.success(
          form.schedule.kind === "now" ? "Broadcast sent." : "Broadcast scheduled.",
        );
      }
      setForm(blank());
      setEditingId(null);
    } catch (error) {
      toastError(error, "Couldn't send that broadcast.");
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/broadcasts/${deleteTarget.id}`);
      toast.success("Broadcast deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toastError(error, "Couldn't delete that broadcast.");
    } finally {
      setBusy(false);
    }
  }

  function toggleTeam(teamId: string) {
    setForm((f) => {
      const current = f.teamIds ?? [];
      return {
        ...f,
        teamIds: current.includes(teamId)
          ? current.filter((id) => id !== teamId)
          : [...current, teamId],
      };
    });
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="Broadcasts"
        description="One-way announcements to everyone, or to particular teams."
      />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <Field label="Message" htmlFor="broadcast-body" required>
            <Textarea
              id="broadcast-body"
              value={form.body}
              maxLength={2000}
              placeholder="Ten minutes left — get your last missions in!"
              onChange={(e) => set("body", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Image" hint="Optional.">
              <ImageUpload
                label="Broadcast image"
                folder={`chases/${chaseId}/cover`}
                value={form.imageUrl}
                onChange={(url) => set("imageUrl", url)}
              />
            </Field>
            <Field label="Link" htmlFor="broadcast-link" hint="Optional.">
              <Input
                id="broadcast-link"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={form.linkUrl}
                onChange={(e) => set("linkUrl", e.target.value)}
              />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Audience</legend>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="broadcast-audience"
                  checked={form.teamIds === null}
                  onChange={() => set("teamIds", null)}
                />
                Everyone
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="broadcast-audience"
                  checked={form.teamIds !== null}
                  onChange={() => set("teamIds", [])}
                />
                Specific teams
              </label>
            </div>
            {form.teamIds !== null && (
              <div className="flex flex-wrap gap-2">
                {teams.length ? (
                  teams.map((team) => (
                    <label
                      key={team.id}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.teamIds?.includes(team.id) ?? false}
                        onChange={() => toggleTeam(team.id)}
                      />
                      {team.name}
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No teams yet — this will go to everyone.
                  </p>
                )}
              </div>
            )}
          </fieldset>

          <Field label="When to send">
            <BroadcastSchedulePicker
              value={form.schedule}
              onChange={(next) => set("schedule", next)}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void submit()} loading={sending}>
              <Send className="size-4" aria-hidden />
              {editingId
                ? "Save broadcast"
                : form.schedule.kind === "now"
                  ? "Send now"
                  : "Schedule broadcast"}
            </Button>
            {editingId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(blank());
                }}
              >
                Cancel edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "All", count: broadcasts.length },
          { id: "scheduled", label: "Scheduled", count: scheduled.length },
          { id: "sent", label: "Sent", count: sent.length },
        ]}
      />

      {loading && <SkeletonList rows={3} />}

      {!loading && !shown.length && (
        <EmptyState
          icon={<Megaphone className="size-6" aria-hidden />}
          title="Nothing here yet"
          description="Broadcasts you send or schedule show up in this list."
        />
      )}

      <ul className="space-y-2">
        {shown.map((broadcast) => (
          <li key={broadcast.id}>
            <Card className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={broadcast.status === "sent" ? "success" : "info"}>
                    {broadcast.status === "sent" ? "Sent" : "Scheduled"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {broadcastScheduleSummary(broadcast.schedule)}
                    {broadcast.sentAt ? ` · ${dateTime(broadcast.sentAt)}` : ""}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{broadcast.body}</p>
                <p className="text-xs text-muted-foreground">
                  To:{" "}
                  {broadcast.teamIds?.length
                    ? broadcast.teamIds
                        .map((id) => teams.find((t) => t.id === id)?.name ?? id)
                        .join(", ")
                    : "Everyone"}
                </p>
              </div>
              {broadcast.status === "scheduled" && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit broadcast"
                    onClick={() => edit(broadcast)}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete broadcast"
                    onClick={() => setDeleteTarget(broadcast)}
                  >
                    <Trash2 className="size-4 text-danger" aria-hidden />
                  </Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title="Delete this scheduled broadcast?"
        description="It will never be sent. Players who already received it are unaffected."
        confirmLabel="Delete broadcast"
      />
    </div>
  );
}
