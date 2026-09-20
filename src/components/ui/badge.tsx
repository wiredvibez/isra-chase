import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "brand"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gold";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground border-border",
  brand: "bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900 dark:text-brand-100 dark:border-brand-700",
  accent: "bg-accent/12 text-accent border-accent/30",
  success: "bg-success-surface text-success border-success/25",
  warning: "bg-warning-surface text-warning border-warning/25",
  danger: "bg-danger-surface text-danger border-danger/25",
  info: "bg-info-surface text-info border-info/25",
  gold: "bg-gold-400/20 text-gold-500 border-gold-400/40",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
