"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** The bare entry point: a code goes in, /join/[code] takes it from there. */
export function JoinCodeForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = React.useState(initialCode);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleaned) return;
    router.push(`/join/${encodeURIComponent(cleaned)}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="space-y-2 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-100">
          <QrCode className="size-7" aria-hidden />
        </span>
        <h1 className="font-display text-3xl font-bold">מצטרפים למרדף</h1>
        <p className="text-sm text-muted-foreground">
          תקלידו את הקוד שקיבלתם מהמארגן — או תסרקו את קוד ה-QR שלו ותדלגו על
          השלב הזה לגמרי.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="קוד הצטרפות" htmlFor="join-code" required>
              <Input
                id="join-code"
                dir="ltr"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                maxLength={32}
                placeholder="ABC123"
                className="h-14 text-center font-display text-2xl font-bold tracking-[0.2em] uppercase"
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!code.trim()}
            >
              ממשיכים
              <ArrowRight className="size-5 flip-rtl" aria-hidden />
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
