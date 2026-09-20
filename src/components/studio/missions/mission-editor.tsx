"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { apiPatch, apiPost } from "@/lib/api-client";
import { GPS_RADII, type GpsRadius, type Mission, type MissionType } from "@/lib/domain/types";
import { radiusLabel } from "@/lib/format";
import { ImageUpload } from "../image-upload";
import { LocationPicker } from "../location-picker";
import { MISSION_TYPE_LABEL, textBadge, toastError } from "../studio-utils";
import {
  AvailabilityEditor,
  expiryToInput,
  releaseToInput,
  type ExpiryInput,
  type ReleaseInput,
} from "./availability-editor";

interface MissionForm {
  name: string;
  description: string;
  points: number;
  type: MissionType;
  imageUrl: string | null;
  linkUrl: string;
  feedVisibility: "shown" | "hidden";
  isDraft: boolean;
  camera: { accepts: "photos" | "videos" | "both"; sources: "live_and_library" | "live_only"; maxVideoSeconds: number };
  text: { acceptedResponses: string[]; approximate: boolean };
  gps: { lat: number | null; lng: number | null; radiusM: GpsRadius; address: string | null };
  release: ReleaseInput;
  expiry: ExpiryInput;
}

function blankForm(): MissionForm {
  return {
    name: "",
    description: "",
    points: 100,
    type: "camera",
    imageUrl: null,
    linkUrl: "",
    feedVisibility: "shown",
    isDraft: false,
    camera: { accepts: "both", sources: "live_and_library", maxVideoSeconds: 30 },
    text: { acceptedResponses: [""], approximate: false },
    gps: { lat: null, lng: null, radiusM: 100, address: null },
    release: { kind: "chase_start" },
    expiry: { kind: "chase_end" },
  };
}

function toForm(mission: Mission): MissionForm {
  const blank = blankForm();
  return {
    name: mission.name,
    description: mission.description ?? "",
    points: mission.points ?? 0,
    type: mission.type,
    imageUrl: mission.imageUrl ?? null,
    linkUrl: mission.linkUrl ?? "",
    feedVisibility: mission.feedVisibility ?? "shown",
    isDraft: Boolean(mission.isDraft),
    camera: mission.camera ?? blank.camera,
    text: mission.text
      ? {
          acceptedResponses: mission.text.acceptedResponses.length
            ? [...mission.text.acceptedResponses]
            : [""],
          approximate: mission.text.approximate,
        }
      : blank.text,
    gps: mission.gps ?? blank.gps,
    release: releaseToInput(mission.release),
    expiry: expiryToInput(mission.expiry),
  };
}

/** Feed defaults differ by type, exactly as Goosechase's do. */
const FEED_DEFAULT: Record<MissionType, "shown" | "hidden"> = {
  camera: "shown",
  text: "hidden",
  gps: "hidden",
};

