import { Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A drawn city map with a dotted route between a camera mission, a text
 * mission and a GPS check-in. Every colour is an alpha blend of a brand token
 * over `--surface`, so the same drawing reads correctly in both themes.
 */
function MapDrawing() {
  const blocks: Array<[number, number, number, number]> = [
    [24, 28, 66, 60],
    [126, 24, 58, 64],
    [196, 34, 64, 54],
    [296, 22, 70, 68],
    [24, 122, 66, 58],
    [200, 120, 64, 56],
    [296, 120, 72, 58],
    [24, 212, 66, 62],
    [126, 210, 62, 70],
  ];

  return (
    <svg
      viewBox="0 0 400 320"
      role="img"
      aria-label="A city map with a dotted route linking a photo mission, a text mission and a GPS check-in."
      className="w-full h-auto"
    >
      <defs>
        <clipPath id="hero-map-clip">
          <rect width="400" height="320" rx="24" />
        </clipPath>
      </defs>

      <g clipPath="url(#hero-map-clip)">
        <rect width="400" height="320" className="fill-surface-muted" />

        {/* Street grid */}
        <g className="stroke-border" strokeWidth="8" strokeLinecap="square">
          <path d="M0 108h400M0 196h400M110 0v320M280 0v320" />
        </g>

        {/* City blocks */}
        <g className="fill-surface-inset">
          {blocks.map(([x, y, w, h]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="8" />
          ))}
        </g>

        {/* Two parks and a pond */}
        <g className="fill-brand-400/25">
          <rect x="126" y="126" width="60" height="50" rx="10" />
          <rect x="296" y="208" width="72" height="72" rx="10" />
          <rect x="200" y="216" width="66" height="58" rx="10" />
        </g>
        <ellipse cx="332" cy="244" rx="22" ry="14" className="fill-brand-500/45" />

        {/* GPS radius, hidden from players in the real product */}
        <circle
          cx="330"
          cy="62"
          r="36"
          className="fill-accent/10 stroke-accent/45 animate-pulse"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        {/* The route between the three stops */}
        <path
          d="M60 250C60 212 112 206 142 190c30-16 54-18 73-42 19-24 53-36 77-54 20-15 30-22 38-32"
          fill="none"
          className="stroke-accent"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="0.5 10"
        />

        {/* Stop 1 — camera mission */}
        <circle cx="60" cy="250" r="16" className="fill-surface stroke-border" strokeWidth="2" />
        <g className="stroke-primary" strokeWidth="1.8" fill="none" strokeLinejoin="round">
          <rect x="52" y="246.5" width="16" height="9.5" rx="2" />
          <path d="M57 246.5l1.4-2h3.2l1.4 2" />
          <circle cx="60" cy="251" r="2.8" />
        </g>

        {/* Stop 2 — text mission */}
        <circle cx="215" cy="148" r="16" className="fill-surface stroke-border" strokeWidth="2" />
        <g className="fill-primary">
          <rect x="207" y="142" width="16" height="2.8" rx="1.4" />
          <rect x="207" y="147.5" width="16" height="2.8" rx="1.4" />
          <rect x="207" y="153" width="10" height="2.8" rx="1.4" />
        </g>

        {/* Stop 3 — GPS check-in */}
        <circle cx="330" cy="62" r="16" className="fill-surface stroke-border" strokeWidth="2" />
        <path
          d="M330 54a6 6 0 0 1 6 6c0 4.3-6 10-6 10s-6-5.7-6-10a6 6 0 0 1 6-6z"
          className="fill-primary"
        />
        <circle cx="330" cy="60" r="2.1" className="fill-surface" />
      </g>
    </svg>
  );
}

function FloatingChip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-pop",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HeroArt({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="rounded-xl border border-border bg-surface p-2 shadow-card sm:p-3">
        <MapDrawing />
      </div>

      <FloatingChip className="-top-4 end-2 sm:end-6">
        <span className="flex size-7 items-center justify-center rounded-full bg-gold-400/20 text-gold-500">
          <Trophy className="size-4" aria-hidden />
        </span>
        <span className="text-xs leading-tight">
          <span className="block font-semibold">Blue Herons</span>
          <span className="block text-muted-foreground">940 points · 1st</span>
        </span>
      </FloatingChip>

      <FloatingChip className="-bottom-5 start-2 sm:start-6">
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-400/20 text-primary">
          <Users className="size-4" aria-hidden />
        </span>
        <span className="text-xs leading-tight">
          <span className="block font-semibold">12 teams playing</span>
          <span className="block text-muted-foreground">48 submissions so far</span>
        </span>
      </FloatingChip>
    </div>
  );
}
