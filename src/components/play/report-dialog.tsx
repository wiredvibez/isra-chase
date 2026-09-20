"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { apiPost, ApiClientError } from "@/lib/api-client";

export function ReportDialog({
  chaseId,
  submissionId,
  open,
  onClose,
}: {
  chaseId: string;
  submissionId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function send() {
    if (!submissionId || !reason.trim()) return;
    setSending(true);
    try {
      await apiPost(
        `/api/chases/${chaseId}/submissions/${submissionId}/report`,
        { reason: reason.trim() },
      );
      toast.success("Thanks — the organizer will take a look.");
      onClose();
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "Couldn't send that report.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Report this submission"
      description="Only the organizer sees this. Nothing is removed automatically."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void send()}
            loading={sending}
            disabled={!reason.trim()}
          >
            Send report
          </Button>
        </>
      }
    >
      <Field label="What's wrong with it?" htmlFor="report-reason" required>
        <Textarea
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tell the organizer what you saw…"
        />
      </Field>
    </Dialog>
  );
}
