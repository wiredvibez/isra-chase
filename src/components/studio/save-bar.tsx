"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "dirty" | "saving" | "saved";

/** Tracks dirty/saving/saved for the settings tabs that use an explicit Save. */
export function useSaveState() {
  const [state, setState] = React.useState<SaveState>("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const markDirty = React.useCallback(() => setState("dirty"), []);
  const markSaving = React.useCallback(() => setState("saving"), []);
  const markSaved = React.useCallback(() => {
    setState("saved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2500);
  }, []);
  const markFailed = React.useCallback(() => setState("dirty"), []);

  return { state, markDirty, markSaving, markSaved, markFailed };
}

export function SaveBar({
  state,
  onSave,
  onDiscard,
  className,
  label = "Save changes",
}: {
  state: SaveState;
  onSave: () => void;
  onDiscard?: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 flex items-center gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border",
        className,
      )}
    >
      <p
        aria-live="polite"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground"
      >
        {state === "saved" && (
          <>
            <Check className="size-4 text-success" aria-hidden />
            <span className="text-success">Saved</span>
          </>
        )}
        {state === "dirty" && "Unsaved changes"}
        {state === "saving" && "Saving…"}
      </p>
      {onDiscard && state === "dirty" && (
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
          Discard
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        onClick={onSave}
        loading={state === "saving"}
        disabled={state === "idle" || state === "saved"}
      >
        {label}
      </Button>
    </div>
  );
}
