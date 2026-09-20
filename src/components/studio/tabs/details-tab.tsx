"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiGet, apiPatch } from "@/lib/api-client";
import type { Chase } from "@/lib/domain/types";
import { useLoadedChase } from "../chase-context";
import { ImageUpload } from "../image-upload";
import { LocationPicker } from "../location-picker";
import { SaveBar, useSaveState } from "../save-bar";
import { SettingRow, TabHeader } from "../section";
import { toastError } from "../studio-utils";

const DESCRIPTION_MAX = 200;

interface DetailsForm {
  name: string;
  description: string;
  imageUrl: string | null;
  location: Chase["location"];
  password: string;
  searchVisibility: Chase["searchVisibility"];
  moderationMode: Chase["moderationMode"];
  profanityFilter: boolean;
  collectEmails: boolean;
}

function fromChase(chase: Chase): DetailsForm {
  return {
    name: chase.name,
    description: chase.description ?? "",
    imageUrl: chase.imageUrl ?? null,
    location: chase.location ?? null,
    password: chase.password ?? "",
    searchVisibility: chase.searchVisibility ?? "hidden",
    moderationMode: chase.moderationMode ?? "auto",
    profanityFilter: Boolean(chase.profanityFilter),
    collectEmails: Boolean(chase.collectEmails),
  };
}

export function DetailsTab() {
  const { chase, chaseId } = useLoadedChase();
  const [form, setForm] = React.useState<DetailsForm>(() => fromChase(chase));
  // The password is not in the chase snapshot (any signed-in user can read
  // that); it only comes back on the organizer-facing GET.
  const [passwordLoaded, setPasswordLoaded] = React.useState(false);
  const save = useSaveState();

  React.useEffect(() => {
    let cancelled = false;
    apiGet<{ chase: Chase }>(`/api/chases/${chaseId}`)
      .then((res) => {
        if (cancelled) return;
        setForm((f) => ({ ...f, password: res.chase.password ?? "" }));
        setPasswordLoaded(true);
      })
      .catch(() => setPasswordLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [chaseId]);

  // Re-seed only when the console switches chase; live server writes must not
  // stomp on half-typed edits. Adjusted during render rather than in an effect
  // so the seeded values land in the same pass the new chase arrives in — the
  // fetch above resolves later and still wins for the password.
  const [seededFor, setSeededFor] = React.useState(chaseId);
  if (seededFor !== chaseId) {
    setSeededFor(chaseId);
    setForm(fromChase(chase));
  }

  function set<K extends keyof DetailsForm>(key: K, value: DetailsForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    save.markDirty();
  }

  async function onSave() {
    if (!form.name.trim()) {
      toast.error("A chase needs a name.");
      return;
    }
    save.markSaving();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      imageUrl: form.imageUrl,
      location: form.location,
      searchVisibility: form.searchVisibility,
      moderationMode: form.moderationMode,
      profanityFilter: form.profanityFilter,
      collectEmails: form.collectEmails,
    };
    // Only touch the password when we either have a new one or know we are
    // clearing a real, loaded value.
    if (form.password.trim()) payload.password = form.password.trim();
    else if (passwordLoaded) payload.password = null;

    try {
      await apiPatch(`/api/chases/${chaseId}`, payload);
      save.markSaved();
    } catch (error) {
      save.markFailed();
      toastError(error, "Couldn't save those details.");
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="Details"
        description="The basics players see, plus how submissions are moderated."
      />

      <Card>
        <CardContent className="pt-5">
          <SettingRow label="Chase name" htmlFor="details-name">
            <Input
              id="details-name"
              value={form.name}
              maxLength={120}
              onChange={(e) => set("name", e.target.value)}
            />
          </SettingRow>

          <SettingRow
            label="Description"
            hint="Shown on the join screen."
            htmlFor="details-description"
          >
            <Textarea
              id="details-description"
              value={form.description}
              maxLength={DESCRIPTION_MAX}
              aria-describedby="details-description-count"
              onChange={(e) =>
                set("description", e.target.value.slice(0, DESCRIPTION_MAX))
              }
            />
            <p
              id="details-description-count"
              aria-live="polite"
              className={
                form.description.length >= DESCRIPTION_MAX
                  ? "mt-1 text-xs font-semibold text-warning"
                  : "mt-1 text-xs text-muted-foreground"
              }
            >
              {form.description.length}/{DESCRIPTION_MAX} characters
            </p>
          </SettingRow>

          <SettingRow label="Cover image" hint="16:9 works best.">
            <ImageUpload
              label="Cover image"
              folder={`chases/${chaseId}/cover`}
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
              ratio="16/9"
            />
          </SettingRow>

          <SettingRow
            label="Location"
            hint="Optional. Helps players know where the chase happens."
          >
            <LocationPicker
              value={form.location}
              onChange={(next) => set("location", next)}
            />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <SettingRow
            label="Chase password"
            hint={
              chase.hasPassword && !passwordLoaded
                ? "A password is set. Type a new one to replace it."
                : "Leave blank for no password. Team passcodes bypass it."
            }
            htmlFor="details-password"
          >
            <Input
              id="details-password"
              value={form.password}
              maxLength={64}
              autoComplete="off"
              placeholder="No password"
              onChange={(e) => set("password", e.target.value)}
            />
          </SettingRow>

          <SettingRow
            label="Search visibility"
            hint="Public chases can be found by name; hidden ones need the code."
            htmlFor="details-visibility"
          >
            <Select
              id="details-visibility"
              value={form.searchVisibility}
              onChange={(e) =>
                set("searchVisibility", e.target.value as Chase["searchVisibility"])
              }
            >
              <option value="hidden">Hidden — invite only</option>
              <option value="public">Public — listed in search</option>
            </Select>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <SettingRow
            label="Moderation"
            hint="Review mode holds every submission until you approve it."
            htmlFor="details-moderation"
          >
            <Select
              id="details-moderation"
              value={form.moderationMode}
              onChange={(e) =>
                set("moderationMode", e.target.value as Chase["moderationMode"])
              }
            >
              <option value="auto">Auto-approve — points award instantly</option>
              <option value="review">Review queue — approve before points</option>
            </Select>
            {form.moderationMode === "review" && (
              <p className="mt-2 rounded-md bg-info-surface px-3 py-2 text-xs text-info">
                Submissions land in the Submissions tab as pending and earn no
                points until you approve them.
              </p>
            )}
          </SettingRow>

          <SettingRow label="Profanity filter">
            <Switch
              checked={form.profanityFilter}
              onChange={(v) => set("profanityFilter", v)}
              label="Flag risky captions and answers"
              description="Flags for review rather than deleting anything."
            />
          </SettingRow>

          <SettingRow label="Email collection">
            <Switch
              checked={form.collectEmails}
              onChange={(v) => set("collectEmails", v)}
              label="Ask players for an email address when they join"
              description="Included in the participants export."
            />
          </SettingRow>
        </CardContent>
      </Card>

      <SaveBar
        state={save.state}
        onSave={() => void onSave()}
        onDiscard={() => {
          setForm(fromChase(chase));
          save.markSaved();
        }}
      />
    </div>
  );
}
