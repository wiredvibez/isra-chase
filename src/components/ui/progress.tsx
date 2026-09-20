import { cn } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  tone = "brand",
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "brand" | "accent" | "gold";
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const fill = {
    brand: "bg-primary",
    accent: "bg-accent",
    gold: "bg-gold-500",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-surface-inset",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
