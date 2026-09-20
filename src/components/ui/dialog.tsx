"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog> element.
 * - Opened with showModal() so focus trapping + top-layer come for free.
 * - closedby="any" gives declarative light dismiss; Safari still lacks it, so
 *   we install a backdrop-click fallback when the property is missing.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  dismissable?: boolean;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Light-dismiss fallback for browsers without `closedby`.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !dismissable) return;
    if ("closedBy" in HTMLDialogElement.prototype) return;
    const onClick = (event: MouseEvent) => {
      if (event.target !== el) return;
      const rect = el.getBoundingClientRect();
      const insideContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (insideContent) return;
      el.close();
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [dismissable]);

  const widths = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
  }[size];

  return (
    <dialog
      ref={ref}
      closedby={dismissable ? "any" : "closerequest"}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        if (!dismissable) e.preventDefault();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] overflow-visible",
        "rounded-lg border border-border bg-surface text-foreground shadow-pop",
        "backdrop:bg-black/50 backdrop:backdrop-blur-[2px]",
        "open:flex open:flex-col",
        widths,
      )}
    >
      <header className="flex items-start gap-3 border-b border-border p-5">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-lg font-bold">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {dismissable && (
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="סגירה"
            className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        )}
      </header>
      {/* A confirm dialog often has nothing but a title and a description, and
          an always-rendered body left an empty bordered strip between them. */}
      {children ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      ) : null}
      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-5">
          {footer}
        </footer>
      )}
    </dialog>
  );
}

/** Confirmation prompt — the destructive-action guard used across the app. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  tone = "danger",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-border-strong px-4 text-sm font-semibold hover:bg-surface-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={cn(
              "h-10 rounded-md px-4 text-sm font-semibold text-white disabled:opacity-60",
              tone === "danger" ? "bg-danger" : "bg-primary",
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    />
  );
}
