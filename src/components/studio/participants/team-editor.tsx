"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { apiPatch, apiPost } from "@/lib/api-client";
import type { Team } from "@/lib/domain/types";
import { ImageUpload } from "../image-upload";
import { toastError } from "../studio-utils";

interface TeamForm {
  name: string;
  photoUrl: string | null;
  /** Blank means "leave whatever passcode is already set alone". */
  passcode: string;
  clearPasscode: boolean;
  mode: "team" | "solo";
  maxMembers: string;
}

export function TeamEditor({
  chaseId,
  team,
  open,
  onClose,
}: {
  chaseId: string;
  team: Team | null;
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = React.useState<TeamForm>(() => ({
    name: "",
    photoUrl: null,
    passcode: "",
    clearPasscode: false,
    mode: "team",
    maxMembers: "",
  }));
  const [saving, setSaving] = React.useState(false);

  // A team being created has no id yet, so its photo needs a scratch folder.
  // useId is stable and SSR-safe; its separators are stripped for the path.
  const draftId = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const uploadId = team?.id ?? `draft-${draftId}`;

  // Re-seed as the dialog opens, or as it is pointed at another team. Adjusted
  // during render rather than in an effect so the form never paints once with
  // the previously edited team's values.
  const [seeded, setSeeded] = React.useState({ open, team });
  if (seeded.open !== open || seeded.team !== team) {
    setSeeded({ open, team });
    if (open) {
      setForm({
        name: team?.name ?? "",
        photoUrl: team?.photoUrl ?? null,
        // Passcodes live in a private document, so an existing one is never
        // echoed back into the field.
        passcode: "",
        clearPasscode: false,
        mode: team?.mode ?? "team",
        maxMembers: team?.maxMembers ? String(team.maxMembers) : "",
      });
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Teams need a name.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      photoUrl: form.photoUrl,
      mode: form.mode,
      maxMembers: form.maxMembers ? Number(form.maxMembers) : null,
    };
    if (form.passcode.trim()) payload.passcode = form.passcode.trim();
    else if (form.clearPasscode || !team) payload.passcode = null;
    try {
      if (team) {
        await apiPatch(`/api/chases/${chaseId}/teams/${team.id}`, payload);
        toast.success("Team updated.");
      } else {
        await apiPost(`/api/chases/${chaseId}/teams`, payload);
        toast.success("Team created.");
      }
      onClose();
    } catch (error) {
      toastError(error, "Couldn't save that team.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={team ? `Edit ${team.name}` : "Pre-create a team"}
      description="Pre-created teams are ready for players to join with the team passcode."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            {team ? "Save team" : "Create team"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Team name" htmlFor="team-name" required>
          <Input
            id="team-name"
            value={form.name}
            maxLength={60}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>

        <Field label="Team photo">
          <ImageUpload
            label="Team photo"
            ratio="1/1"
            folder={`chases/${chaseId}/teams/${uploadId}`}
            value={form.photoUrl}
            onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
          />
        </Field>

        <Field
          label="Passcode"
          htmlFor="team-passcode"
          hint={
            team?.hasPasscode
              ? "A passcode is already set. Type a new one to replace it."
              : "Players who know it skip the chase password."
          }
        >
          <Input
            id="team-passcode"
            value={form.passcode}
            maxLength={32}
            autoComplete="off"
            disabled={form.clearPasscode}
            placeholder={team?.hasPasscode ? "Unchanged" : "No passcode"}
            onChange={(e) => setForm((f) => ({ ...f, passcode: e.target.value }))}
          />
          {team?.hasPasscode && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.clearPasscode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clearPasscode: e.target.checked }))
                }
              />
              Remove the existing passcode
            </label>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode" htmlFor="team-mode">
            <Select
              id="team-mode"
              value={form.mode}
              onChange={(e) =>
                setForm((f) => ({ ...f, mode: e.target.value as "team" | "solo" }))
              }
            >
              <option value="team">Team — many players</option>
              <option value="solo">Solo — one player</option>
            </Select>
          </Field>
          <Field
            label="Max members"
            htmlFor="team-max"
            hint="Blank means unlimited."
          >
            <Input
              id="team-max"
              type="number"
              min={1}
              max={500}
              value={form.maxMembers}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxMembers: e.target.value }))
              }
            />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
