"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { doc } from "firebase/firestore";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  Lock,
  Plus,
  TriangleAlert,
  User,
  UsersRound,
} from "lucide-react";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { useLiveDoc } from "@/lib/hooks/use-firestore";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, plural } from "@/lib/utils";
import type { Participant } from "@/lib/domain/types";
import { PhotoPicker } from "./photo-picker";
import {
  chaseRequiresPassword,
  teamRequiresPasscode,
  type JoinPreview,
  type PublicTeam,
} from "./types";

type Step = "welcome" | "mode" | "team" | "profile";
type Mode = "team" | "solo";

function teamIsFull(team: PublicTeam): boolean {
  return team.maxMembers !== null && team.memberCount >= team.maxMembers;
}

/* ------------------------------------------------------------- guest gate */

function GuestGate({ code }: { code: string }) {
  const pathname = usePathname();
  const { signInGuest } = useAuth();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function go(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await signInGuest(name.trim());
    } catch {
      toast.error("Couldn't start a guest session. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">What should we call you?</h1>
        <p className="text-sm text-muted-foreground">
          Joining code <span className="font-bold text-foreground">{code}</span>.
          No account needed — a name is enough to play.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={go} className="space-y-4">
            <Field label="Your name" htmlFor="guest-name" required>
              <Input
                id="guest-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                autoComplete="nickname"
                placeholder="Sam"
                className="h-12"
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!name.trim()}
              loading={busy}
            >
              Continue as guest
              <ArrowRight className="size-5" aria-hidden />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className="font-semibold text-primary underline underline-offset-2"
        >
          Sign in instead
        </Link>
      </p>
    </main>
  );
}

/* ------------------------------------------------------------- team cards */

