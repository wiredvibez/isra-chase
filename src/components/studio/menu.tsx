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
 * Small action menu.
 *
 * The list is a `popover`, which promotes it to the top layer. That is the
 * whole point: absolutely positioned, it was clipped by the `overflow-hidden`
 * on the submission card that keeps media inside the rounded corners, which
 * made four moderation actions unreachable. The top layer escapes any
 * ancestor's overflow, and brings light dismiss and Escape with it.
 *
 * CSS anchor positioning would place it declaratively, but it is Chromium-only
 * today, so coordinates are computed from the trigger's rect and it is pinned
 * with `position: fixed`. Recomputed on scroll and resize so it stays put.
 */
export function Menu({
  items,
  label = "עוד פעולות",
  trigger,
  className,
}: {
  items: MenuItem[];
  label?: string;
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState({ top: 0, right: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const place = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const list = listRef.current;
    const width = list?.offsetWidth || 208;
    const height = list?.offsetHeight || 0;

    // Physical `right`, not `inset-inline-end`: this document is RTL, where
    // the inline end is the LEFT edge, and anchoring there put the menu off
    // screen. Clamped so it can never hang past either edge, and flipped above
    // the trigger when there is no room below.
    const right = Math.min(
      Math.max(window.innerWidth - rect.right, 8),
      Math.max(window.innerWidth - width - 8, 8),
    );
    const below = rect.bottom + 4;
    const top =
      height && below + height > window.innerHeight - 8
        ? Math.max(rect.top - height - 4, 8)
        : below;

    setCoords({ top, right });
  }, []);

  // Toggling `popover` has to go through the element's own API so the browser
  // manages the top layer and light dismiss.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (open) {
      // Show first: a hidden popover measures zero, and place() needs its real
      // size to clamp and to decide whether to flip above the trigger.
      if (!list.matches(":popover-open")) list.showPopover();
      place();
      list.querySelector("button")?.focus();
    } else if (list.matches(":popover-open")) {
      list.hidePopover();
    }
  }, [open, place]);

  React.useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

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
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        {trigger ?? <MoreVertical className="size-4" aria-hidden />}
      </button>
      <div
        ref={listRef}
        popover="auto"
        role="menu"
        aria-label={label}
        onKeyDown={onListKeyDown}
        onToggle={(e) => {
          // Light dismiss and Escape close it without going through our state.
          if ((e as unknown as { newState: string }).newState === "closed") setOpen(false);
        }}
        style={{
          // The UA stylesheet gives a popover `inset: 0`, which would stretch
          // it across the viewport; clear it before setting our own edges.
          inset: "auto",
          position: "fixed",
          top: coords.top,
          right: coords.right,
          margin: 0,
        }}
        className="min-w-52 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-pop"
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
    </div>
  );
}
