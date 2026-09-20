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
          פתיחת חשבון
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          צריך חשבון כדי לבנות מרדף ולהריץ אותו. בשביל לשחק מספיק קוד הצטרפות.
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
          label="השם שלכם"
          required
          autoComplete="name"
          maxLength={60}
          autoFocus
          placeholder="דנה לוי"
          messages={{
            valueMissing: "הקבוצות יראו את השם הזה בהודעות שתשלחו.",
          }}
        />

        <AuthField
          id="signup-email"
          name="email"
          type="email"
          label="אימייל"
          required
          autoComplete="email"
          placeholder="you@example.com"
          messages={{
            valueMissing: "צריך אימייל כדי שתוכלו להיכנס אחר כך.",
            typeMismatch: "זה לא נראה כמו כתובת אימייל.",
          }}
        />

        <AuthField
          id="signup-password"
          name="password"
          type="password"
          label={
            <>
              סיסמה{" "}
              <span className="font-normal text-muted-foreground">
                (לפחות {MIN_PASSWORD} תווים)
              </span>
            </>
          }
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          messages={{
            valueMissing: "תבחרו סיסמה.",
            tooShort: "סיסמה צריכה לפחות 6 תווים.",
          }}
        />

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          פותחים חשבון
        </Button>
      </form>

      <AuthAltLink
        href="/signin"
        next={next}
        prompt="כבר יש לכם חשבון?"
        action="כניסה"
      />
    </div>
  );
}
