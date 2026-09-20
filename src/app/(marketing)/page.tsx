import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Camera,
  EyeOff,
  ListChecks,
  MapPin,
  Megaphone,
  QrCode,
  Scale,
  Sparkles,
  Trash2,
  Trophy,
  Type as TypeIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroArt } from "@/components/marketing/hero-art";
import { JoinCodeForm } from "@/components/marketing/join-code-form";
import {
  ActivityFeedMock,
  AdjustmentLogMock,
  CameraMissionMock,
  GpsMissionMock,
  LeaderboardMock,
  ReviewQueueMock,
  TextMissionMock,
} from "@/components/marketing/mocks";

export const metadata: Metadata = {
  title: "Isra Chase — scavenger hunts that actually get people moving",
  description:
    "Build camera, text and GPS missions, share one join code, and score a whole group live: activity feed, Olympic-ranked leaderboard, bonus points and a review queue when you want one.",
  alternates: { canonical: "/" },
};

const shell = "mx-auto w-full max-w-6xl px-4 sm:px-6";
// `text-primary` rather than a `dark:` variant: the theme can also be forced
// with `data-theme`, which a media-query variant would not follow.
const eyebrow = "text-xs font-bold uppercase tracking-[0.18em] text-primary";
const h2 = "font-display text-3xl font-extrabold tracking-tight sm:text-4xl";
const lede = "mt-4 text-lg leading-relaxed text-muted-foreground";

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Decorative wash behind the hero; purely cosmetic. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-brand-400/12 blur-3xl"
      />
      <div
        className={`${shell} relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24`}
      >
        <div>
          <Badge tone="brand">Scavenger hunts · team games · onboarding days</Badge>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Turn any group into teams racing through{" "}
            <span className="text-primary">photo, text and GPS</span> missions.
          </h1>

          <p className={lede}>
            Build the missions in the Studio, hand out one join code, and let the
            scoring run itself. Submissions land in a live feed, the leaderboard
            keeps itself in order, and you can adjust, hide or delete anything
            without stopping the game.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/studio"
              className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              Create a chase
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-md border border-border-strong bg-surface px-6 text-base font-semibold hover:bg-surface-muted"
            >
              See how it works
            </a>
          </div>

          <div
            id="join"
            className="mt-8 max-w-md rounded-lg border border-border bg-surface p-4 shadow-card scroll-mt-24"
          >
            <JoinCodeForm />
          </div>
        </div>

        <HeroArt className="lg:mt-0" />
      </div>
    </section>
  );
}

/* -------------------------------------------------------- mission types */

const missionTypes = [
  {
    id: "camera",
    icon: Camera,
    name: "Camera",
    blurb:
      "Photos, video, or both — video capped at thirty seconds. Lock a mission to live capture when you don't want camera-roll uploads. Camera missions are accepted the moment they arrive; there is nothing to mark.",
    facts: ["Photo, video or both", "Live capture only, optionally", "Always auto-accepted"],
    mock: <CameraMissionMock />,
  },
  {
    id: "text",
    icon: TypeIcon,
    name: "Text",
    blurb:
      "List every answer you will accept. Matching is approximate at 92% similarity: word order and plurals do not matter and typos are forgiven, while numbers still have to be exact. Leave the list empty and the prompt is open-ended.",
    facts: ["Exact, approximate or open", "Graded the instant it is sent", "Hidden from the feed by default"],
    mock: <TextMissionMock />,
  },
  {
    id: "gps",
    icon: MapPin,
    name: "GPS check-in",
    blurb:
      "Set the destination by address search, by coordinates, or by clicking the map, then choose a radius between 25 m and 5 km. Players never see the pin or the radius — the check-in is graded by distance.",
    facts: ["Eight fixed radii, 25 m to 5 km", "Pin and radius stay hidden", "Graded by distance on arrival"],
    mock: <GpsMissionMock />,
  },
];

