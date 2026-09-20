"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { describeAuthError } from "../_lib/auth-errors";
import { safeNextPath, withNext } from "../_lib/next-path";

/** The destination to land on once authentication succeeds. */
export function useNextPath(): string {
  const params = useSearchParams();
  return safeNextPath(params.get("next"));
}

/**
 * Bounce an already-authenticated organiser straight through. Anonymous guests
 * are left alone — they are on these pages precisely to upgrade to a real
 * account.
 */
export function useRedirectWhenSignedIn(next: string) {
  const { user, loading } = useAuth();
  const router = useRouter();
  React.useEffect(() => {
    if (!loading && user && !user.isAnonymous) router.replace(next);
  }, [loading, user, router, next]);
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-surface px-3 py-2.5 text-sm font-medium text-danger"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function GoogleG() {
  // Google's own brand colours: they are fixed by Google's guidelines, so they
  // are intentionally not theme tokens and do not change with dark mode.
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function GoogleButton({
  next,
  onError,
  disabled,
}: {
  next: string;
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const { signInGoogle } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    onError(null);
    try {
      await signInGoogle();
      router.replace(next);
    } catch (error) {
      // `describeAuthError` returns null when the person simply closed the
      // popup, which stays a silent no-op.
      onError(describeAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={run}
      loading={busy}
      disabled={disabled}
    >
      {!busy && <GoogleG />}
      Continue with Google
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        or
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function AuthAltLink({
  href,
  next,
  prompt,
  action,
}: {
  href: string;
  next: string;
  prompt: string;
  action: string;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      {prompt}{" "}
      <Link
        href={withNext(href, next)}
        className="rounded-sm font-semibold text-primary underline underline-offset-2"
      >
        {action}
      </Link>
    </p>
  );
}
