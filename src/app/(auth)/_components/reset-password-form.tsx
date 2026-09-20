"use client";

import * as React from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { describeAuthError } from "../_lib/auth-errors";
import { AuthField } from "./auth-field";
import { AuthAltLink, FormAlert, useNextPath } from "./auth-ui";

export function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const next = useNextPath();
  const [error, setError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email);
      setSentTo(email);
    } catch (caught) {
      setError(describeAuthError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Check your inbox
        </h1>
        <div
          // Announced because it replaces the form the person just submitted.
          role="status"
          className="flex gap-3 rounded-lg border border-success/30 bg-success-surface p-4 text-sm"
        >
          <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="leading-relaxed">
            If <span className="font-semibold">{sentTo}</span> has an account, a
            reset link is on its way. The link expires after an hour.
          </p>
        </div>
        <AuthAltLink
          href="/signin"
          next={next}
          prompt="Got it?"
          action="Back to sign in"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us the email on the account and we&rsquo;ll send a link to set a new
          password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormAlert message={error} />

        <AuthField
          id="reset-email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          messages={{
            valueMissing: "Enter the email on the account.",
            typeMismatch: "That doesn't look like an email address.",
          }}
        />

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Send the reset link
        </Button>
      </form>

      <AuthAltLink
        href="/signin"
        next={next}
        prompt="Remembered it?"
        action="Back to sign in"
      />
    </div>
  );
}
