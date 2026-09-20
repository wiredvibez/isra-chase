"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { kindOf, uploadMedia, validateMedia, type MediaKind } from "@/lib/media/upload";
import { bytes as fmtBytes } from "@/lib/format";
import type { CreateSubmissionResponse, PlayMission } from "./types";

function allowedKinds(accepts: "photos" | "videos" | "both"): MediaKind[] {
  if (accepts === "photos") return ["image"];
  if (accepts === "videos") return ["video"];
  return ["image", "video"];
}

function acceptAttribute(accepts: "photos" | "videos" | "both"): string {
  if (accepts === "photos") return "image/*";
  if (accepts === "videos") return "video/*";
  return "image/*,video/*";
}

function extensionFor(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  if (fromName) return fromName;
  const subtype = file.type.split("/")[1] ?? "bin";
  return subtype === "jpeg" ? "jpg" : subtype.replace(/[^a-z0-9]/g, "");
}

/** Read a video's duration without uploading it, so we can refuse early. */
function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}

export function CameraComposer({
  chaseId,
  mission,
  uid,
  onResult,
}: {
  chaseId: string;
  mission: PlayMission;
  uid: string;
  onResult: (result: CreateSubmissionResponse) => void;
}) {
  const config = mission.camera;
  const accepts = config?.accepts ?? "both";
  const liveOnly = config?.sources === "live_only";
  const maxVideoSeconds = config?.maxVideoSeconds ?? 30;

  const captureRef = React.useRef<HTMLInputElement>(null);
  const libraryRef = React.useRef<HTMLInputElement>(null);

  /** File and its preview URL move together so the URL is always revocable. */
  const [picked, setPicked] = React.useState<{ file: File; url: string } | null>(
    null,
  );
  const [caption, setCaption] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [sending, setSending] = React.useState(false);

  // The URL is created when a file is picked and revoked when it is replaced;
  // this only catches the last one, on unmount.
  const pickedRef = React.useRef<{ file: File; url: string } | null>(null);
  React.useEffect(
    () => () => {
      if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url);
    },
    [],
  );

  function replacePicked(next: File | null) {
    if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.url);
    const replacement = next
      ? { file: next, url: URL.createObjectURL(next) }
      : null;
    pickedRef.current = replacement;
    setPicked(replacement);
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    // Reset the input so re-picking the same file still fires a change event.
    event.target.value = "";
    if (!chosen) return;

    const invalid = validateMedia(chosen, allowedKinds(accepts));
    if (invalid) {
      replacePicked(null);
      setError(invalid);
      return;
    }

    if (kindOf(chosen) === "video") {
      const seconds = await videoDuration(chosen);
      if (seconds !== null && seconds > maxVideoSeconds + 0.5) {
        replacePicked(null);
        setError(
          `הסרטון במשימה הזאת יכול להיות עד ${maxVideoSeconds} שניות, וזה ${Math.round(seconds)}. קצצו אותו ותנסו שוב.`,
        );
        return;
      }
    }

    setError(null);
    replacePicked(chosen);
  }

  async function submit() {
    const file = picked?.file;
    if (!file) return;
    setSending(true);
    setProgress(0);
    setError(null);
    try {
      const path = `chases/${chaseId}/submissions/${uid}/${mission.id}-${Date.now()}.${extensionFor(file)}`;
      const media = await uploadMedia(file, path, setProgress);
      const result = await apiPost<CreateSubmissionResponse>(
        `/api/chases/${chaseId}/submissions`,
        {
          missionId: mission.id,
          caption: caption.trim() || null,
          media,
        },
      );
      onResult(result);
    } catch (caught) {
      const message =
        caught instanceof ApiClientError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "ההעלאה נתקעה. תנסו שוב.";
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
      setProgress(null);
    }
  }

  const isVideo = picked ? kindOf(picked.file) === "video" : false;
  const captureLabel =
    accepts === "videos"
      ? "מצלמים וידאו"
      : accepts === "photos"
        ? "מצלמים תמונה"
        : "פותחים מצלמה";

  return (
    <div className="space-y-4">
      <input
        ref={captureRef}
        type="file"
        accept={acceptAttribute(accepts)}
        capture="environment"
        className="sr-only"
        onChange={onPick}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={libraryRef}
        type="file"
        accept={acceptAttribute(accepts)}
        className="sr-only"
        onChange={onPick}
        aria-hidden
        tabIndex={-1}
      />

      {picked ? (
        <figure className="relative overflow-hidden rounded-lg border border-border bg-surface-inset">
          {isVideo ? (
            <video
              src={picked.url}
              controls
              playsInline
              className="max-h-[60dvh] w-full bg-black object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picked.url}
              alt="תצוגה מקדימה של ההגשה שלכם"
              className="max-h-[60dvh] w-full object-contain"
            />
          )}
          <button
            type="button"
            onClick={() => replacePicked(null)}
            disabled={sending}
            aria-label="מסירים את הקובץ ובוחרים אחר"
            className="absolute end-2 top-2 flex size-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
          <figcaption className="px-3 py-2 text-xs text-muted-foreground">
            {picked.file.name} · {fmtBytes(picked.file.size)}
          </figcaption>
        </figure>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => captureRef.current?.click()}
          >
            <Camera className="size-5" aria-hidden />
            {captureLabel}
          </Button>

          {!liveOnly && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => libraryRef.current?.click()}
            >
              <ImageIcon className="size-5" aria-hidden />
              בוחרים מהגלריה
            </Button>
          )}

          <p className="px-1 text-xs text-muted-foreground">
            {liveOnly
              ? "במשימה הזאת מצלמים בזמן אמת — העלאה מהגלריה חסומה, אז תצלמו כאן ועכשיו."
              : accepts === "photos"
                ? "תמונות בלבד."
                : accepts === "videos"
                  ? `וידאו בלבד, עד ${maxVideoSeconds} שניות.`
                  : `תמונה או וידאו, סרטונים עד ${maxVideoSeconds} שניות.`}
          </p>
        </div>
      )}

      <Field
        label="כיתוב"
        htmlFor="caption"
        hint="לא חובה — אבל הפיד אוהב כיתוב טוב."
      >
        <Textarea
          id="caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="כמה מילים על זה…"
          disabled={sending}
        />
      </Field>

      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} label="התקדמות ההעלאה" />
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            מעלים… {progress}%
          </p>
        </div>
      )}

      <p role="alert" aria-live="assertive" className="text-sm font-medium text-danger empty:hidden">
        {error}
      </p>

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => void submit()}
        disabled={!picked}
        loading={sending}
      >
        {!sending && <Send className="size-5" aria-hidden />}
        {sending ? "שולחים…" : "שולחים את המשימה"}
      </Button>
    </div>
  );
}
