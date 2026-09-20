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
    title: "אין גישה למיקום",
    body: "הדפדפן חוסם את המיקום שלכם. הקישו על סמל המנעול או ⓘ שליד שורת הכתובת, שנו את ההרשאה למיקום ל\"אישור\" ונסו שוב. באייפון כדאי לבדוק גם: הגדרות › פרטיות ואבטחה › שירותי מיקום.",
  },
  unavailable: {
    title: "לא הצלחנו לאתר אתכם",
    body: "המכשיר לא מצליח להבין איפה הוא כרגע. צאו החוצה או לאזור פתוח יותר ונסו שוב.",
  },
  timeout: {
    title: "זה לקח יותר מדי זמן",
    body: "ה-GPS לא ענה בזמן. עמדו במקום רגע ונסו שוב — האיתור הראשון תמיד הכי איטי.",
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
          : "הצ'ק-אין לא נשלח. תנסו שוב.",
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
          <p className="font-display text-base font-bold">עוד לא הגעתם</p>
          <p className="text-sm text-muted-foreground">
            {missDistance !== null
              ? `אתם ${fmtDistance(missDistance)} משם. תיכנסו לטווח של ${radiusLabel(radiusM)} ותעשו צ'ק-אין שוב.`
              : (rejection.submission.gradeReason ??
                `אתם מחוץ לטווח של ${radiusLabel(radiusM)}. תתקרבו ותעשו צ'ק-אין שוב.`)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            {"צ'ק-אין נוסף"}
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="flex items-center gap-2 font-display text-base font-bold">
          <Navigation className="size-4 text-primary" aria-hidden />
          תיכנסו לטווח של {radiusLabel(radiusM)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {"את המרחק בודקים בשרת, והנקודה המדויקת נשארת סוד. המיקום שלכם משמש פעם אחת בלבד, לצ'ק-אין הזה."}
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
          <p className="font-display text-base font-bold">יש לנו את המיקום שלכם</p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {fix.accuracyM !== null
              ? `דיוק של בערך ${fmtDistance(fix.accuracyM)}.`
              : "רמת הדיוק לא ידועה."}{" "}
            {fix.accuracyM !== null && fix.accuracyM > radiusM
              ? "זה רחב יותר מטווח המשימה, אז אם הצ'ק-אין ייכשל — עברו למקום עם קליטה טובה יותר."
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
          ? "מאתרים אתכם…"
          : status === "ready"
            ? "לרענן את המיקום"
            : "משתפים מיקום"}
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
        {sending ? "בודקים…" : "עושים צ'ק-אין כאן"}
      </Button>
    </div>
  );
}
