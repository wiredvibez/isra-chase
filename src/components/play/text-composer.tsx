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
  open: "Anything goes here — say it your way.",
  exact: "This one is checked letter for letter, so watch the spelling.",
  approximate: "Close counts — word order and small typos are forgiven.",
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
          : "That didn't go through. Try again.",
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
          <p className="font-display text-base font-bold">Not quite yet</p>
          <p className="text-sm text-muted-foreground">
            {rejection.submission.gradeReason ??
              "That isn't the answer we're after — but nothing is lost. Have another go."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      )}

      <Field
        label="Your answer"
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
          placeholder="Type your answer…"
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
        {sending ? "Checking…" : "Submit answer"}
      </Button>
    </form>
  );
}
