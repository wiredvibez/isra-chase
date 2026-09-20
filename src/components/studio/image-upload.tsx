"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadMedia, validateMedia } from "@/lib/media/upload";
import { cn } from "@/lib/utils";
import { safeFileName, toastError } from "./studio-utils";

const ratios = {
  "16/9": "aspect-video",
  "2/1": "aspect-[2/1]",
  "2/3": "aspect-[2/3]",
  "1/1": "aspect-square",
} as const;

/**
 * Direct-to-Storage image field. The path must match storage.rules, so callers
 * pass a folder the rules already allow (cover / missions / teams).
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  label,
  hint,
  ratio = "16/9",
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  label: string;
  hint?: string;
  ratio?: keyof typeof ratios;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const inputId = React.useId();

  async function onPick(file: File | undefined) {
    if (!file) return;
    const problem = validateMedia(file, ["image"]);
    if (problem) {
      toastError(new Error(problem));
      return;
    }
    setProgress(0);
    try {
      const media = await uploadMedia(
        file,
        `${folder}/${safeFileName(file.name)}`,
        setProgress,
      );
      onChange(media.url);
    } catch (error) {
      toastError(error, "התמונה לא עלתה.");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-32 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted",
            ratios[ratio],
          )}
        >
          {value ? (
            // Storage download URLs are not configured for next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={`תצוגה מקדימה: ${label}`}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              loading={progress !== null}
            >
              {value ? "החלפת" : "העלאת"} {label}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange(null)}
              >
                <Trash2 className="size-4" aria-hidden />
                הסרה
              </Button>
            )}
          </div>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {progress !== null && (
            <Progress value={progress} label={`בהעלאה: ${label}`} />
          )}
        </div>
      </div>
    </div>
  );
}
