"use client";

import * as React from "react";
import { toast } from "sonner";
import { LocateFixed, Navigation, RotateCcw, Send, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { distance as fmtDistance, radiusLabel } from "@/lib/format";
import type { CreateSubmissionResponse, PlayMission } from "./types";

type Fix = { lat: number; lng: number; accuracyM: number | null };
type Status = "idle" | "locating" | "ready" | "denied" | "unavailable" | "timeout";

const FAILURE_COPY: Record<"denied" | "unavailable" | "timeout", { title: string; body: string }> = {
  denied: {
    title: "Location is blocked",
    body: "Your browser is holding back your position. Tap the lock or ⓘ icon next to the address bar, set Location to Allow, then try again. On iPhone, also check Settings › Privacy & Security › Location Services.",
  },
  unavailable: {
    title: "Couldn't get a fix",
    body: "Your device can't work out where it is right now. Step outside or somewhere with a clearer view of the sky, then try again.",
  },
  timeout: {
    title: "That took too long",
    body: "The GPS didn't answer in time. Stay put for a moment and try again — the first fix is always the slowest.",
  },
};

export function GpsComposer({
  chaseId,
  mission,
  rejection,
  onResult,
  onRetry,
}: {
  chaseId: string;
  mission: PlayMission;
  rejection: CreateSubmissionResponse | null;
  onResult: (result: CreateSubmissionResponse) => void;
  onRetry: () => void;
}) {
  const radiusM = mission.gps?.radiusM ?? 0;
  const [status, setStatus] = React.useState<Status>("idle");
  const [fix, setFix] = React.useState<Fix | null>(null);
  const [sending, setSending] = React.useState(false);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        });
        setStatus("ready");
      },
      (error) => {
        setFix(null);
        if (error.code === error.PERMISSION_DENIED) setStatus("denied");
        else if (error.code === error.TIMEOUT) setStatus("timeout");
        else setStatus("unavailable");
      },
      // High accuracy is the point of a GPS mission; a cached fix is not.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  async function submit() {
    if (!fix) return;
    setSending(true);
    try {
      const result = await apiPost<CreateSubmissionResponse>(
        `/api/chases/${chaseId}/submissions`,
        { missionId: mission.id, location: fix },
      );
      onResult(result);
    } catch (caught) {
      toast.error(
        caught instanceof ApiClientError
          ? caught.message
          : "That didn't go through. Try again.",
      );
    } finally {
      setSending(false);
    }
  }

  const missDistance = rejection?.submission.location?.distanceM ?? null;
  const failure =
    status === "denied" || status === "unavailable" || status === "timeout"
      ? FAILURE_COPY[status]
      : null;

  return (
    <div className="space-y-4">
      {rejection && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-2 rounded-lg border border-warning/30 bg-warning-surface p-4"
        >
          <p className="font-display text-base font-bold">Not there yet</p>
          <p className="text-sm text-muted-foreground">
            {missDistance !== null
              ? `You're ${fmtDistance(missDistance)} away — get within ${radiusLabel(radiusM)} and check in again.`
              : (rejection.submission.gradeReason ??
                `You're outside the ${radiusLabel(radiusM)} zone. Get closer and check in again.`)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            Check in again
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="flex items-center gap-2 font-display text-base font-bold">
          <Navigation className="size-4 text-primary" aria-hidden />
          Get within {radiusLabel(radiusM)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We check your distance on the server — the exact spot stays secret.
          Your position is used once, for this check-in.
        </p>
      </div>

      {failure && (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-danger/30 bg-danger-surface p-4"
        >
          <p className="flex items-center gap-2 font-display text-base font-bold">
            <ShieldAlert className="size-4 text-danger" aria-hidden />
            {failure.title}
          </p>
          <p className="text-sm text-muted-foreground">{failure.body}</p>
        </div>
      )}

      {status === "ready" && fix && (
        <div
          aria-live="polite"
          className="rounded-lg border border-success/30 bg-success-surface p-4"
        >
          <p className="font-display text-base font-bold">Got your location</p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {fix.accuracyM !== null
              ? `Accurate to about ±${fmtDistance(fix.accuracyM)}.`
              : "Accuracy unknown."}{" "}
            {fix.accuracyM !== null && fix.accuracyM > radiusM
              ? "That's wider than the target zone, so move somewhere with a better signal if this fails."
              : ""}
          </p>
        </div>
      )}

      <Button
        type="button"
        variant={status === "ready" ? "outline" : "primary"}
        size="lg"
        className="w-full"
        onClick={locate}
        loading={status === "locating"}
      >
        {status !== "locating" && <LocateFixed className="size-5" aria-hidden />}
        {status === "locating"
          ? "Finding you…"
          : status === "ready"
            ? "Refresh my location"
            : "Share my location"}
      </Button>

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={() => void submit()}
        disabled={!fix}
        loading={sending}
      >
        {!sending && <Send className="size-5" aria-hidden />}
        {sending ? "Checking…" : "Check in here"}
      </Button>
    </div>
  );
}
