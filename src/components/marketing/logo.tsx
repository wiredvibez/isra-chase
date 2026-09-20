import { cn } from "@/lib/utils";

/**
 * The Isra Chase mark: a route of waypoints climbing towards a target ring.
 * Colours come from the semantic `--primary` pair rather than a Tailwind
 * `dark:` variant, because the theme can also be forced with `data-theme`.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g
        className="stroke-primary-foreground fill-primary-foreground"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M8.5 23 14 17.5l5 2 3.5-7.5"
          fill="none"
          strokeWidth="1.9"
          strokeDasharray="0.2 3.6"
        />
        <circle cx="8.5" cy="23" r="1.9" stroke="none" />
        <circle cx="14" cy="17.5" r="1.6" stroke="none" />
        <circle cx="19" cy="19.5" r="1.6" stroke="none" />
        <circle cx="22.8" cy="10.2" r="3.4" fill="none" strokeWidth="2.1" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-xl font-extrabold tracking-tight">
        Isra Chase
      </span>
    </span>
  );
}
