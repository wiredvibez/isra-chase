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
import { cn } from "@/lib/utils";
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
  // The server works out capacity from the team *and* the chase default, so
  // its answer wins when it sends one.
  if (typeof team.full === "boolean") return team.full;
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
      toast.error("הכניסה כאורח נתקעה. תנסו שוב עוד רגע.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-bold">איך קוראים לכם?</h1>
        <p className="text-sm text-muted-foreground">
          מצטרפים עם הקוד{" "}
          <span dir="ltr" className="font-bold text-foreground">
            {code}
          </span>
          . לא צריך חשבון — שם זה כל מה שצריך.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={go} className="space-y-4">
            <Field label="השם שלכם" htmlFor="guest-name" required>
              <Input
                id="guest-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                autoComplete="nickname"
                placeholder="נועה"
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
              ממשיכים כאורח
              <ArrowRight className="size-5 flip-rtl" aria-hidden />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        כבר יש לכם חשבון?{" "}
        <Link
          href={`/signin?next=${encodeURIComponent(pathname)}`}
          className="font-semibold text-primary underline underline-offset-2"
        >
          אפשר להיכנס איתו
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
          "flex w-full min-h-14 items-center gap-3 rounded-lg border bg-surface p-3 text-start transition-colors",
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
            {team.maxMembers !== null
              ? `${team.memberCount}/${team.maxMembers} משתתפים`
              : team.memberCount === 1
                ? "משתתף אחד"
                : `${team.memberCount} משתתפים`}
          </span>
        </span>

        {full && (
          <Badge tone="neutral">
            <Lock className="size-3" aria-hidden />
            מלאה
          </Badge>
        )}
        {!full && locked && (
          <KeyRound
            className="size-[1.125rem] text-muted-foreground"
            aria-label="נדרשת סיסמת קבוצה"
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
              : "לא מצאנו מרדף עם הקוד הזה.",
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
          : "ההצטרפות למרדף לא עברה. תנסו שוב.",
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
          title="הקוד הזה לא עבד"
          description={loadError}
          action={
            <Link
              href="/join"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              לנסות קוד אחר
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
          className="mb-2 -ms-2 inline-flex h-11 items-center gap-1.5 self-start rounded-md px-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-[1.125rem] flip-rtl" aria-hidden />
          חזרה
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
                <Badge tone="brand">
                  קוד <span dir="ltr">{chase.joinCode ?? code}</span>
                </Badge>
                {chase.status === "live" && (
                  <Badge tone="success">באוויר עכשיו</Badge>
                )}
                {chase.status === "scheduled" && (
                  <Badge tone="info">מתחיל בקרוב</Badge>
                )}
                {chase.status === "ended" && <Badge tone="neutral">הסתיים</Badge>}
                {chaseRequiresPassword(chase) && (
                  <Badge tone="warning">
                    <Lock className="size-3" aria-hidden />
                    נדרשת סיסמה
                  </Badge>
                )}
              </div>
            </div>

            {existing.data && (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <p className="text-sm font-semibold">
                    אתם כבר במרדף הזה.
                  </p>
                  <Link
                    href={`/play/${chase.id}`}
                    className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    ממשיכים לשחק
                  </Link>
                </CardContent>
              </Card>
            )}

            {chase.termsUrl && (
              <p className="text-xs text-muted-foreground">
                בהצטרפות אתם מקבלים את{" "}
                <a
                  href={chase.termsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  תנאי השימוש
                </a>{" "}
                של המארגן.
              </p>
            )}
          </>
        )}

        {step === "mode" && (
          <>
            <h1 className="font-display text-2xl font-bold">
              איך אתם משחקים?
            </h1>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    id: "team" as const,
                    icon: UsersRound,
                    title: "עם קבוצה",
                    body: "מצטרפים לחברים — כל הנקודות נכנסות לקבוצה אחת.",
                  },
                  {
                    id: "solo" as const,
                    icon: User,
                    title: "לבד",
                    body: "משחקים לבד, עם שורה משלכם בטבלת המובילים.",
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
                      "flex min-h-14 items-start gap-3 rounded-lg border bg-surface p-4 text-start",
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
              {creating ? "איך קוראים לקבוצה?" : "בוחרים קבוצה"}
            </h1>

            {creating ? (
              <div className="space-y-4">
                <PhotoPicker
                  name={newTeamName || "קבוצה"}
                  value={newTeamPhoto}
                  onChange={setNewTeamPhoto}
                  label="מוסיפים תמונת קבוצה"
                  pathFor={(ext) =>
                    `chases/${chase.id}/teams/new-${uid}/${Date.now()}.${ext}`
                  }
                />
                <Field label="שם הקבוצה" htmlFor="new-team-name" required>
                  <Input
                    id="new-team-name"
                    value={newTeamName}
                    onChange={(event) => setNewTeamName(event.target.value)}
                    maxLength={60}
                    placeholder="הברווזים הנודדים"
                    className="h-12"
                  />
                </Field>
                <Field
                  label="סיסמת כניסה"
                  htmlFor="new-team-passcode"
                  hint="לא חובה. מי שמצטרף לקבוצה יצטרך אותה — והיא פוטרת אותו מסיסמת המרדף."
                >
                  <Input
                    id="new-team-passcode"
                    value={newTeamPasscode}
                    onChange={(event) => setNewTeamPasscode(event.target.value)}
                    maxLength={32}
                    autoComplete="off"
                    placeholder="ריק = קבוצה פתוחה לכולם"
                    className="h-12"
                  />
                </Field>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setCreating(false)}
                >
                  לבחור קבוצה קיימת במקום
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.length === 0 ? (
                  <EmptyState
                    icon={<UsersRound className="size-5" />}
                    title="עדיין אין קבוצות"
                    description={
                      canCreateTeam
                        ? "תהיו הראשונים — פתחו אחת למטה."
                        : "המארגן עוד לא הגדיר קבוצות. שווה לדבר איתו."
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
                              label="סיסמת הקבוצה"
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
                    פותחים קבוצה חדשה
                  </Button>
                )}

                {chase.participantMode === "organizer_managed" && (
                  <p className="px-1 text-xs text-muted-foreground">
                    במרדף הזה המארגן מנהל את הקבוצות, אז אפשר להצטרף רק לקבוצה
                    שהוא כבר הגדיר.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {step === "profile" && (
          <>
            <h1 className="font-display text-2xl font-bold">הפרופיל שלכם</h1>
            <div className="space-y-4">
              <PhotoPicker
                name={displayName || "אני"}
                value={photoURL}
                onChange={(url) => setPhotoEdit({ url })}
                label="מוסיפים תמונה"
                pathFor={(ext) => `users/${uid}/avatar/${Date.now()}.${ext}`}
              />
              <Field label="השם שיוצג" htmlFor="display-name" required>
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
                  label="סיסמת המרדף"
                  htmlFor="chase-password"
                  required
                  hint="המארגן הגדיר סיסמה למרדף הזה."
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
                <p className="font-semibold">אתם מצטרפים בתור</p>
                <p className="text-muted-foreground">
                  {mode === "solo"
                    ? "משתתף יחיד"
                    : creating
                      ? `קבוצה חדשה בשם "${newTeamName.trim() || "…"}"`
                      : (selectedTeam?.name ?? "קבוצה")}
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
          {isLast ? "מצטרפים למרדף" : "ממשיכים"}
          {!isLast && <ArrowRight className="size-5 flip-rtl" aria-hidden />}
        </Button>
      </div>
    </main>
  );
}
