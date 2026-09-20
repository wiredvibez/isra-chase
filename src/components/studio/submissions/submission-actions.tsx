"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  Eye,
  EyeOff,
  Flag,
  Link2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import type { Submission } from "@/lib/domain/types";
import type { MenuItem } from "../menu";
import { toastError } from "../studio-utils";

export type ModerationAction =
  | "approve"
  | "reject"
  | "hide"
  | "unhide"
  | "flag"
  | "unflag";

/**
 * Every organizer-side action on a submission, plus the dialogs they need.
 * Shared by the activity feed and the judging surface so the two never drift.
 */
export function useSubmissionActions(chaseId: string) {
  const [bonusFor, setBonusFor] = React.useState<Submission | null>(null);
  const [deleteFor, setDeleteFor] = React.useState<Submission | null>(null);
  const [bonusPoints, setBonusPoints] = React.useState("10");
  const [bonusReason, setBonusReason] = React.useState("");
  const [deleteReason, setDeleteReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const moderate = React.useCallback(
    async (submission: Submission, action: ModerationAction, note?: string) => {
      try {
        await apiPatch(
          `/api/chases/${chaseId}/submissions/${submission.id}`,
          { action, note: note ?? null },
        );
      } catch (error) {
        toastError(error, "לא הצלחנו לעדכן את ההגשה.");
        throw error;
      }
    },
    [chaseId],
  );

  async function submitBonus() {
    if (!bonusFor) return;
    const value = Math.round(Number(bonusPoints));
    if (!Number.isFinite(value) || value === 0) {
      toast.error("נקודות בונוס לא יכולות להיות 0.");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/chases/${chaseId}/submissions/${bonusFor.id}/bonus`, {
        points: value,
        reason: bonusReason.trim() || null,
      });
      toast.success(
        value > 0
          ? `נוספו ${Math.abs(value)} נקודות בונוס.`
          : `ירדו ${Math.abs(value)} נקודות.`,
      );
      setBonusFor(null);
      setBonusReason("");
    } catch (error) {
      toastError(error, "לא הצלחנו להחיל את נקודות הבונוס.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleteFor) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/submissions/${deleteFor.id}`, {
        reason: deleteReason.trim() || null,
      });
      toast.success("ההגשה נמחקה והנקודות שלה ירדו.");
      setDeleteFor(null);
      setDeleteReason("");
    } catch (error) {
      toastError(error, "לא הצלחנו למחוק את ההגשה.");
    } finally {
      setBusy(false);
    }
  }

  function copyLink(submission: Submission) {
    const url = `${window.location.origin}/studio/${chaseId}/feed?submission=${submission.id}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("הקישור הועתק."))
      .catch(() => toast.error("הדפדפן חסם את ההעתקה."));
  }

  const items = React.useCallback(
    (submission: Submission): MenuItem[] => {
      const list: MenuItem[] = [];
      if (submission.status !== "approved") {
        list.push({
          id: "approve",
          label: "לאשר",
          icon: <Check className="size-4" aria-hidden />,
          onSelect: () => void moderate(submission, "approve"),
        });
      }
      if (submission.status !== "rejected") {
        list.push({
          id: "reject",
          label: "לדחות",
          icon: <X className="size-4" aria-hidden />,
          onSelect: () => void moderate(submission, "reject"),
        });
      }
      list.push(
        {
          id: "bonus",
          label: "נקודות בונוס",
          icon: <Sparkles className="size-4" aria-hidden />,
          onSelect: () => {
            setBonusPoints("10");
            setBonusReason("");
            setBonusFor(submission);
          },
        },
        {
          id: "hide",
          label: submission.hidden ? "להחזיר לפיד" : "להסתיר מהפיד",
          icon: submission.hidden ? (
            <Eye className="size-4" aria-hidden />
          ) : (
            <EyeOff className="size-4" aria-hidden />
          ),
          onSelect: () =>
            void moderate(submission, submission.hidden ? "unhide" : "hide"),
        },
        {
          id: "flag",
          label: submission.flagged ? "לבטל סימון" : "לסמן לבדיקה",
          icon: <Flag className="size-4" aria-hidden />,
          onSelect: () =>
            void moderate(submission, submission.flagged ? "unflag" : "flag"),
        },
        {
          id: "copy",
          label: "להעתיק קישור",
          icon: <Link2 className="size-4" aria-hidden />,
          onSelect: () => copyLink(submission),
        },
        {
          id: "delete",
          label: "למחוק הגשה",
          icon: <Trash2 className="size-4" aria-hidden />,
          tone: "danger",
          onSelect: () => {
            setDeleteReason("");
            setDeleteFor(submission);
          },
        },
      );
      return list;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moderate, chaseId],
  );

  const dialogs = (
    <>
      <Dialog
        open={Boolean(bonusFor)}
        onClose={() => setBonusFor(null)}
        size="sm"
        title="נקודות בונוס"
        description={`הבונוס יינתן לקבוצה ${bonusFor?.teamName ?? "הזו"} על "${bonusFor?.missionName ?? ""}". מספר שלילי מוריד נקודות.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBonusFor(null)}>
              ביטול
            </Button>
            <Button onClick={() => void submitBonus()} loading={busy}>
              להוסיף בונוס
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="נקודות" htmlFor="bonus-points" required>
            <Input
              id="bonus-points"
              type="number"
              inputMode="numeric"
              value={bonusPoints}
              onChange={(e) => setBonusPoints(e.target.value)}
            />
          </Field>
          <Field
            label="סיבה"
            htmlFor="bonus-reason"
            hint="לא חובה — אבל מה שתכתבו יגיע לשחקנים."
          >
            <Textarea
              id="bonus-reason"
              value={bonusReason}
              maxLength={300}
              onChange={(e) => setBonusReason(e.target.value)}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleteFor)}
        onClose={() => setDeleteFor(null)}
        size="sm"
        title="למחוק את ההגשה?"
        description="הנקודות יורדות מהסך של הקבוצה, והמשימה נפתחת שוב להגשה. הקבוצה מקבלת התראה עם הסיבה שתכתבו."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteFor(null)}>
              ביטול
            </Button>
            <Button variant="danger" onClick={() => void submitDelete()} loading={busy}>
              למחוק הגשה
            </Button>
          </>
        }
      >
        <Field
          label="סיבה"
          htmlFor="delete-reason"
          hint="לא חובה. ההודעה נשלחת כהתראה לשחקנים — כתבו אותה כך שגם בן 13 יבין מה קרה."
        >
          <Textarea
            id="delete-reason"
            value={deleteReason}
            maxLength={500}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        </Field>
      </Dialog>
    </>
  );

  return { items, dialogs, moderate };
}
