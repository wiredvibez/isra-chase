"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { uploadMedia, validateMedia } from "@/lib/media/upload";

function extensionOf(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "";
  return fromName || "jpg";
}

/**
 * A round photo control used for both the player's avatar and a new team's
 * picture. Uploads straight to Storage so the API only ever receives a URL.
 */
export function PhotoPicker({
  name,
  value,
  onChange,
  pathFor,
  label,
  disabled,
}: {
  /** Seeds the initials fallback. */
  name: string;
  value: string | null;
  onChange: (url: string | null) => void;
  pathFor: (extension: string) => string;
  label: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const invalid = validateMedia(file, ["image"]);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setProgress(0);
    try {
      const media = await uploadMedia(file, pathFor(extensionOf(file)), setProgress);
      onChange(media.url);
    } catch {
      setError("That photo didn't upload. Try another one.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={pick}
        aria-hidden
        tabIndex={-1}
      />

      <span className="relative">
        <Avatar name={name || "?"} src={value} size="xl" />
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove photo"
            className="absolute -right-1 -top-1 flex size-7 items-center justify-center rounded-full bg-surface text-muted-foreground shadow-card ring-1 ring-border"
          >
            <X className="size-4" />
          </button>
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || progress !== null}
          className="inline-flex h-11 items-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-sm font-semibold disabled:opacity-60"
        >
          <Camera className="size-[1.125rem]" aria-hidden />
          {value ? "Change photo" : label}
        </button>

        {progress !== null && (
          <Progress value={progress} label="Photo upload progress" />
        )}

        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
