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
          תבדקו את המייל
        </h1>
        <div
          // Announced because it replaces the form the person just submitted.
          role="status"
          className="flex gap-3 rounded-lg border border-success/30 bg-success-surface p-4 text-sm"
        >
          <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <p className="leading-relaxed">
            אם יש חשבון על{" "}
            <span dir="ltr" className="font-semibold">
              {sentTo}
            </span>
            , קישור לאיפוס כבר בדרך. הקישור תקף לשעה.
          </p>
        </div>
        <AuthAltLink
          href="/signin"
          next={next}
          prompt="זהו?"
          action="חזרה לכניסה"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          איפוס סיסמה
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          תכתבו את האימייל של החשבון ונשלח לשם קישור לבחירת סיסמה חדשה.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <FormAlert message={error} />

        <AuthField
          id="reset-email"
          name="email"
          type="email"
          label="אימייל"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          messages={{
            valueMissing: "תכתבו את האימייל של החשבון.",
            typeMismatch: "זה לא נראה כמו כתובת אימייל.",
          }}
        />

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          שולחים קישור לאיפוס
        </Button>
      </form>

      <AuthAltLink
        href="/signin"
        next={next}
        prompt="נזכרתם?"
        action="חזרה לכניסה"
      />
    </div>
  );
}
