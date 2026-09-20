"use client";

import * as React from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

/**
 * Small action menu. Native popovers still can't be anchored everywhere we
 * need, so this is a plain absolutely-positioned list with outside-click and
 * Escape handling plus roving focus.
 */
export function Menu({
  items,
  label = "עוד פעולות",
  align = "end",
  trigger,
  className,
}: {
  items: MenuItem[];
  label?: string;
  align?: "start" | "end";
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) listRef.current?.querySelector("button")?.focus();
  }, [open]);

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === "ArrowDown"
        ? (index + 1) % buttons.length
        : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        {trigger ?? <MoreVertical className="size-4" aria-hidden />}
      </button>
      {open && (
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          onKeyDown={onListKeyDown}
          className={cn(
            "absolute z-40 mt-1 min-w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-pop",
            align === "end" ? "end-0" : "start-0",
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-start text-sm font-medium hover:bg-surface-muted disabled:opacity-50",
                item.tone === "danger" ? "text-danger" : "text-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
