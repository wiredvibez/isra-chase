"use client";

import * as React from "react";
import { toast } from "sonner";
import { RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { apiPost, ApiClientError } from "@/lib/api-client";
import type { CreateSubmissionResponse, PlayMission } from "./types";

const HINT: Record<string, string> = {
  open: "כאן הכול הולך — תכתבו את זה בסגנון שלכם.",
  exact: "את התשובה הזאת בודקים אות באות, אז שימו לב לכתיב.",
  approximate: "לא צריך לקלוע מילה במילה — סדר מילים ושגיאות קטנות נסלחים.",
};

export function TextComposer({
  chaseId,
  mission,
  rejection,
  onResult,
  onRetry,
}: {
  chaseId: string;
  mission: PlayMission;
  /** A previous attempt the server graded as wrong, shown above the field. */
  rejection: CreateSubmissionResponse | null;
  onResult: (result: CreateSubmissionResponse) => void;
  onRetry: () => void;
}) {
  const [answer, setAnswer] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const result = await apiPost<CreateSubmissionResponse>(
        `/api/chases/${chaseId}/submissions`,
        { missionId: mission.id, textAnswer: trimmed },
      );
      onResult(result);
      if (result.submission.status === "rejected") {
        // Wrong answer: keep what they typed selected so a tweak is one gesture.
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "התשובה לא נשלחה. תנסו שוב.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {rejection && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-2 rounded-lg border border-warning/30 bg-warning-surface p-4"
        >
          <p className="font-display text-base font-bold">זה לא זה</p>
          <p className="text-sm text-muted-foreground">
            {rejection.submission.gradeReason ??
              "זאת לא התשובה שחיפשנו, אבל לא הפסדתם כלום. תנסו שוב."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            עוד ניסיון
          </Button>
        </div>
      )}

      <Field
        label="התשובה שלכם"
        htmlFor="text-answer"
        hint={mission.text ? HINT[mission.text.badge] : undefined}
      >
        <Textarea
          id="text-answer"
          ref={inputRef}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          maxLength={2000}
          rows={3}
          autoComplete="off"
          placeholder="כתבו כאן את התשובה…"
          disabled={sending}
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!answer.trim()}
        loading={sending}
      >
        {!sending && <Send className="size-5" aria-hidden />}
        {sending ? "בודקים…" : "שולחים תשובה"}
      </Button>
    </form>
  );
}
