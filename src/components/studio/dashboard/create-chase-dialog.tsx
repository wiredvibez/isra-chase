"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";
import type { Chase } from "@/lib/domain/types";
import { toastError } from "../studio-utils";

const DESCRIPTION_MAX = 200;

export function CreateChaseDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // The creator's timezone is captured once and then locked, as Goosechase does.
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { chase } = await apiPost<{ chase: Chase }>("/api/chases", {
        name: name.trim(),
        description: description.trim(),
        timezone,
      });
      onClose();
      setName("");
      setDescription("");
      router.push(`/studio/${chase.id}/details`);
    } catch (error) {
      toastError(error, "Couldn't create that chase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create a chase"
      description="You can change everything later — this just gets you started."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void create()} loading={saving} disabled={!name.trim()}>
            Create chase
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Field label="Chase name" htmlFor="chase-name" required>
          <Input
            id="chase-name"
            value={name}
            autoFocus
            maxLength={120}
            placeholder="Summer scavenger hunt"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field
          label="Description"
          htmlFor="chase-description"
          hint={`${description.length}/${DESCRIPTION_MAX} characters`}
        >
          <Textarea
            id="chase-description"
            value={description}
            maxLength={DESCRIPTION_MAX}
            placeholder="What are players doing, and why?"
            onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
          />
        </Field>
      </form>
    </Dialog>
  );
}
