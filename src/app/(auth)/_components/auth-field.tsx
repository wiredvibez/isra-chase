"use client";

import * as React from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type ValidityKey =
  | "valueMissing"
  | "typeMismatch"
  | "tooShort"
  | "tooLong"
  | "patternMismatch";

const VALIDITY_KEYS: readonly ValidityKey[] = [
  "valueMissing",
  "typeMismatch",
  "tooShort",
  "tooLong",
  "patternMismatch",
];

/**
 * The browser's own `validationMessage` follows the browser UI language, which
 * would drop an English sentence into a Hebrew form. A caller's `messages` win;
 * these are the safety net underneath them.
 */
const DEFAULT_MESSAGES: Record<ValidityKey, string> = {
  valueMissing: "צריך למלא את השדה הזה.",
  typeMismatch: "הפורמט כאן לא תקין.",
  tooShort: "קצר מדי.",
  tooLong: "ארוך מדי.",
  patternMismatch: "זה לא בפורמט שמתקבל כאן.",
};

export interface AuthFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  /** A node, so callers can fold a constraint hint into the accessible name. */
  label: React.ReactNode;
  /** Our own wording per failure kind; the browser's default is the fallback. */
  messages?: Partial<Record<ValidityKey, string>>;
}

/**
 * A labelled input whose error state is driven by `:user-invalid`. That
 * pseudo-class already encodes "the user has interacted with this field", so
 * mirroring it into `aria-invalid` gives assistive tech the same timing sighted
 * users get — nothing is announced before the person has had their say.
 */
export function AuthField({
  id,
  label,
  messages,
  className,
  onBlur,
  onInput,
  onInvalid,
  ...inputProps
}: AuthFieldProps) {
  const [error, setError] = React.useState<string | null>(null);
  const errorId = `${id}-error`;

  const sync = React.useCallback(
    (el: HTMLInputElement) => {
      let userInvalid: boolean;
      try {
        userInvalid = el.matches(":user-invalid");
      } catch {
        // Pre-2023 engines without `:user-invalid`; blur-time validity is the
        // closest equivalent, and this handler only runs after an interaction.
        userInvalid = !el.validity.valid;
      }
      if (!userInvalid) {
        setError(null);
        return;
      }
      const kind = VALIDITY_KEYS.find((key) => el.validity[key]);
      setError(
        (kind && (messages?.[kind] || DEFAULT_MESSAGES[kind])) ||
          "בדקו את השדה הזה.",
      );
    },
    [messages],
  );

  return (
    <Field label={label} htmlFor={id} error={error} required={inputProps.required}>
      <Input
        id={id}
        className={className}
        aria-invalid={error ? "true" : undefined}
        aria-errormessage={error ? errorId : undefined}
        onBlur={(event) => {
          sync(event.currentTarget);
          onBlur?.(event);
        }}
        onInput={(event) => {
          // Only re-check once an error is on screen, so corrections clear
          // immediately without an error appearing halfway through typing.
          if (error) sync(event.currentTarget);
          onInput?.(event);
        }}
        onInvalid={(event) => {
          // Fired when a submit attempt is blocked; `:user-invalid` matches
          // from that moment, so this is the right time to show the message.
          sync(event.currentTarget);
          onInvalid?.(event);
        }}
        {...inputProps}
      />
    </Field>
  );
}
