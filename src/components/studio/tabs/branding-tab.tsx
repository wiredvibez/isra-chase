"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiPatch } from "@/lib/api-client";
import type { Chase } from "@/lib/domain/types";
import { useLoadedChase } from "../chase-context";
import { ImageUpload } from "../image-upload";
import { SaveBar, useSaveState } from "../save-bar";
import { SettingRow, TabHeader } from "../section";
import { toastError } from "../studio-utils";

interface BrandingForm {
  splashImageUrl: string | null;
  imageUrl: string | null;
  termsUrl: string;
}

function fromChase(chase: Chase): BrandingForm {
  return {
    splashImageUrl: chase.splashImageUrl ?? null,
    imageUrl: chase.imageUrl ?? null,
    termsUrl: chase.termsUrl ?? "",
  };
}

export function BrandingTab() {
  const { chase, chaseId } = useLoadedChase();
  const [form, setForm] = React.useState<BrandingForm>(() => fromChase(chase));
  const [error, setError] = React.useState<string | null>(null);
  const save = useSaveState();

  React.useEffect(() => {
    setForm(fromChase(chase));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaseId]);

  function set<K extends keyof BrandingForm>(key: K, value: BrandingForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    save.markDirty();
  }

  async function onSave() {
    const terms = form.termsUrl.trim();
    if (terms) {
      try {
        new URL(terms);
      } catch {
        setError("That terms URL isn't a valid link.");
        return;
      }
    }
    setError(null);
    save.markSaving();
    try {
      await apiPatch(`/api/chases/${chaseId}`, {
        splashImageUrl: form.splashImageUrl,
        imageUrl: form.imageUrl,
        termsUrl: terms || null,
      });
      save.markSaved();
    } catch (err) {
      save.markFailed();
      toastError(err, "Couldn't save branding.");
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="Branding"
        description="What players see before they play: the splash screen, the cover art and your terms."
      />

      <Card>
        <CardContent className="pt-5">
          <SettingRow
            label="Splash screen"
            hint="Shown full-bleed while the app loads. Portrait, 2:3."
          >
            <ImageUpload
              label="Splash image"
              ratio="2/3"
              folder={`chases/${chaseId}/cover`}
              value={form.splashImageUrl}
              onChange={(url) => set("splashImageUrl", url)}
            />
          </SettingRow>

          <SettingRow label="Cover art" hint="Used on cards and the join screen. 16:9.">
            <ImageUpload
              label="Cover art"
              ratio="16/9"
              folder={`chases/${chaseId}/cover`}
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
            />
          </SettingRow>

          <SettingRow
            label="Terms of service URL"
            hint="Replaces the default terms link on the join screen."
            htmlFor="branding-terms"
          >
            <Input
              id="branding-terms"
              type="url"
              inputMode="url"
              placeholder="https://example.com/terms"
              value={form.termsUrl}
              onChange={(e) => set("termsUrl", e.target.value)}
            />
            {error && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger">
                {error}
              </p>
            )}
          </SettingRow>
        </CardContent>
      </Card>

      <SaveBar
        state={save.state}
        onSave={() => void onSave()}
        onDiscard={() => {
          setForm(fromChase(chase));
          save.markSaved();
        }}
      />
    </div>
  );
}
