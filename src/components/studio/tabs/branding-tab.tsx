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

  // Re-seed when the console switches chase, the documented "adjust state
  // during render" way — an effect here would cost an extra render pass.
  const [seededFor, setSeededFor] = React.useState(chaseId);
  if (seededFor !== chaseId) {
    setSeededFor(chaseId);
    setForm(fromChase(chase));
  }

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
        setError("כתובת התקנון אינה קישור תקין.");
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
      toastError(err, "לא הצלחנו לשמור את המיתוג.");
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="מיתוג"
        description="מה שהשחקנים רואים לפני שהם משחקים: מסך הפתיחה, תמונת הנושא והתקנון שלכם."
      />

      <Card>
        <CardContent className="pt-5">
          <SettingRow
            label="מסך פתיחה"
            hint="מוצג במסך מלא בזמן טעינת האפליקציה. לאורך, יחס 2:3."
          >
            <ImageUpload
              label="תמונת פתיחה"
              ratio="2/3"
              folder={`chases/${chaseId}/cover`}
              value={form.splashImageUrl}
              onChange={(url) => set("splashImageUrl", url)}
            />
          </SettingRow>

          <SettingRow label="תמונת נושא" hint="מופיעה בכרטיסים ובמסך ההצטרפות. יחס 16:9.">
            <ImageUpload
              label="תמונת נושא"
              ratio="16/9"
              folder={`chases/${chaseId}/cover`}
              value={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
            />
          </SettingRow>

          <SettingRow
            label="קישור לתקנון"
            hint="מחליף את קישור התקנון המוגדר כברירת מחדל במסך ההצטרפות."
            htmlFor="branding-terms"
          >
            <Input
              id="branding-terms"
              type="url"
              inputMode="url"
              dir="ltr"
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
