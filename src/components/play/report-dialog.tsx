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
      toast.success("תודה. המארגן יבדוק את זה.");
      onClose();
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "הדיווח לא נשלח. תנסו שוב.",
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
      title="דיווח על ההגשה"
      description="רק המארגן רואה את זה, ושום דבר לא נמחק אוטומטית."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button
            variant="danger"
            onClick={() => void send()}
            loading={sending}
            disabled={!reason.trim()}
          >
            שולחים דיווח
          </Button>
        </>
      }
    >
      <Field label="מה הבעיה בהגשה?" htmlFor="report-reason" required>
        <Textarea
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder="ספרו למארגן מה ראיתם…"
        />
      </Field>
    </Dialog>
  );
}
