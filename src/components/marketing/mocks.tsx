import { Check, MapPin, Megaphone, Minus, Plus, Undo2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/*
 * Every mock below is decorative: the prose beside it already states the same
 * facts, so the mocks are hidden from assistive tech rather than read out as a
 * second, confusing copy of the section.
 */

function MockFrame({
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
        "overflow-hidden rounded-lg border border-border bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------- camera mission */

export function CameraMissionMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      <svg viewBox="0 0 200 118" className="block w-full">
        <rect width="200" height="118" className="fill-brand-400/18" />
        <circle cx="162" cy="26" r="13" className="fill-gold-400/80" />
        <path
          d="M0 88c26-26 50-24 76-4 22 17 40-10 66-6 22 3 44 12 58 10v30H0z"
          className="fill-brand-500/40"
        />
        <path
          d="M0 104c30-12 58 4 88-2 30-7 74 10 112 2v14H0z"
          className="fill-brand-600/45"
        />
        {/* two players posing */}
        <circle cx="79" cy="80" r="7" className="fill-accent" />
        <rect x="72" y="89" width="14" height="26" rx="7" className="fill-accent" />
        <circle cx="99" cy="85" r="6" className="fill-primary" />
        <rect x="93" y="93" width="12" height="22" rx="6" className="fill-primary" />
      </svg>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="truncate text-xs font-semibold">Sunset with the whole team</p>
        <Badge tone="success" className="shrink-0">
          <Check className="size-3" /> Accepted
        </Badge>
      </div>
    </MockFrame>
  );
}

/* --------------------------------------------------------- text mission */

export function TextMissionMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      {/* Same 200x118 canvas as the other two mocks, so the three cards line up
          at every breakpoint without hard-coded heights. */}
      <svg viewBox="0 0 200 118" className="block w-full">
        <rect width="200" height="118" className="fill-surface-muted" />

        <rect x="14" y="14" width="172" height="34" rx="7" className="fill-surface stroke-border" strokeWidth="1.5" />
        <g className="fill-muted-foreground/45">
          <rect x="24" y="24" width="122" height="5" rx="2.5" />
          <rect x="24" y="35" width="86" height="5" rx="2.5" />
        </g>

        <rect
          x="14"
          y="58"
          width="172"
          height="30"
          rx="7"
          className="fill-success-surface stroke-success/45"
          strokeWidth="1.5"
        />
        <text x="26" y="78" className="fill-foreground" fontSize="14" fontWeight="700">
          1932
        </text>
        <path
          d="m162 73 4 4 8-8"
          fill="none"
          className="stroke-success"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <rect x="14" y="96" width="76" height="14" rx="7" className="fill-brand-400/30" />
        <text x="24" y="106" className="fill-foreground" fontSize="8" fontWeight="700">
          92% match
        </text>
      </svg>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="truncate text-xs font-semibold">
          When was the water tower built?
        </p>
        <Badge tone="info" className="shrink-0">
          approximate
        </Badge>
      </div>
    </MockFrame>
  );
}

/* ---------------------------------------------------------- GPS mission */

export function GpsMissionMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      <svg viewBox="0 0 200 118" className="block w-full">
        <rect width="200" height="118" className="fill-surface-muted" />
        <g className="stroke-border" strokeWidth="7">
          <path d="M0 42h200M0 92h200M56 0v118M146 0v118" />
        </g>
        <rect x="150" y="96" width="46" height="40" rx="8" className="fill-brand-400/30" />
        <circle
          cx="104"
          cy="66"
          r="34"
          className="fill-accent/12 stroke-accent/50"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />
        <path
          d="M104 52a8 8 0 0 1 8 8c0 5.7-8 13-8 13s-8-7.3-8-13a8 8 0 0 1 8-8z"
          className="fill-accent"
        />
        <circle cx="104" cy="60" r="2.8" className="fill-surface" />
      </svg>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <MapPin className="size-4 shrink-0 text-accent" />
        <p className="text-xs font-semibold">Within 100 m of the lighthouse</p>
      </div>
    </MockFrame>
  );
}

/* ----------------------------------------------------------- leaderboard */

const standings = [
  { rank: 1, team: "Blue Herons", points: 940 },
  { rank: 2, team: "Cobalt Foxes", points: 780 },
  { rank: 2, team: "Night Owls", points: 780 },
  { rank: 4, team: "Sand Dollars", points: 655 },
];

