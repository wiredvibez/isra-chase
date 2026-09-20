"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chase } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** The origin never changes within a page, so there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};

function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return {
    copied,
    async copy(value: string, key: string, label: string) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(key);
        toast.success(`${label} הועתק.`);
      } catch {
        toast.error("הדפדפן חסם את הלוח. אפשר להעתיק ידנית.");
      }
    },
  };
}

/** Join code + link + QR. Shown in the console sidebar and in the mobile sheet. */
export function InvitePanel({
  chase,
  className,
}: {
  chase: Chase;
  className?: string;
}) {
  const { copied, copy } = useCopy();
  const qrRef = React.useRef<HTMLDivElement>(null);

  // The origin is a browser-only value, so it is read as an external store:
  // the server snapshot is blank and hydration fills it in without a mismatch.
  const origin = React.useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );
  const link = `${origin}/join/${chase.joinCode}`;

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chase.joinCode}-join-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          קוד הצטרפות
        </p>
        <div className="mt-1 flex items-center gap-2">
          <code
            dir="ltr"
            className="flex-1 rounded-md bg-surface-inset px-3 py-2 text-start font-mono text-lg font-bold tracking-[0.2em]"
          >
            {chase.joinCode}
          </code>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="העתקת קוד ההצטרפות"
            onClick={() => void copy(chase.joinCode, "code", "קוד ההצטרפות")}
          >
            {copied === "code" ? (
              <Check className="size-4 text-success" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          קישור הזמנה
        </p>
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            dir="ltr"
            value={link}
            aria-label="קישור ההזמנה"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-start text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="העתקת קישור ההזמנה"
            onClick={() => void copy(link, "link", "קישור ההזמנה")}
          >
            {copied === "link" ? (
              <Check className="size-4 text-success" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          ref={qrRef}
          className="rounded-md bg-white p-2"
          aria-label="קוד QR של קישור ההזמנה"
          role="img"
        >
          <QRCodeSVG value={link || chase.joinCode} size={104} level="M" />
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>השחקנים סורקים אותו, או מקלידים את הקוד באפליקציה.</p>
          <Button type="button" size="sm" variant="outline" onClick={downloadQr}>
            <Download className="size-4" aria-hidden />
            הורדת ה-QR
          </Button>
        </div>
      </div>

      {chase.hasPassword && (
        <p className="rounded-md bg-warning-surface px-3 py-2 text-xs text-warning">
          המרדף הזה מוגן בסיסמה — כדאי לשתף גם אותה.
        </p>
      )}
    </div>
  );
}