export function MissionEditor({
  chaseId,
  mission,
  missions,
  open,
  onClose,
  onSaved,
}: {
  chaseId: string;
  mission: Mission | null;
  missions: Mission[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<MissionForm>(() =>
    mission ? toForm(mission) : blankForm(),
  );
  const [pane, setPane] = React.useState("basics");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // A brand-new mission has no id yet, so its attachment needs a scratch
  // folder that still matches the Storage rules' chases/{id}/missions/{x} shape.
  // useId is stable and SSR-safe; its separators are stripped for the path.
  const draftId = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const uploadId = mission?.id ?? `draft-${draftId}`;

  // Re-seed as the dialog opens, or as it is pointed at another mission.
  // Adjusted during render rather than in an effect so the form never paints
  // once with the previously edited mission's values.
  const [seeded, setSeeded] = React.useState({ open, mission });
  if (seeded.open !== open || seeded.mission !== mission) {
    setSeeded({ open, mission });
    if (open) {
      setForm(mission ? toForm(mission) : blankForm());
      setPane("basics");
      setError(null);
    }
  }

  function set<K extends keyof MissionForm>(key: K, value: MissionForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function changeType(type: MissionType) {
    setForm((f) => ({ ...f, type, feedVisibility: FEED_DEFAULT[type] }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Missions need a name.";
    if (!form.description.trim()) return "Missions need a description.";
    if (!Number.isFinite(form.points) || form.points < 0)
      return "Points must be zero or more.";
    if (form.type === "gps" && (form.gps.lat === null || form.gps.lng === null))
      return "Pick a location for this mission.";
    if (form.release.kind === "specific" && !form.release.atMs)
      return "Choose the time this mission is released.";
    if (form.expiry.kind === "specific" && !form.expiry.atMs)
      return "Choose the time this mission expires.";
    if (form.release.kind === "mission" && !form.release.missionId)
      return "Choose the mission that unlocks this one.";
    if (form.linkUrl.trim()) {
      try {
        new URL(form.linkUrl.trim());
      } catch {
        return "That external link isn't a valid URL.";
      }
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);

    const accepted = form.text.acceptedResponses
      .map((r) => r.trim())
      .filter(Boolean);
    const cameraTriggered =
      form.type === "camera" && form.release.kind === "mission";

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      points: Math.round(form.points),
      type: form.type,
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl.trim() || null,
      feedVisibility: form.feedVisibility,
      isDraft: form.isDraft,
      camera: form.type === "camera" ? form.camera : null,
      text:
        form.type === "text"
          ? { acceptedResponses: accepted, approximate: form.text.approximate }
          : null,
      gps:
        form.type === "gps" && form.gps.lat !== null && form.gps.lng !== null
          ? {
              lat: form.gps.lat,
              lng: form.gps.lng,
              radiusM: form.gps.radiusM,
              address: form.gps.address,
            }
          : null,
      release:
        form.release.kind === "specific"
          ? { kind: "specific" as const, atMs: form.release.atMs }
          : form.release.kind === "mission"
            ? { ...form.release, requireCorrect: cameraTriggered ? false : form.release.requireCorrect }
            : form.release,
      expiry:
        form.expiry.kind === "specific"
          ? { kind: "specific" as const, atMs: form.expiry.atMs }
          : form.expiry,
    };

    try {
      if (mission) {
        await apiPatch(`/api/chases/${chaseId}/missions/${mission.id}`, payload);
      } else {
        await apiPost(`/api/chases/${chaseId}/missions`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(toastError(err, "Couldn't save that mission."));
    } finally {
      setSaving(false);
    }
  }

  const badge = textBadge(form.text.acceptedResponses, form.text.approximate);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title={mission ? "Edit mission" : "New mission"}
      description={`${MISSION_TYPE_LABEL[form.type]} mission`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            {mission ? "Save mission" : "Create mission"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Tabs
          value={pane}
          onChange={setPane}
          items={[
            { id: "basics", label: "Basics" },
            { id: "type", label: MISSION_TYPE_LABEL[form.type] },
            { id: "availability", label: "Availability" },
            { id: "extras", label: "Extras" },
          ]}
        />

        {error && (
          <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {pane === "basics" && (
          <div className="space-y-4">
            <Field label="Name" htmlFor="mission-name" required>
              <Input
                id="mission-name"
                value={form.name}
                maxLength={120}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="mission-description"
              required
              hint="Tell players exactly what counts as done."
            >
              <Textarea
                id="mission-description"
                value={form.description}
                maxLength={4000}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Points" htmlFor="mission-points" required>
                <Input
                  id="mission-points"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.points}
                  onChange={(e) => set("points", Number(e.target.value))}
                />
              </Field>
              <Field label="Mission type" htmlFor="mission-type">
                <Select
                  id="mission-type"
                  value={form.type}
                  onChange={(e) => changeType(e.target.value as MissionType)}
                >
                  <option value="camera">Camera — photo or video</option>
                  <option value="text">Text — typed answer</option>
                  <option value="gps">GPS — be in a place</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {pane === "type" && form.type === "camera" && (
          <div className="space-y-4">
            <Field label="Accepted submissions" htmlFor="camera-accepts">
              <Select
                id="camera-accepts"
                value={form.camera.accepts}
                onChange={(e) =>
                  set("camera", {
                    ...form.camera,
                    accepts: e.target.value as MissionForm["camera"]["accepts"],
                  })
                }
              >
                <option value="both">Photos and videos</option>
                <option value="photos">Photos only</option>
                <option value="videos">Videos only</option>
              </Select>
            </Field>
            <Field
              label="Submission sources"
              htmlFor="camera-sources"
              hint="Live capture only is the anti-cheat setting: no camera roll."
            >
              <Select
                id="camera-sources"
                value={form.camera.sources}
                onChange={(e) =>
                  set("camera", {
                    ...form.camera,
                    sources: e.target.value as MissionForm["camera"]["sources"],
                  })
                }
              >
                <option value="live_and_library">Live capture and library</option>
                <option value="live_only">Live capture only</option>
              </Select>
            </Field>
            {form.camera.accepts !== "photos" && (
              <Field label="Max video length" htmlFor="camera-seconds" hint="Seconds.">
                <Input
                  id="camera-seconds"
                  type="number"
                  min={1}
                  max={300}
                  className="max-w-32"
                  value={form.camera.maxVideoSeconds}
                  onChange={(e) =>
                    set("camera", {
                      ...form.camera,
                      maxVideoSeconds: Math.max(
                        1,
                        Math.min(300, Number(e.target.value) || 30),
                      ),
                    })
                  }
                />
              </Field>
            )}
          </div>
        )}

        {pane === "type" && form.type === "text" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Grading</span>
              <Badge tone={badge === "open" ? "info" : badge === "exact" ? "brand" : "accent"}>
                {badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {badge === "open"
                ? "No accepted responses means anything players type is accepted."
                : badge === "exact"
                  ? "Answers must match one of these exactly."
                  : "Close answers count: word order and small typos are forgiven, numbers still have to match."}
            </p>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Accepted responses</legend>
              {form.text.acceptedResponses.map((response, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={response}
                    aria-label={`Accepted response ${index + 1}`}
                    onChange={(e) => {
                      const next = [...form.text.acceptedResponses];
                      next[index] = e.target.value;
                      set("text", { ...form.text, acceptedResponses: next });
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove accepted response ${index + 1}`}
                    onClick={() =>
                      set("text", {
                        ...form.text,
                        acceptedResponses: form.text.acceptedResponses.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  set("text", {
                    ...form.text,
                    acceptedResponses: [...form.text.acceptedResponses, ""],
                  })
                }
              >
                <Plus className="size-4" aria-hidden />
                Add response
              </Button>
            </fieldset>

            <Switch
              checked={form.text.approximate}
              onChange={(v) => set("text", { ...form.text, approximate: v })}
              label="Accept approximate responses"
              description="Ignores case, word order and near-misses above 92% similarity."
            />
          </div>
        )}

        {pane === "type" && form.type === "gps" && (
          <div className="space-y-4">
            <LocationPicker
              radiusM={form.gps.radiusM}
              clearable={false}
              value={
                form.gps.lat !== null && form.gps.lng !== null
                  ? {
                      label: form.gps.address ?? "",
                      lat: form.gps.lat,
                      lng: form.gps.lng,
                    }
                  : null
              }
              onChange={(next) =>
                set("gps", {
                  ...form.gps,
                  lat: next?.lat ?? null,
                  lng: next?.lng ?? null,
                  address: next?.label || null,
                })
              }
            />
            <Field
              label="Accept within"
              htmlFor="gps-radius"
              hint="Players never see the pin or the radius."
            >
              <Select
                id="gps-radius"
                className="max-w-40"
                value={String(form.gps.radiusM)}
                onChange={(e) =>
                  set("gps", {
                    ...form.gps,
                    radiusM: Number(e.target.value) as GpsRadius,
                  })
                }
              >
                {GPS_RADII.map((radius) => (
                  <option key={radius} value={radius}>
                    {radiusLabel(radius)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {pane === "availability" && (
          <AvailabilityEditor
            release={form.release}
            expiry={form.expiry}
            onRelease={(next) => set("release", next)}
            onExpiry={(next) => set("expiry", next)}
            missions={missions}
            currentMissionId={mission?.id ?? null}
            missionType={form.type}
          />
        )}

        {pane === "extras" && (
          <div className="space-y-4">
            <ImageUpload
              label="Attachment"
              ratio="2/1"
              hint="Optional reference image, shown with the mission (2:1)."
              folder={`chases/${chaseId}/missions/${uploadId}`}
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
            />
            <Field label="External link" htmlFor="mission-link" hint="Optional.">
              <Input
                id="mission-link"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={form.linkUrl}
                onChange={(e) => set("linkUrl", e.target.value)}
              />
            </Field>
            <Switch
              checked={form.feedVisibility === "shown"}
              onChange={(v) => set("feedVisibility", v ? "shown" : "hidden")}
              label="Show submissions in the activity feed"
              description="Hidden missions keep answers out of the cross-team feed."
            />
            <Switch
              checked={form.isDraft}
              onChange={(v) => set("isDraft", v)}
              label="Keep as a draft"
              description="Drafts are invisible to players until you publish them."
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