export function LeaderboardMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-bold">Leaderboard</p>
        <Badge tone="success">live</Badge>
      </div>
      <ul className="divide-y divide-border">
        {standings.map((row) => (
          <li key={row.team} className="flex items-center gap-3 px-4 py-2.5">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold tabular-nums",
                row.rank === 1
                  ? "bg-gold-400/35 text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {row.rank}
            </span>
            <Avatar name={row.team} size="sm" />
            <span className="truncate text-sm font-semibold">{row.team}</span>
            <span className="ml-auto text-sm font-bold tabular-nums">
              {row.points}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-border bg-surface-muted px-4 py-2 text-[11px] text-muted-foreground">
        Two teams tied on 780, so the next team is 4th — Olympic ranking.
      </p>
    </MockFrame>
  );
}

/* --------------------------------------------------------- activity feed */

const feed = [
  { team: "Night Owls", text: "completed Sunset with the whole team", points: "+150", when: "just now" },
  { team: "Sand Dollars", text: "checked in at the lighthouse", points: "+200", when: "2 min" },
  { team: "Cobalt Foxes", text: "answered the water tower question", points: "+100", when: "4 min" },
];

export function ActivityFeedMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-bold">Activity</p>
        <Badge tone="brand">everything, as it lands</Badge>
      </div>
      <ul className="divide-y divide-border">
        <li className="flex items-start gap-3 bg-accent/8 px-4 py-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Megaphone className="size-4" />
          </span>
          <p className="text-xs leading-snug">
            <span className="font-semibold">Broadcast</span> · Thirty minutes left —
            the harbour missions close first.
          </p>
        </li>
        {feed.map((row) => (
          <li key={row.team} className="flex items-start gap-3 px-4 py-2.5">
            <Avatar name={row.team} size="sm" className="mt-0.5" />
            <p className="text-xs leading-snug">
              <span className="font-semibold">{row.team}</span> {row.text}
              <span className="block text-muted-foreground">{row.when} ago</span>
            </p>
            <span className="ml-auto shrink-0 rounded-full bg-gold-400/25 px-2 py-0.5 text-xs font-bold tabular-nums">
              {row.points}
            </span>
          </li>
        ))}
      </ul>
    </MockFrame>
  );
}

/* ---------------------------------------------------------- review queue */

export function ReviewQueueMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-bold">Review queue</p>
        <Badge tone="warning">3 pending</Badge>
      </div>

      <div className="flex gap-3 px-4 py-3">
        <svg viewBox="0 0 64 64" className="size-16 shrink-0 rounded-md">
          <rect width="64" height="64" rx="8" className="fill-brand-400/20" />
          <circle cx="47" cy="17" r="7" className="fill-gold-400/80" />
          <path d="M0 46c12-12 22-10 34 2 8 8 20-2 30 0v16H0z" className="fill-brand-500/45" />
          <circle cx="24" cy="40" r="5" className="fill-accent" />
          <rect x="19" y="46" width="10" height="16" rx="5" className="fill-accent" />
        </svg>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">Night Owls · Rooftop panorama</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Waiting on a decision. Nothing scores until you make one.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-success px-2.5 py-1.5 text-xs font-semibold text-white">
          <Check className="size-3.5" /> Approve
          <kbd className="ml-1 rounded-xs bg-black/20 px-1 font-mono text-[10px]">A</kbd>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2.5 py-1.5 text-xs font-semibold">
          Reject
          <kbd className="ml-1 rounded-xs bg-surface-inset px-1 font-mono text-[10px]">R</kbd>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong px-2.5 py-1.5 text-xs font-semibold">
          <Undo2 className="size-3.5" /> Ask again
          <kbd className="ml-1 rounded-xs bg-surface-inset px-1 font-mono text-[10px]">S</kbd>
        </span>
      </div>
    </MockFrame>
  );
}

/* ------------------------------------------------------- adjustment log */

const adjustments = [
  { amount: "+50", reason: "Helped another team find the trailhead", who: "Dana", when: "14:22" },
  { amount: "−25", reason: "Left the play area during the harbour leg", who: "Dana", when: "13:58" },
  { amount: "+100", reason: "First team to finish every camera mission", who: "Ori", when: "13:10" },
];

export function AdjustmentLogMock({ className }: { className?: string }) {
  return (
    <MockFrame className={className}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="font-display text-sm font-bold">Cobalt Foxes · score history</p>
        <Badge tone="neutral">audit log</Badge>
      </div>
      <ul className="divide-y divide-border">
        {adjustments.map((row) => (
          <li key={row.reason} className="flex items-start gap-3 px-4 py-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                row.amount.startsWith("+")
                  ? "bg-success-surface text-success"
                  : "bg-danger-surface text-danger",
              )}
            >
              {row.amount.startsWith("+") ? (
                <Plus className="size-3.5" />
              ) : (
                <Minus className="size-3.5" />
              )}
            </span>
            <p className="min-w-0 text-xs leading-snug">
              <span className="font-semibold tabular-nums">{row.amount} points</span>
              <span className="block text-muted-foreground">{row.reason}</span>
              <span className="block text-muted-foreground">
                {row.who} · {row.when}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </MockFrame>
  );
}
