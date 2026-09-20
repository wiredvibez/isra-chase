"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { describeAuthError } from "../_lib/auth-errors";
import { AuthField } from "./auth-field";
import {
  AuthAltLink,
  FormAlert,
  GoogleButton,
  OrDivider,
  useNextPath,
  useRedirectWhenSignedIn,
} from "./auth-ui";

/** Firebase's own floor, repeated here so the browser catches it first. */
const MIN_PASSWORD = 6;

export function SignUpForm() {
  const { signUpEmail } = useAuth();
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
      await signUpEmail(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
        String(data.get("name") ?? "").trim(),
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
          Create an account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You need one to build and run a chase. Playing one only needs a join code.
        </p>
      </div>

      <GoogleButton next={next} onError={setError} disabled={busy} />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-4">
        <FormAlert message={error} />

        <AuthField
          id="signup-name"
          name="name"
          type="text"
          label="Your name"
          required
          autoComplete="name"
          maxLength={60}
          autoFocus
          placeholder="Dana Levi"
          messages={{
            valueMissing: "Teams will see this name on your broadcasts.",
          }}
        />

        <AuthField
          id="signup-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          messages={{
            valueMissing: "We need an email to sign you in later.",
            typeMismatch: "That doesn't look like an email address.",
          }}
        />

        <AuthField
          id="signup-password"
          name="password"
          type="password"
          label={
            <>
              Password{" "}
              <span className="font-normal text-muted-foreground">
                (at least {MIN_PASSWORD} characters)
              </span>
            </>
          }
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          messages={{
            valueMissing: "Choose a password.",
            tooShort: "Passwords need at least six characters.",
          }}
        />

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <AuthAltLink
        href="/signin"
        next={next}
        prompt="Already have an account?"
        action="Sign in"
      />
    </div>
  );
}
