import { Camera, MapPin, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionType } from "@/lib/domain/types";

const BY_TYPE = {
  camera: { icon: Camera, label: "משימת צילום", tone: "bg-accent/12 text-accent" },
  text: { icon: Type, label: "משימת טקסט", tone: "bg-info-surface text-info" },
  gps: { icon: MapPin, label: "משימת מיקום", tone: "bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100" },
} as const;

export function MissionIcon({
  type,
  className,
  size = "md",
}: {
  type: MissionType;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = BY_TYPE[type];
  const Icon = meta.icon;
  return (
    <span
      role="img"
      aria-label={meta.label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        size === "sm" ? "size-8" : "size-11",
        meta.tone,
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}
