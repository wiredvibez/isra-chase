"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Compass, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { useAuth } from "@/lib/auth/auth-provider";
import type { Chase } from "@/lib/domain/types";
import { ChaseCard } from "@/components/studio/dashboard/chase-card";
import { CollaboratorsDialog } from "@/components/studio/dashboard/collaborators-dialog";
import { CreateChaseDialog } from "@/components/studio/dashboard/create-chase-dialog";
import { TabHeader } from "@/components/studio/section";
import { toastError } from "@/components/studio/studio-utils";

interface ChaseListResponse {
  owned: Chase[];
  collaborating: Chase[];
}

export default function StudioDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = React.useState<ChaseListResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [inviteTo, setInviteTo] = React.useState<Chase | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Chase | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setData(await apiGet<ChaseListResponse>("/api/chases"));
    } catch (error) {
      toastError(error, "לא הצלחנו לטעון את המרדפים שלכם.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function duplicate(chase: Chase) {
    try {
      const res = await apiPost<{ chase: Chase }>(
        `/api/chases/${chase.id}/duplicate`,
      );
      toast.success(`שוכפל בשם "${res.chase.name}".`);
      router.push(`/studio/${res.chase.id}/details`);
    } catch (error) {
      toastError(error, "לא הצלחנו לשכפל את המרדף.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`/api/chases/${deleteTarget.id}`);
      toast.success("המרדף נמחק.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toastError(error, "לא הצלחנו למחוק את המרדף.");
    } finally {
      setBusy(false);
    }
  }

  function patchLocal(next: Chase) {
    setData((current) =>
      current
        ? {
            owned: current.owned.map((c) => (c.id === next.id ? next : c)),
            collaborating: current.collaborating.map((c) =>
              c.id === next.id ? next : c,
            ),
          }
        : current,
    );
    setInviteTo(next);
  }

  function section(title: string, chases: Chase[], owned: boolean) {
    if (!chases.length) return null;
    return (
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chases.map((chase) => (
            <ChaseCard
              key={chase.id}
              chase={chase}
              canDelete={owned}
              onDuplicate={() => void duplicate(chase)}
              onInvite={() => setInviteTo(chase)}
              onDelete={() => setDeleteTarget(chase)}
            />
          ))}
        </div>
      </section>
    );
  }

  const empty =
    !loading && !data?.owned.length && !data?.collaborating.length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <TabHeader
        title="המרדפים שלכם"
        description="בונים, מריצים ובודקים כאן כל מרדף."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            מרדף חדש
          </Button>
        }
      />

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {empty && (
        <EmptyState
          icon={<Compass className="size-6" aria-hidden />}
          title="עדיין אין מרדפים"
          description="מרדף אחד הוא משחק אחד: המשימות שלכם, הקבוצות שלכם, טבלת המובילים שלכם."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              יוצרים מרדף ראשון
            </Button>
          }
        />
      )}

      {section("שיצרתי", data?.owned ?? [], true)}
      {section("ששיתפו איתי", data?.collaborating ?? [], false)}

      <CreateChaseDialog open={creating} onClose={() => setCreating(false)} />

      {inviteTo && (
        <CollaboratorsDialog
          chase={inviteTo}
          open
          onClose={() => setInviteTo(null)}
          onChanged={patchLocal}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={`למחוק את "${deleteTarget?.name ?? ""}"?`}
        description="כל המשימות, הקבוצות, ההגשות והנקודות של המרדף הזה יימחקו לצמיתות. אי אפשר לשחזר."
        confirmLabel="מחיקת המרדף"
      />
    </div>
  );
}
