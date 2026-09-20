"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Clock, Globe, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";
import { useLoadedChase } from "../chase-context";
import { useMissions } from "../data-hooks";
import { DurationField } from "../duration-field";
import { SettingRow, TabHeader } from "../section";
import {
  DAY,
  dateTimeLabel,
  fromLocalInput,
  msLabel,
  STATUS_LABEL,
  stampMs,
  toLocalInput,
  toastError,
} from "../studio-utils";

type ScheduleAction = "go_live" | "schedule" | "end" | "reset" | "update_end";

export function ScheduleTab() {
  const { chase, chaseId } = useLoadedChase();
  const { data: missions } = useMissions(chaseId);

  const [startMode, setStartMode] = React.useState<"now" | "scheduled">(
    chase.startMode ?? "now",
  );
  const [startAtMs, setStartAtMs] = React.useState<number | null>(
    stampMs(chase.startAt),
  );
  const [endMode, setEndMode] = React.useState<"duration" | "specific">(
    chase.endAt ? "specific" : "duration",
  );
  const [durationMs, setDurationMs] = React.useState<number>(DAY);
  const [endAtMs, setEndAtMs] = React.useState<number | null>(stampMs(chase.endAt));
  const [busy, setBusy] = React.useState<ScheduleAction | null>(null);
  const [confirm, setConfirm] = React.useState<"end" | "reset" | null>(null);

  // "Starts now" anchors the end time on the clock, which renders must not read
  // directly. Ticking it keeps the preview — and the end time we submit — current.
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const liveMissions = missions.filter((m) => !m.isDraft);

  const anchorMs =
    stampMs(chase.startAt) ?? (startMode === "scheduled" ? startAtMs : nowMs);

  const resolvedEndMs =
    endMode === "duration"
      ? anchorMs
        ? anchorMs + durationMs
        : null
      : endAtMs;

  const checklist = [
    {
      id: "missions",
      label: "לפחות משימה אחת מפורסמת",
      ok: liveMissions.length > 0,
      detail: `${liveMissions.length} מפורסמות, ${missions.length - liveMissions.length} בטיוטה`,
    },
    {
      id: "end",
      label: "שעת סיום",
      ok: Boolean(resolvedEndMs),
      detail: resolvedEndMs
        ? msLabel(resolvedEndMs)
        : "בלי שעת סיום אי אפשר לעלות לאוויר",
    },
    {
      id: "start",
      label: "שעת התחלה",
      ok: startMode === "now" || Boolean(startAtMs),
      detail:
        startMode === "now"
          ? "מתחיל ברגע שתעלו לאוויר"
          : startAtMs
            ? msLabel(startAtMs)
            : "בחרו מתי המרדף נפתח",
    },
  ];

  const blocked = checklist.some((item) => !item.ok);

  async function run(action: ScheduleAction) {
    setBusy(action);
    try {
      await apiPost(`/api/chases/${chaseId}/schedule`, {
        action,
        startAtMs: action === "schedule" ? startAtMs : undefined,
        endAtMs:
          action === "go_live" || action === "schedule" || action === "update_end"
            ? resolvedEndMs
            : undefined,
      });
      toast.success(
        action === "reset"
          ? "המרדף חזר לטיוטה."
          : action === "end"
            ? "המרדף הסתיים."
            : action === "update_end"
              ? "שעת הסיום עודכנה."
              : action === "schedule"
                ? "המרדף תוזמן."
                : "אתם באוויר!",
      );
      setConfirm(null);
    } catch (error) {
      toastError(error, "לא הצלחנו לעדכן את לוח הזמנים.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="התחלה וסיום"
        description="מתי המרדף נפתח, מתי הוא נסגר, ואיך עולים לאוויר."
        actions={<Badge tone="neutral">{STATUS_LABEL[chase.status]}</Badge>}
      />

      <Card>
        <CardContent className="pt-5">
          <SettingRow label="התחלה" htmlFor="start-mode">
            <Select
              id="start-mode"
              value={startMode}
              disabled={chase.status === "live" || chase.status === "ended"}
              onChange={(e) =>
                setStartMode(e.target.value as "now" | "scheduled")
              }
            >
              <option value="now">
                עכשיו — ברגע שאלחץ על &quot;עולים לאוויר&quot;
              </option>
              <option value="scheduled">בשעה מסוימת</option>
            </Select>
            {startMode === "scheduled" && (
              <Input
                type="datetime-local"
                aria-label="שעת התחלה"
                className="mt-2"
                value={toLocalInput(startAtMs)}
                onChange={(e) => setStartAtMs(fromLocalInput(e.target.value))}
              />
            )}
            {chase.startAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                כרגע מתחיל ב-{dateTimeLabel(chase.startAt)}
              </p>
            )}
          </SettingRow>

          <SettingRow label="סיום" htmlFor="end-mode" hint="חובה לפני עלייה לאוויר.">
            <Select
              id="end-mode"
              value={endMode}
              onChange={(e) =>
                setEndMode(e.target.value as "duration" | "specific")
              }
            >
              <option value="duration">לרוץ למשך זמן מוגדר</option>
              <option value="specific">להסתיים בשעה מסוימת</option>
            </Select>
            {endMode === "duration" ? (
              <div className="mt-2 space-y-1">
                <DurationField
                  idPrefix="chase-duration"
                  valueMs={durationMs}
                  onChange={(ms) => setDurationMs(Math.max(60_000, ms))}
                />
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {resolvedEndMs
                    ? `מסתיים ב-${msLabel(resolvedEndMs)}`
                    : "בחרו שעת התחלה כדי לראות את שעת הסיום."}
                </p>
              </div>
            ) : (
              <Input
                type="datetime-local"
                aria-label="שעת סיום"
                className="mt-2"
                value={toLocalInput(endAtMs)}
                onChange={(e) => setEndAtMs(fromLocalInput(e.target.value))}
              />
            )}
          </SettingRow>

          <SettingRow
            label="אזור זמן"
            hint="נקבע ביצירת המרדף וננעל מאז, כדי שלוח הזמנים לא יזוז לשחקנים באמצע. כל אחד רואה את השעות לפי השעון המקומי שלו."
          >
            <p className="flex items-center gap-2 rounded-md bg-surface-inset px-3 py-2 text-sm">
              <Globe className="size-4 text-muted-foreground" aria-hidden />
              {chase.timezone}
            </p>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h2 className="font-display text-base font-bold">
            {"צ'ק-ליסט לפני שעולים לאוויר"}
          </h2>
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {item.ok ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                )}
                <span>
                  <span className="font-semibold">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <span className="sr-only">{item.ok ? "מוכן" : "לא מוכן"}</span>
              </li>
            ))}
          </ul>

          <div
            aria-live="polite"
            className="mt-4 flex flex-wrap items-center gap-2"
          >
            {chase.status === "draft" && startMode === "now" && (
              <Button
                disabled={blocked}
                loading={busy === "go_live"}
                onClick={() => void run("go_live")}
              >
                <Clock className="size-4" aria-hidden />
                עולים לאוויר
              </Button>
            )}
            {chase.status === "draft" && startMode === "scheduled" && (
              <Button
                disabled={blocked}
                loading={busy === "schedule"}
                onClick={() => void run("schedule")}
              >
                <Clock className="size-4" aria-hidden />
                תזמון המרדף
              </Button>
            )}
            {chase.status === "scheduled" && (
              <>
                <Button
                  disabled={blocked}
                  loading={busy === "go_live"}
                  onClick={() => void run("go_live")}
                >
                  עולים לאוויר עכשיו
                </Button>
                <Button
                  variant="outline"
                  loading={busy === "update_end"}
                  disabled={!resolvedEndMs}
                  onClick={() => void run("update_end")}
                >
                  עדכון שעת הסיום
                </Button>
              </>
            )}
            {chase.status === "live" && (
              <>
                <Button
                  variant="outline"
                  loading={busy === "update_end"}
                  disabled={!resolvedEndMs}
                  onClick={() => void run("update_end")}
                >
                  עדכון שעת הסיום
                </Button>
                <Button variant="danger" onClick={() => setConfirm("end")}>
                  סיום המרדף עכשיו
                </Button>
              </>
            )}
            {chase.status === "ended" && (
              <Button variant="outline" onClick={() => setConfirm("reset")}>
                <RotateCcw className="size-4" aria-hidden />
                איפוס ההתחלה והסיום
              </Button>
            )}
            {blocked && chase.status === "draft" && (
              <p className="text-xs font-semibold text-danger">
                {"יש לסגור את הפערים בצ'ק-ליסט שלמעלה לפני העלייה לאוויר."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm === "end"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("end")}
        loading={busy === "end"}
        title="לסיים את המרדף עכשיו?"
        description="השחקנים לא יוכלו לשלוח עוד הגשות. כל מה שכבר נשלח, וכל הנקודות, נשמרים."
        confirmLabel="סיום המרדף"
      />

      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run("reset")}
        loading={busy === "reset"}
        tone="primary"
        title="לאפס את ההתחלה והסיום?"
        description="המרדף חוזר להיות טיוטה כדי שתוכלו לתזמן אותו מחדש. המשתתפים, הקבוצות, ההגשות והנקודות נשמרים במלואם — שום דבר לא נמחק."
        confirmLabel="חזרה לטיוטה"
      />
    </div>
  );
}
