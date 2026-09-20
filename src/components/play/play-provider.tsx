"use client";

import * as React from "react";
import { doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { useLiveDoc } from "@/lib/hooks/use-firestore";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import type { Chase, Participant, Team } from "@/lib/domain/types";
import { unwrapMissions, type PlayMission } from "./types";

/** How often we poke the server so scheduled broadcasts materialise. */
const TICK_INTERVAL_MS = 120_000;

export interface PlayContextValue {
  chaseId: string;
  uid: string | null;
  authLoading: boolean;
  chase: Chase | null;
  chaseLoading: boolean;
  participant: Participant | null;
  /** True until we know whether this player has joined. */
  membershipLoading: boolean;
  team: Team | null;
  missions: PlayMission[];
  missionsLoading: boolean;
  missionsError: string | null;
  refreshMissions: () => Promise<void>;
}

const PlayContext = React.createContext<PlayContextValue | null>(null);

export function PlayProvider({
  chaseId,
  children,
}: {
  chaseId: string;
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const chaseRef = React.useMemo(
    () => (uid ? doc(getDb(), "chases", chaseId) : null),
    [chaseId, uid],
  );
  const chaseLive = useLiveDoc<Chase>(chaseRef, [chaseId, uid]);

  // Reading your own participant document is itself gated on being a
  // participant, so a permission error here simply means "not joined yet".
  const participantRef = React.useMemo(
    () => (uid ? doc(getDb(), "chases", chaseId, "participants", uid) : null),
    [chaseId, uid],
  );
  const participantLive = useLiveDoc<Participant>(participantRef, [chaseId, uid]);
  const teamId = participantLive.data?.teamId ?? null;

  const teamRef = React.useMemo(
    () => (teamId ? doc(getDb(), "chases", chaseId, "teams", teamId) : null),
    [chaseId, teamId],
  );
  const teamLive = useLiveDoc<Team>(teamRef, [chaseId, teamId]);

  const [missions, setMissions] = React.useState<PlayMission[]>([]);
  const [missionsLoading, setMissionsLoading] = React.useState(true);
  const [missionsError, setMissionsError] = React.useState<string | null>(null);

  const joined = Boolean(participantLive.data);

  const refreshMissions = React.useCallback(async () => {
    if (!uid) return;
    try {
      const payload = await apiGet<unknown>(`/api/chases/${chaseId}/missions`);
      setMissions(unwrapMissions(payload));
      setMissionsError(null);
    } catch (error) {
      setMissionsError(
        error instanceof ApiClientError
          ? error.message
          : "Couldn't load the missions.",
      );
    } finally {
      setMissionsLoading(false);
    }
  }, [chaseId, uid]);

  // One effect drives every mission fetch: the first one on mount, a refresh
  // on the tick cadence (availability is time-based, so the list goes stale on
  // its own), and one whenever the player comes back to the tab.
  React.useEffect(() => {
    if (!uid || !joined) return;
    const tick = () => {
      void apiPost(`/api/chases/${chaseId}/tick`).catch(() => {});
      void refreshMissions();
    };
    tick();
    const id = window.setInterval(tick, TICK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [chaseId, uid, joined, refreshMissions]);

  const value = React.useMemo<PlayContextValue>(
    () => ({
      chaseId,
      uid,
      authLoading,
      chase: chaseLive.data,
      chaseLoading: chaseLive.loading,
      participant: participantLive.data,
      membershipLoading: authLoading || participantLive.loading,
      team: teamLive.data,
      missions,
      missionsLoading,
      missionsError,
      refreshMissions,
    }),
    [
      chaseId,
      uid,
      authLoading,
      chaseLive.data,
      chaseLive.loading,
      participantLive.data,
      participantLive.loading,
      teamLive.data,
      missions,
      missionsLoading,
      missionsError,
      refreshMissions,
    ],
  );

  return <PlayContext.Provider value={value}>{children}</PlayContext.Provider>;
}

export function usePlay(): PlayContextValue {
  const ctx = React.useContext(PlayContext);
  if (!ctx) throw new Error("usePlay must be used inside <PlayProvider>.");
  return ctx;
}
