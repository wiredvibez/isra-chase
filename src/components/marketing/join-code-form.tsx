"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Join codes are short uppercase alphanumerics (e.g. TLV24X). */
const CODE_PATTERN = "[A-Za-z0-9]{4,10}";

function normalise(raw: string) {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
}

export function JoinCodeForm({ className }: { className?: string }) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = normalise(code);
    if (clean.length < 4) {
      setError("Join codes are at least four characters.");
      return;
    }
    setError(null);
    router.push(`/join/${clean}`);
  }

  return (
    <form
      onSubmit={submit}
      className={cn("w-full", className)}
      aria-labelledby={`${inputId}-label`}
    >
      <label
        id={`${inputId}-label`}
        htmlFor={inputId}
        className="text-sm font-semibold"
      >
        Already have a join code?
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          name="code"
          value={code}
          onChange={(event) => {
            setCode(normalise(event.target.value));
            if (error) setError(null);
          }}
          onBlur={(event) => {
            const el = event.currentTarget;
            // Mirror the browser's own post-interaction invalid state so the
            // message never appears before the player has typed anything.
            setError(
              el.value && !el.checkValidity()
                ? "Join codes are at least four characters."
                : null,
            );
          }}
          placeholder="TLV24X"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          pattern={CODE_PATTERN}
          maxLength={10}
          aria-invalid={error ? "true" : undefined}
          aria-errormessage={error ? errorId : undefined}
          className="h-12 font-mono text-base tracking-[0.25em] uppercase sm:max-w-[11rem]"
        />
        <Button type="submit" size="lg" className="shrink-0">
          Join with a code
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          The organiser shares it as a code, a link or a QR poster.
        </p>
      )}
    </form>
  );
}