function MissionTypes() {
  return (
    <section id="missions" className={`${shell} scroll-mt-20 py-20 sm:py-24`}>
      <div className="max-w-2xl">
        <p className={eyebrow}>Mission types</p>
        <h2 className={`${h2} mt-3`}>Three kinds of mission — that is the whole vocabulary.</h2>
        <p className={lede}>
          Every mission carries a name, a description, a point value and an optional
          image and link. Beyond that you only choose how it is answered, when it
          unlocks and when it expires.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {missionTypes.map((type) => (
          <li
            key={type.id}
            className="flex flex-col rounded-lg border border-border bg-surface-muted/60 p-4 sm:p-5"
          >
            {type.mock}
            <h3 className="mt-5 flex items-center gap-2 font-display text-xl font-bold">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <type.icon className="size-4" aria-hidden />
              </span>
              {type.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {type.blurb}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {type.facts.map((fact) => (
                <li key={fact} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-3xl text-sm text-muted-foreground">
        Missions can release at the start, at a set time, a fixed interval before the
        end, when another mission is completed, or once a team passes a point total —
        and a locked mission is invisible until then, submissions included.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------- live section */

const liveFeatures = [
  {
    icon: Activity,
    title: "A live activity feed",
    body:
      "Accepted submissions appear in a shared feed as they land — photos, answers and check-ins, each with the points it earned. Text missions stay out of the feed by default so nobody can copy an answer.",
  },
  {
    icon: Trophy,
    title: "A leaderboard that ranks itself",
    body:
      "Points descending, ties broken by whoever reached the total first, and Olympic numbering: three teams tied for 2nd means the next one is 5th. Show it, hide it until you reveal it, or hold it back until the chase ends.",
  },
  {
    icon: Sparkles,
    title: "Bonus and penalty points",
    body:
      "Award extra points on any submission with a reason attached. Negative amounts are allowed, so a penalty is just a bonus with a minus sign — and the team is notified either way.",
  },
  {
    icon: Megaphone,
    title: "Broadcasts",
    body:
      "Send an announcement to everyone or to chosen teams: right now, before the start, at the start, at a moment during play, or after the end. Scheduled ones stay editable until they go out.",
  },
];

function RunningTheGame() {
  return (
    <section id="live" className="scroll-mt-20 border-y border-border bg-surface py-20 sm:py-24">
      <div className={shell}>
        <div className="max-w-2xl">
          <p className={eyebrow}>While the chase is live</p>
          <h2 className={`${h2} mt-3`}>You watch it happen, and you can still change it.</h2>
          <p className={lede}>
            Scoring is handled on the server, so nobody can talk their device into
            more points. Everything else — missions, timing, teams, points — stays
            editable while the chase runs and applies immediately.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-14">
          <ul className="grid gap-6 sm:grid-cols-2">
            {liveFeatures.map((feature) => (
              <li key={feature.title} className="rounded-lg border border-border bg-surface-muted/50 p-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-accent/12 text-accent">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-6">
            <LeaderboardMock />
            <ActivityFeedMock />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- moderation */

const moderationFeatures = [
  {
    icon: ListChecks,
    title: "An optional review queue",
    body:
      "Switch a chase into review mode and submissions arrive pending instead of scoring straight away. Approve, reject or ask for a resubmission, with keyboard shortcuts and bulk actions. It is off by default, so nothing changes unless you want it to.",
  },
  {
    icon: EyeOff,
    title: "Hide and flag",
    body:
      "Hide a single submission from the feed without removing it or its points. Captions and text answers are screened against a blocklist and flagged for a human decision — never deleted behind your back. Players can report a submission too.",
  },
  {
    icon: Trash2,
    title: "Delete with a reason",
    body:
      "Deleting a submission takes its points back automatically and notifies the team with the reason you wrote, so nobody is left guessing. The mission reopens and they can try again.",
  },
  {
    icon: Scale,
    title: "Adjustments that leave a trail",
    body:
      "A per-team score adjustment requires a reason. Each entry records the amount, the reason, who made it and when, stays editable, and doubles as the team's score history.",
  },
];

function Moderation() {
  return (
    <section id="moderation" className={`${shell} scroll-mt-20 py-20 sm:py-24`}>
      <div className="max-w-2xl">
        <p className={eyebrow}>Moderation</p>
        <h2 className={`${h2} mt-3`}>Keep the feed clean without stopping the game.</h2>
        <p className={lede}>
          Submissions are accepted automatically by default, which is what players
          expect. The controls below are there for the times that is not enough.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
        <div className="space-y-6">
          <ReviewQueueMock />
          <AdjustmentLogMock />
        </div>

        <ul className="grid gap-6 sm:grid-cols-2">
          {moderationFeatures.map((feature) => (
            <li key={feature.title} className="rounded-lg border border-border bg-surface p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-md bg-brand-400/15 text-primary">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- how it works */

const steps = [
  {
    icon: ListChecks,
    title: "Build the missions",
    body:
      "Write the prompts, set point values, and decide what unlocks when. Duplicate a mission, save it to your library, or pull one in from a previous chase.",
  },
  {
    icon: QrCode,
    title: "Share a join code or a QR",
    body:
      "Players scan the QR, follow the invite link, or type the code. Add a chase password for a closed group, and pre-create teams if you want the rosters fixed.",
  },
  {
    icon: Activity,
    title: "Watch the feed",
    body:
      "Go live, and submissions start scoring themselves. Broadcast, adjust points, and export the participants, submissions and media when it is over.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-border bg-surface py-20 sm:py-24"
    >
      <div className={shell}>
        <div className="max-w-2xl">
          <p className={eyebrow}>How it works</p>
          <h2 className={`${h2} mt-3`}>Three steps from an idea to a game in progress.</h2>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-lg border border-border bg-surface-muted/60 p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">
                  {index + 1}
                </span>
                <step.icon className="size-5 text-accent" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- CTA */

function ClosingCta() {
  return (
    <section className={`${shell} py-20 sm:py-24`}>
      <div className="rounded-xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Build your first chase.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed">
          Start in the Studio with a draft, add a handful of missions, and go live
          when you are ready. Nothing is locked until you say so.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex h-12 items-center rounded-md bg-surface px-6 text-base font-semibold text-foreground shadow-sm hover:bg-surface-muted"
          >
            Create a chase
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center rounded-md border border-current px-6 text-base font-semibold hover:bg-white/10"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <MissionTypes />
      <RunningTheGame />
      <Moderation />
      <HowItWorks />
      <ClosingCta />
    </>
  );
}
