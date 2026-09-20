"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { describeAuthError } from "../_lib/auth-errors";
import { withNext } from "../_lib/next-path";
import { AuthField } from "./auth-field";
import {
  AuthAltLink,
  FormAlert,
  GoogleButton,
  OrDivider,
  useNextPath,
  useRedirectWhenSignedIn,
} from "./auth-ui";

export function SignInForm() {
  const { signInEmail } = useAuth();
  const router = useRouter();
  const next = useNextPath();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  useRedirectWhenSignedIn(next);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await signInEmail(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      router.replace(next);
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Get back to your chases, your missions and your teams.
        </p>
      </div>

      <GoogleButton next={next} onError={setError} disabled={busy} />
      <OrDivider />

      {/* No `noValidate`: the browser's own blocking and focus management is
          what flips `:user-invalid`, which our fields mirror. */}
      <form onSubmit={onSubmit} className="space-y-4">
        <FormAlert message={error} />

        <AuthField
          id="signin-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          messages={{
            valueMissing: "Enter the email you signed up with.",
            typeMismatch: "That doesn't look like an email address.",
          }}
        />

        <AuthField
          id="signin-password"
          name="password"
          type="password"
          label="Password"
          required
          autoComplete="current-password"
          messages={{ valueMissing: "Enter your password." }}
        />

        <div className="flex justify-end">
          <Link
            href={withNext("/reset-password", next)}
            className="rounded-sm text-sm font-semibold text-primary underline underline-offset-2"
          >
            Forgot your password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>

      <AuthAltLink
        href="/signup"
        next={next}
        prompt="New here?"
        action="Create an account"
      />
    </div>
  );
}
