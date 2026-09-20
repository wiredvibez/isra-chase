"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chase } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

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
        toast.success(`${label} copied.`);
      } catch {
        toast.error("Your browser blocked the clipboard. Copy it manually.");
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
  const [origin, setOrigin] = React.useState("");
  const qrRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setOrigin(window.location.origin), []);
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
          Join code
        </p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 rounded-md bg-surface-inset px-3 py-2 font-mono text-lg font-bold tracking-[0.2em]">
            {chase.joinCode}
          </code>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Copy join code"
            onClick={() => void copy(chase.joinCode, "code", "Join code")}
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
          Invite link
        </p>
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            value={link}
            aria-label="Invite link"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Copy invite link"
            onClick={() => void copy(link, "link", "Invite link")}
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
          aria-label="QR code for the invite link"
          role="img"
        >
          <QRCodeSVG value={link || chase.joinCode} size={104} level="M" />
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>Players scan this, or enter the code in the app.</p>
          <Button type="button" size="sm" variant="outline" onClick={downloadQr}>
            <Download className="size-4" aria-hidden />
            Download QR
          </Button>
        </div>
      </div>

      {chase.hasPassword && (
        <p className="rounded-md bg-warning-surface px-3 py-2 text-xs text-warning">
          This chase is password protected — share the password too.
        </p>
      )}
    </div>
  );
}
