"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, end-side drawer from `sm` up.
 * Native <dialog> again, so Esc + focus trap are free.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const onClick = (event: MouseEvent) => {
      if (event.target !== el) return;
      const rect = el.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) el.close();
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  return (
    <dialog
      ref={ref}
      closedby="any"
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        "bg-surface text-foreground shadow-pop backdrop:bg-black/50",
        "open:flex open:flex-col",
        // WebKit still gives `dialog` the UA default `position: absolute`,
        // so on iOS a sheet opened from a scrolled page is laid out against
        // the document instead of the viewport and lands off-screen. Pinning
        // it ourselves is what Chrome and Firefox already do for :modal.
        "fixed inset-0",
        // phone: docked to the bottom, full width
        "mt-auto mb-0 ms-0 me-0 max-h-[85dvh] w-full max-w-none rounded-t-xl border-t border-border",
        // tablet+: right drawer, full height
        "sm:mt-0 sm:ms-auto sm:h-dvh sm:max-h-none sm:w-[26rem] sm:rounded-none sm:rounded-s-xl sm:border-s sm:border-t-0",
      )}
    >
      <header className="flex items-center gap-3 border-b border-border p-4">
        <h2 id={titleId} className="flex-1 font-display text-base font-bold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="סגירה"
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted"
        >
          <X className="size-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {children}
      </div>
      {footer && (
        <footer className="flex items-center justify-end gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
