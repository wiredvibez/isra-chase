"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { apiDelete, apiPatch, apiPost } from "@/lib/api-client";
import type { Adjustment, Team } from "@/lib/domain/types";
import { dateTime, points as formatPoints } from "@/lib/format";
import { toastError } from "../studio-utils";

/** Manual per-team score change. The reason is mandatory — it is the audit log. */
export function AdjustScoreDialog({
  chaseId,
  team,
  onClose,
}: {
  chaseId: string;
  team: Team | null;
  onClose: () => void;
}) {
  const [amount, setAmount] = React.useState("10");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Re-seed as the dialog opens on a team. Adjusting during render rather than
  // in an effect keeps the fields from showing the previous team for a frame.
  const [seededFor, setSeededFor] = React.useState(team);
  if (seededFor !== team) {
    setSeededFor(team);
    if (team) {
      setAmount("10");
      setReason("");
    }
  }

  async function submit() {
    if (!team) return;
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value === 0) {
      toast.error("עדכון ניקוד לא יכול להיות 0.");
      return;
    }
    if (!reason.trim()) {
      toast.error("צריך לכתוב סיבה לעדכון הניקוד.");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/chases/${chaseId}/adjustments`, {
        teamId: team.id,
        points: value,
        reason: reason.trim(),
      });
      toast.success(`${formatPoints(value, true)} נקודות לקבוצה ${team.name}.`);
      onClose();
    } catch (error) {
      toastError(error, "לא הצלחנו לעדכן את הניקוד.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(team)}
      onClose={onClose}
      size="sm"
      title={`עדכון הניקוד של ${team?.name ?? ""}`}
      description="מספר שלילי מוריד נקודות. כל עדכון נרשם בהיסטוריית הבונוסים של הקבוצה."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            לעדכן ניקוד
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="נקודות" htmlFor="adjust-points" required>
          <Input
            id="adjust-points"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="סיבה" htmlFor="adjust-reason" required>
          <Textarea
            id="adjust-reason"
            value={reason}
            placeholder="למה הניקוד משתנה?"
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}

/** The audit log: every bonus and adjustment, editable and deletable. */
export function BonusHistoryDialog({
  chaseId,
  team,
  adjustments,
  onClose,
}: {
  chaseId: string;
  team: Team | null;
  adjustments: Adjustment[];
  onClose: () => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [points, setPoints] = React.useState("0");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const rows = team
    ? adjustments.filter((entry) => entry.teamId === team.id)
    : [];

  async function saveEdit(entry: Adjustment) {
    const value = Math.round(Number(points));
    if (!Number.isFinite(value) || value === 0) {
      toast.error("עדכון ניקוד לא יכול להיות 0.");
      return;
    }
    setBusy(true);
    try {
      await apiPatch(`/api/chases/${chaseId}/adjustments/${entry.id}`, {
        points: value,
        reason: reason.trim() || undefined,
      });
      toast.success("העדכון נשמר.");
      setEditingId(null);
    } catch (error) {
      toastError(error, "לא הצלחנו לעדכן את השורה.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: Adjustment) {
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/adjustments/${entry.id}`);
      toast.success("השורה נמחקה והניקוד חושב מחדש.");
    } catch (error) {
      toastError(error, "לא הצלחנו למחוק את השורה.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(team)}
      onClose={onClose}
      title={`היסטוריית הבונוסים של ${team?.name ?? ""}`}
      description="כל נקודות הבונוס וכל עדכון ניקוד ידני — מי ביצע ומתי."
      footer={
        <Button variant="ghost" onClick={onClose}>
          סגירה
        </Button>
      }
    >
      {rows.length ? (
        <ul className="divide-y divide-border">
          {rows.map((entry) => (
            <li key={entry.id} className="py-3">
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <Input
                    type="number"
                    aria-label="נקודות"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                  <Textarea
                    aria-label="סיבה"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" loading={busy} onClick={() => void saveEdit(entry)}>
                      לשמור
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Badge tone={entry.points >= 0 ? "success" : "danger"}>
                    {formatPoints(entry.points, true)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.reason ?? "ללא סיבה"}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.byName} · {dateTime(entry.createdAt)}
                      {entry.editedAt ? " · נערך" : ""}
                      {entry.submissionId ? " · בונוס על הגשה" : ""}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="לערוך את השורה"
                    onClick={() => {
                      setEditingId(entry.id);
                      setPoints(String(entry.points));
                      setReason(entry.reason ?? "");
                    }}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="למחוק את השורה"
                    onClick={() => void remove(entry)}
                  >
                    <Trash2 className="size-4 text-danger" aria-hidden />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          עוד אין בונוסים או עדכוני ניקוד לקבוצה הזו.
        </p>
      )}
    </Dialog>
  );
}

/** Broadcast straight to one team, without leaving the leaderboard. */
export function TeamBroadcastDialog({
  chaseId,
  team,
  onClose,
}: {
  chaseId: string;
  team: Team | null;
  onClose: () => void;
}) {
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Adjusted during render rather than in an effect, so the box is never shown
  // holding the message that was just sent to a different team.
  const [seededFor, setSeededFor] = React.useState(team);
  if (seededFor !== team) {
    setSeededFor(team);
    if (team) setBody("");
  }

  async function send() {
    if (!team || !body.trim()) {
      toast.error("צריך לכתוב משהו כדי לשלוח.");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/chases/${chaseId}/broadcasts`, {
        body: body.trim(),
        imageUrl: null,
        linkUrl: null,
        teamIds: [team.id],
        schedule: { kind: "now" },
      });
      toast.success(`ההודעה נשלחה לקבוצה ${team.name}.`);
      onClose();
    } catch (error) {
      toastError(error, "לא הצלחנו לשלוח את ההודעה.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(team)}
      onClose={onClose}
      size="sm"
      title={`הודעה לקבוצה ${team?.name ?? ""}`}
      description="רק הקבוצה הזו תראה אותה."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={() => void send()} loading={busy}>
            לשלוח עכשיו
          </Button>
        </>
      }
    >
      <Field label="ההודעה" htmlFor="team-broadcast-body" required>
        <Textarea
          id="team-broadcast-body"
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
    </Dialog>
  );
}
