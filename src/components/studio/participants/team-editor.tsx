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
  passcode: string;
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
    mode: "team",
    maxMembers: "",
  }));
  const [saving, setSaving] = React.useState(false);

  const uploadId = React.useMemo(
    () => team?.id ?? `draft-${Math.random().toString(36).slice(2, 10)}`,
    [team?.id],
  );

  React.useEffect(() => {
    if (!open) return;
    setForm({
      name: team?.name ?? "",
      photoUrl: team?.photoUrl ?? null,
      passcode: team?.passcode ?? "",
      mode: team?.mode ?? "team",
      maxMembers: team?.maxMembers ? String(team.maxMembers) : "",
    });
  }, [open, team]);

  async function save() {
    if (!form.name.trim()) {
      toast.error("Teams need a name.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      photoUrl: form.photoUrl,
      passcode: form.passcode.trim() || null,
      mode: form.mode,
      maxMembers: form.maxMembers ? Number(form.maxMembers) : null,
    };
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
          hint="Players who know it skip the chase password."
        >
          <Input
            id="team-passcode"
            value={form.passcode}
            maxLength={32}
            autoComplete="off"
            placeholder="No passcode"
            onChange={(e) => setForm((f) => ({ ...f, passcode: e.target.value }))}
          />
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
