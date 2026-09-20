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
import { ImageUpload } from "../image-upload";
import { LocationPicker } from "../location-picker";
import {
  MISSION_TYPE_LABEL,
  radiusLabel,
  TEXT_BADGE_LABEL,
  textBadge,
  toastError,
} from "../studio-utils";
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
    if (!form.name.trim()) return "למשימה צריך שם.";
    if (!form.description.trim()) return "למשימה צריך תיאור.";
    if (!Number.isFinite(form.points) || form.points < 0)
      return "הניקוד חייב להיות אפס או יותר.";
    if (form.type === "gps" && (form.gps.lat === null || form.gps.lng === null))
      return "בחרו מיקום למשימה הזו.";
    if (form.release.kind === "specific" && !form.release.atMs)
      return "בחרו מתי המשימה נפתחת.";
    if (form.expiry.kind === "specific" && !form.expiry.atMs)
      return "בחרו מתי המשימה נסגרת.";
    if (form.release.kind === "mission" && !form.release.missionId)
      return "בחרו את המשימה שפותחת את זו.";
    if (form.linkUrl.trim()) {
      try {
        new URL(form.linkUrl.trim());
      } catch {
        return "הקישור החיצוני אינו כתובת תקינה.";
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
      setError(toastError(err, "לא הצלחנו לשמור את המשימה."));
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
      title={mission ? "עריכת משימה" : "משימה חדשה"}
      description={`משימת ${MISSION_TYPE_LABEL[form.type]}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            {mission ? "שמירת המשימה" : "יצירת המשימה"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Tabs
          value={pane}
          onChange={setPane}
          items={[
            { id: "basics", label: "בסיס" },
            { id: "type", label: MISSION_TYPE_LABEL[form.type] },
            { id: "availability", label: "זמינות" },
            { id: "extras", label: "תוספות" },
          ]}
        />

        {error && (
          <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        {pane === "basics" && (
          <div className="space-y-4">
            <Field label="שם" htmlFor="mission-name" required>
              <Input
                id="mission-name"
                value={form.name}
                maxLength={120}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field
              label="תיאור"
              htmlFor="mission-description"
              required
              hint="כתבו לשחקנים בדיוק מה נחשב לביצוע."
            >
              <Textarea
                id="mission-description"
                value={form.description}
                maxLength={4000}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ניקוד" htmlFor="mission-points" required>
                <Input
                  id="mission-points"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.points}
                  onChange={(e) => set("points", Number(e.target.value))}
                />
              </Field>
              <Field label="סוג המשימה" htmlFor="mission-type">
                <Select
                  id="mission-type"
                  value={form.type}
                  onChange={(e) => changeType(e.target.value as MissionType)}
                >
                  <option value="camera">צילום — תמונה או סרטון</option>
                  <option value="text">טקסט — תשובה מוקלדת</option>
                  <option value="gps">מיקום — להגיע למקום</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {pane === "type" && form.type === "camera" && (
          <div className="space-y-4">
            <Field label="מה מתקבל" htmlFor="camera-accepts">
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
                <option value="both">תמונות וסרטונים</option>
                <option value="photos">תמונות בלבד</option>
                <option value="videos">סרטונים בלבד</option>
              </Select>
            </Field>
            <Field
              label="מקור ההגשה"
              htmlFor="camera-sources"
              hint="צילום במקום בלבד הוא ההגדרה נגד רמאות: אי אפשר להעלות מהגלריה."
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
                <option value="live_and_library">צילום במקום או מהגלריה</option>
                <option value="live_only">צילום במקום בלבד</option>
              </Select>
            </Field>
            {form.camera.accepts !== "photos" && (
              <Field label="אורך סרטון מרבי" htmlFor="camera-seconds" hint="בשניות.">
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
              <span className="text-sm font-semibold">בדיקת התשובה</span>
              <Badge tone={badge === "open" ? "info" : badge === "exact" ? "brand" : "accent"}>
                {TEXT_BADGE_LABEL[badge]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {badge === "open"
                ? "בלי תשובות מאושרות, כל מה שהשחקנים יקלידו יתקבל."
                : badge === "exact"
                  ? "התשובה חייבת להיות זהה לאחת מהתשובות כאן."
                  : "גם תשובה קרובה נחשבת: סדר מילים ושגיאות כתיב קטנות נסלחים, אבל מספרים עדיין חייבים להתאים."}
            </p>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">תשובות מאושרות</legend>
              {form.text.acceptedResponses.map((response, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={response}
                    aria-label={`תשובה מאושרת ${index + 1}`}
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
                    aria-label={`הסרת תשובה מאושרת ${index + 1}`}
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
                הוספת תשובה
              </Button>
            </fieldset>

            <Switch
              checked={form.text.approximate}
              onChange={(v) => set("text", { ...form.text, approximate: v })}
              label="לקבל גם תשובות מקורבות"
              description="מתעלם מאותיות גדולות/קטנות ומסדר מילים, ומקבל תשובות בדמיון של 92% ומעלה."
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
              label="טווח קבלה"
              htmlFor="gps-radius"
              hint="השחקנים לא רואים את הסימון ולא את הרדיוס."
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
              label="תמונה מצורפת"
              ratio="2/1"
              hint="לא חובה. תמונת ייחוס שמוצגת עם המשימה (יחס 2:1)."
              folder={`chases/${chaseId}/missions/${uploadId}`}
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
            />
            <Field label="קישור חיצוני" htmlFor="mission-link" hint="לא חובה.">
              <Input
                id="mission-link"
                type="url"
                inputMode="url"
                dir="ltr"
                placeholder="https://"
                value={form.linkUrl}
                onChange={(e) => set("linkUrl", e.target.value)}
              />
            </Field>
            <Switch
              checked={form.feedVisibility === "shown"}
              onChange={(v) => set("feedVisibility", v ? "shown" : "hidden")}
              label="להציג את ההגשות בפיד הפעילות"
              description="משימה מוסתרת שומרת את התשובות מחוץ לפיד המשותף לכל הקבוצות."
            />
            <Switch
              checked={form.isDraft}
              onChange={(v) => set("isDraft", v)}
              label="לשמור כטיוטה"
              description="טיוטות מוסתרות מהשחקנים עד שתפרסמו אותן."
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
