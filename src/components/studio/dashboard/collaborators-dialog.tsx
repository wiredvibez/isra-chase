"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiDelete, apiPost } from "@/lib/api-client";
import type { Chase } from "@/lib/domain/types";
import { toastError } from "../studio-utils";

/**
 * Collaborators are a flat co-owner role, matching Goosechase's single
 * Collaborator level. The API keys them by uid and keeps a parallel list of
 * emails for display.
 */
export function CollaboratorsDialog({
  chase,
  open,
  onClose,
  onChanged,
}: {
  chase: Chase;
  open: boolean;
  onClose: () => void;
  onChanged: (chase: Chase) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const rows = Object.keys(chase.collaborators ?? {}).map((uid, index) => ({
    uid,
    email: chase.collaboratorEmails?.[index] ?? uid,
  }));

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await apiPost<{ chase: Chase }>(
        `/api/chases/${chase.id}/collaborators`,
        { email: email.trim() },
      );
      onChanged(res.chase);
      setEmail("");
    } catch (error) {
      toastError(error, "לא הצלחנו להזמין את האדם הזה.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    setBusy(true);
    try {
      const res = await apiDelete<{ chase: Chase }>(
        `/api/chases/${chase.id}/collaborators/${uid}`,
      );
      onChanged(res.chase);
    } catch (error) {
      toastError(error, "לא הצלחנו להסיר את השותף.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="הזמנת שותפים"
      description={`שותפים יכולים לערוך הכול ב"${chase.name}" — חוץ ממחיקת המרדף.`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          סיום
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void invite();
        }}
      >
        <Field label="כתובת אימייל" htmlFor="collab-email">
          <div className="flex gap-2">
            <Input
              id="collab-email"
              type="email"
              value={email}
              dir="ltr"
              placeholder="teammate@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" loading={busy} disabled={!email.trim()}>
              <UserPlus className="size-4" aria-hidden />
              הזמנה
            </Button>
          </div>
        </Field>

        {rows.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((row) => (
              <li
                key={row.uid}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <span dir="ltr" className="min-w-0 flex-1 truncate text-start">
                  {row.email}
                </span>
                <button
                  type="button"
                  onClick={() => void remove(row.uid)}
                  aria-label={`הסרת ${row.email}`}
                  className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-danger"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            עדיין אין שותפים. לשותף צריך להיות חשבון Isra Chase עם כתובת
            האימייל הזו.
          </p>
        )}
      </form>
    </Dialog>
  );
}
