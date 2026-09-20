"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { apiDelete, apiPost } from "@/lib/api-client";
import type { Mission, MissionType } from "@/lib/domain/types";
import { points as formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLoadedChase } from "../chase-context";
import { useMissions } from "../data-hooks";
import { Menu } from "../menu";
import { MissionEditor } from "../missions/mission-editor";
import { TabHeader } from "../section";
import {
  expirySummary,
  MISSION_ORDER_LABEL,
  releaseSummary,
  toastError,
} from "../studio-utils";

const TYPE_ICON: Record<MissionType, React.ReactNode> = {
  camera: <Camera className="size-4" aria-hidden />,
  text: <TypeIcon className="size-4" aria-hidden />,
  gps: <MapPin className="size-4" aria-hidden />,
};

export function MissionsTab() {
  const { chaseId, chase } = useLoadedChase();
  const { data: missions, loading } = useMissions(chaseId);

  const [order, setOrder] = React.useState<Mission[]>(missions);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<Mission | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Mission | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Live data is the source of truth except while a drag is in flight. Taken
  // during render rather than in an effect: the list then never paints a frame
  // of the previous order.
  const [seeded, setSeeded] = React.useState({ missions, dragging });
  if (seeded.missions !== missions || seeded.dragging !== dragging) {
    setSeeded({ missions, dragging });
    if (dragging === null) setOrder(missions);
  }

  async function persist(next: Mission[]) {
    setOrder(next);
    try {
      await apiPost(`/api/chases/${chaseId}/missions/reorder`, {
        order: next.map((m) => m.id),
      });
    } catch (error) {
      toastError(error, "לא הצלחנו לשמור את הסדר החדש.");
      setOrder(missions);
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persist(next);
  }

  async function duplicate(mission: Mission) {
    try {
      await apiPost(`/api/chases/${chaseId}/missions/${mission.id}/duplicate`);
      toast.success(`"${mission.name}" שוכפלה.`);
    } catch (error) {
      toastError(error, "לא הצלחנו לשכפל את המשימה.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${chaseId}/missions/${deleteTarget.id}`);
      toast.success("המשימה נמחקה.");
      setDeleteTarget(null);
    } catch (error) {
      toastError(error, "לא הצלחנו למחוק את המשימה.");
    } finally {
      setBusy(false);
    }
  }

  function openEditor(mission: Mission | null) {
    setEditing(mission);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-5">
      <TabHeader
        title="משימות"
        description="גוררים כדי לקבוע את הסדר שהשחקנים רואים. טיוטות נשארות מוסתרות עד הפרסום."
        actions={
          <Button onClick={() => openEditor(null)}>
            <Plus className="size-4" aria-hidden />
            משימה חדשה
          </Button>
        }
      />

      {chase.missionOrder !== "custom" && order.length > 1 && (
        <p className="rounded-md bg-info-surface px-3 py-2 text-xs text-info">
          כרגע השחקנים רואים את המשימות בסדר{" "}
          <strong>{MISSION_ORDER_LABEL[chase.missionOrder]}</strong>. כדי
          להשתמש בסדר הגרירה שלכם, שנו את סדר המשימות ל&quot;מותאם
          אישית&quot; בלשונית &quot;משתתפים&quot;.
        </p>
      )}

      {loading && <SkeletonList rows={4} />}

      {!loading && !order.length && (
        <EmptyState
          icon={<ListChecks className="size-6" aria-hidden />}
          title="עדיין אין משימות"
          description="משימות הן מה שהשחקנים באמת עושים — תמונה, תשובה, מקום להגיע אליו."
          action={
            <Button onClick={() => openEditor(null)}>
              <Plus className="size-4" aria-hidden />
              יוצרים משימה ראשונה
            </Button>
          }
        />
      )}

      <ul className="space-y-2">
        {order.map((mission, index) => (
          <li
            key={mission.id}
            draggable
            onDragStart={(e) => {
              setDragging(index);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", mission.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging !== null) {
                const from = dragging;
                setDragging(null);
                setOverIndex(null);
                move(from, index);
              }
            }}
            onDragEnd={() => {
              setDragging(null);
              setOverIndex(null);
            }}
            className={cn(
              "transition-opacity",
              dragging === index && "opacity-40",
              overIndex === index && dragging !== null && dragging !== index
                ? "rounded-lg ring-2 ring-primary"
                : "",
            )}
          >
            <Card className="flex items-start gap-3 p-3">
              <span
                aria-hidden
                className="mt-1 cursor-grab text-muted-foreground active:cursor-grabbing"
                title="גוררים כדי לשנות סדר"
              >
                <GripVertical className="size-5" />
              </span>

              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                {TYPE_ICON[mission.type]}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditor(mission)}
                    className="font-display text-base font-bold hover:underline"
                  >
                    {mission.name}
                  </button>
                  {mission.isDraft && <Badge tone="warning">טיוטה</Badge>}
                  <Badge tone="brand">{`${formatPoints(mission.points)} נק'`}</Badge>
                  <Badge tone="neutral">
                    {mission.feedVisibility === "shown" ? (
                      <>
                        <Eye className="size-3" aria-hidden /> בפיד
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3" aria-hidden /> מוסתרת מהפיד
                      </>
                    )}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {mission.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {releaseSummary(mission.release)} ·{" "}
                  {expirySummary(mission.expiry)}
                </p>
              </div>

              <Menu
                label={`פעולות עבור ${mission.name}`}
                items={[
                  {
                    id: "edit",
                    label: "עריכה",
                    icon: <Pencil className="size-4" aria-hidden />,
                    onSelect: () => openEditor(mission),
                  },
                  {
                    id: "duplicate",
                    label: "שכפול",
                    icon: <Copy className="size-4" aria-hidden />,
                    onSelect: () => void duplicate(mission),
                  },
                  {
                    id: "up",
                    label: "העברה למעלה",
                    icon: <ArrowUp className="size-4" aria-hidden />,
                    disabled: index === 0,
                    onSelect: () => move(index, index - 1),
                  },
                  {
                    id: "down",
                    label: "העברה למטה",
                    icon: <ArrowDown className="size-4" aria-hidden />,
                    disabled: index === order.length - 1,
                    onSelect: () => move(index, index + 1),
                  },
                  {
                    id: "delete",
                    label: "מחיקה",
                    icon: <Trash2 className="size-4" aria-hidden />,
                    tone: "danger",
                    onSelect: () => setDeleteTarget(mission),
                  },
                ]}
              />
            </Card>
          </li>
        ))}
      </ul>

      <MissionEditor
        chaseId={chaseId}
        mission={editing}
        missions={missions}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={() => toast.success("המשימה נשמרה.")}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={`למחוק את "${deleteTarget?.name ?? ""}"?`}
        description="כל ההגשות למשימה הזו יימחקו, והנקודות שהן הכניסו יירדו מטבלת המובילים. אי אפשר לשחזר."
        confirmLabel="מחיקת המשימה"
      />
    </div>
  );
}