function TeamRow({
  team,
  selected,
  onSelect,
  children,
}: {
  team: PublicTeam;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  const full = teamIsFull(team);
  const locked = teamRequiresPasscode(team);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={full}
        aria-pressed={selected}
        className={cn(
          "flex w-full min-h-14 items-center gap-3 rounded-lg border bg-surface p-3 text-left transition-colors",
          selected ? "border-primary ring-2 ring-primary" : "border-border",
          full && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted overflow-hidden">
          {team.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.photoUrl} alt="" className="size-full object-cover" />
          ) : (
            <UsersRound className="size-5 text-muted-foreground" aria-hidden />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[0.95rem] font-bold">
            {team.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {team.memberCount}
            {team.maxMembers !== null ? `/${team.maxMembers}` : ""}{" "}
            {plural(team.memberCount, "member")}
          </span>
        </span>

        {full && (
          <Badge tone="neutral">
            <Lock className="size-3" aria-hidden />
            Full
          </Badge>
        )}
        {!full && locked && (
          <KeyRound
            className="size-[1.125rem] text-muted-foreground"
            aria-label="Passcode required"
          />
        )}
        {selected && !full && (
          <Check className="size-5 text-primary" aria-hidden />
        )}
      </button>
      {children}
    </li>
  );
}

/* ------------------------------------------------------------------ flow  */

export function JoinFlow({ code }: { code: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [preview, setPreview] = React.useState<JoinPreview | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const payload = await apiGet<JoinPreview>(
          `/api/join/${encodeURIComponent(code)}`,
        );
        if (!cancelled) {
          setPreview(payload);
          setLoadError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setLoadError(
            caught instanceof ApiClientError
              ? caught.message
              : "We couldn't find a chase with that code.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, uid]);

  const chase = preview?.chase ?? null;
  const teams = preview?.teams ?? [];

  // Someone re-scanning the QR code shouldn't be made to join twice.
  const participantRef = React.useMemo(
    () =>
      chase && uid
        ? doc(getDb(), "chases", chase.id, "participants", uid)
        : null,
    [chase, uid],
  );
  const existing = useLiveDoc<Participant>(participantRef, [chase?.id, uid]);

  const mustPickTeam =
    chase?.participantMode === "teams_only" ||
    chase?.participantMode === "organizer_managed";
  const soloOnly = chase?.participantMode === "solo_only";
  const canCreateTeam =
    Boolean(chase?.allowSelfCreatedTeams) &&
    chase?.participantMode !== "organizer_managed" &&
    !soloOnly;

  // The chase's participant mode wins; the player only chooses when both are
  // on the table, so this is derived rather than synchronised.
  const [chosenMode, setChosenMode] = React.useState<Mode>("team");
  const mode: Mode = soloOnly ? "solo" : mustPickTeam ? "team" : chosenMode;

  const steps = React.useMemo<Step[]>(() => {
    const list: Step[] = ["welcome"];
    if (chase && !soloOnly && !mustPickTeam) list.push("mode");
    if (mode === "team" && !soloOnly) list.push("team");
    list.push("profile");
    return list;
  }, [chase, soloOnly, mustPickTeam, mode]);

  const [stepIndex, setStepIndex] = React.useState(0);
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [teamPasscode, setTeamPasscode] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [newTeamName, setNewTeamName] = React.useState("");
  const [newTeamPhoto, setNewTeamPhoto] = React.useState<string | null>(null);
  const [newTeamPasscode, setNewTeamPasscode] = React.useState("");

  // Both fields start from the signed-in profile and switch to the player's
  // own value the moment they touch them — `null` means "not edited yet", which
  // is what lets someone deliberately clear their photo.
  const [nameEdit, setNameEdit] = React.useState<string | null>(null);
  const [photoEdit, setPhotoEdit] = React.useState<{ url: string | null } | null>(
    null,
  );
  const [chasePassword, setChasePassword] = React.useState("");
  const [joining, setJoining] = React.useState(false);

  const displayName = nameEdit ?? user?.displayName ?? "";
  const photoURL = photoEdit ? photoEdit.url : (user?.photoURL ?? null);

  const selectedTeam = teams.find((t) => t.id === teamId) ?? null;
  // A team passcode stands in for the chase password, as Goosechase does.
  const needsChasePassword =
    Boolean(chase && chaseRequiresPassword(chase)) &&
    !(
      selectedTeam &&
      teamRequiresPasscode(selectedTeam) &&
      teamPasscode.trim()
    );

  async function join() {
    if (!chase) return;
    setJoining(true);
    try {
      const body: Record<string, unknown> = {
        code,
        displayName: displayName.trim(),
        photoURL: photoURL ?? null,
      };
      if (chasePassword.trim()) body.chasePassword = chasePassword.trim();

      if (mode === "solo") {
        // A solo player is still a team of one as far as scoring goes.
        body.newTeam = { name: displayName.trim(), mode: "solo" };
      } else if (creating) {
        body.newTeam = {
          name: newTeamName.trim(),
          mode: "team",
          photoUrl: newTeamPhoto ?? null,
          passcode: newTeamPasscode.trim() || null,
        };
      } else if (teamId) {
        body.teamId = teamId;
        if (teamPasscode.trim()) body.teamPasscode = teamPasscode.trim();
      }

      await apiPost(`/api/chases/${chase.id}/join`, body);
      router.replace(`/play/${chase.id}`);
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "Couldn't join that chase.",
      );
      setJoining(false);
    }
  }

  /* ------------------------------------------------------------- gating -- */

  if (authLoading) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-4 pt-10">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!uid) return <GuestGate code={code} />;

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <EmptyState
          className="w-full"
          icon={<TriangleAlert className="size-5" />}
          title="That code didn't work"
          description={loadError}
          action={
            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Try another code
            </Link>
          }
        />
      </main>
    );
  }

  if (!chase) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-4 pt-10">
        <Skeleton className="aspect-[2/1] w-full" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  /* -------------------------------------------------------------- steps -- */

  const canAdvance =
    step === "welcome"
      ? true
      : step === "mode"
        ? true
        : step === "team"
          ? creating
            ? newTeamName.trim().length > 0
            : Boolean(teamId) &&
              (!selectedTeam ||
                !teamRequiresPasscode(selectedTeam) ||
                teamPasscode.trim().length > 0)
          : displayName.trim().length > 0 &&
            (!needsChasePassword || chasePassword.trim().length > 0);

  const isLast = stepIndex >= steps.length - 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      {stepIndex > 0 && (
        <button
          type="button"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className="mb-2 -ml-2 inline-flex h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-[1.125rem]" aria-hidden />
          Back
        </button>
      )}

      <div className="flex-1 space-y-5">
        {step === "welcome" && (
          <>
            {(chase.splashImageUrl ?? chase.imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(chase.splashImageUrl ?? chase.imageUrl) as string}
                alt=""
                className="aspect-[2/1] w-full rounded-lg border border-border object-cover"
              />
            )}
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-bold leading-tight">
                {chase.name}
              </h1>
              {chase.description && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {chase.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge tone="brand">Code {chase.joinCode ?? code}</Badge>
                {chase.status === "live" && <Badge tone="success">Live now</Badge>}
                {chase.status === "scheduled" && (
                  <Badge tone="info">Starting soon</Badge>
                )}
                {chase.status === "ended" && <Badge tone="neutral">Ended</Badge>}
                {chaseRequiresPassword(chase) && (
                  <Badge tone="warning">
                    <Lock className="size-3" aria-hidden />
                    Password required
                  </Badge>
                )}
              </div>
            </div>

            {existing.data && (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-semibold">
                    You&rsquo;re already in this chase.
                  </p>
                  <Link
                    href={`/play/${chase.id}`}
                    className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    Continue playing
                  </Link>
                </CardContent>
              </Card>
            )}

            {chase.termsUrl && (
              <p className="text-xs text-muted-foreground">
                By joining you accept the organizer&rsquo;s{" "}
                <a
                  href={chase.termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  terms
                </a>
                .
              </p>
            )}
          </>
        )}

        {step === "mode" && (
          <>
            <h1 className="font-display text-2xl font-bold">
              How are you playing?
            </h1>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    id: "team" as const,
                    icon: UsersRound,
                    title: "With a team",
                    body: "Join your crew — points are pooled for the team.",
                  },
                  {
                    id: "solo" as const,
                    icon: User,
                    title: "On my own",
                    body: "Play solo. You get your own spot on the leaderboard.",
                  },
                ]
              ).map((option) => {
                const Icon = option.icon;
                const active = mode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setChosenMode(option.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-14 items-start gap-3 rounded-lg border bg-surface p-4 text-left",
                      active ? "border-primary ring-2 ring-primary" : "border-border",
                    )}
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-base font-bold">
                        {option.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {option.body}
                      </span>
                    </span>
                    {active && <Check className="size-5 text-primary" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "team" && (
          <>
            <h1 className="font-display text-2xl font-bold">
              {creating ? "Name your team" : "Pick your team"}
            </h1>

            {creating ? (
              <div className="space-y-4">
                <PhotoPicker
                  name={newTeamName || "Team"}
                  value={newTeamPhoto}
                  onChange={setNewTeamPhoto}
                  label="Add a team photo"
                  pathFor={(ext) =>
                    `chases/${chase.id}/teams/new-${uid}/${Date.now()}.${ext}`
                  }
                />
                <Field label="Team name" htmlFor="new-team-name" required>
                  <Input
                    id="new-team-name"
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    maxLength={60}
                    placeholder="The Wandering Ducks"
                    className="h-12"
                  />
                </Field>
                <Field
                  label="Passcode"
                  htmlFor="new-team-passcode"
                  hint="Optional. Teammates need it to join — and it skips the chase password for them."
                >
                  <Input
                    id="new-team-passcode"
                    value={newTeamPasscode}
                    onChange={(event) => setNewTeamPasscode(event.target.value)}
                    maxLength={32}
                    autoComplete="off"
                    placeholder="Leave empty for an open team"
                    className="h-12"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setCreating(false)}
                >
                  Pick an existing team instead
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.length === 0 ? (
                  <EmptyState
                    icon={<UsersRound className="size-5" />}
                    title="No teams yet"
                    description={
                      canCreateTeam
                        ? "Be the first — create one below."
                        : "The organizer hasn&rsquo;t set up any teams. Check back with them."
                    }
                  />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {teams.map((team) => (
                      <TeamRow
                        key={team.id}
                        team={team}
                        selected={teamId === team.id}
                        onSelect={() => {
                          setTeamId(team.id);
                          setTeamPasscode("");
                        }}
                      >
                        {teamId === team.id && teamRequiresPasscode(team) && (
                          <div className="px-1 pt-2">
                            <Field
                              label="Team passcode"
                              htmlFor={`passcode-${team.id}`}
                              required
                            >
                              <Input
                                id={`passcode-${team.id}`}
                                value={teamPasscode}
                                onChange={(event) =>
                                  setTeamPasscode(event.target.value)
                                }
                                maxLength={32}
                                autoComplete="off"
                                className="h-12"
                              />
                            </Field>
                          </div>
                        )}
                      </TeamRow>
                    ))}
                  </ul>
                )}

                {canCreateTeam && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setCreating(true);
                      setTeamId(null);
                    }}
                  >
                    <Plus className="size-5" aria-hidden />
                    Create a new team
                  </Button>
                )}

                {chase.participantMode === "organizer_managed" && (
                  <p className="px-1 text-xs text-muted-foreground">
                    The organizer manages teams for this chase, so you can only
                    join one they&rsquo;ve already set up.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === "profile" && (
          <>
            <h1 className="font-display text-2xl font-bold">Set up your profile</h1>
            <div className="space-y-4">
              <PhotoPicker
                name={displayName || "You"}
                value={photoURL}
                onChange={(url) => setPhotoEdit({ url })}
                label="Add a photo"
                pathFor={(ext) => `users/${uid}/avatar/${Date.now()}.${ext}`}
              />
              <Field label="Display name" htmlFor="display-name" required>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setNameEdit(event.target.value)}
                  maxLength={60}
                  autoComplete="nickname"
                  className="h-12"
                />
              </Field>

              {needsChasePassword && (
                <Field
                  label="Chase password"
                  htmlFor="chase-password"
                  required
                  hint="The organizer set a password for this chase."
                >
                  <Input
                    id="chase-password"
                    type="password"
                    value={chasePassword}
                    onChange={(event) => setChasePassword(event.target.value)}
                    maxLength={64}
                    autoComplete="off"
                    className="h-12"
                  />
                </Field>
              )}

              <div className="rounded-md bg-surface-muted p-3 text-sm">
                <p className="font-semibold">You&rsquo;re joining as</p>
                <p className="text-muted-foreground">
                  {mode === "solo"
                    ? "A solo player"
                    : creating
                      ? `A new team called “${newTeamName.trim() || "…"}”`
                      : (selectedTeam?.name ?? "a team")}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!canAdvance}
          loading={joining}
          onClick={() => {
            if (isLast) void join();
            else setStepIndex((i) => Math.min(steps.length - 1, i + 1));
          }}
        >
          {isLast ? "Join the chase" : "Continue"}
          {!isLast && <ArrowRight className="size-5" aria-hidden />}
        </Button>
      </div>
    </main>
  );
}
