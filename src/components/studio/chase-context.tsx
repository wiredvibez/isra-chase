"use client";

import * as React from "react";
import { doc } from "firebase/firestore";
import type { FirestoreError } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/auth-provider";
import { useLiveDoc } from "@/lib/hooks/use-firestore";
import type { Chase } from "@/lib/domain/types";

export interface ChaseContextValue {
  chaseId: string;
  chase: Chase | null;
  loading: boolean;
  error: FirestoreError | null;
  isOwner: boolean;
  isOrganizer: boolean;
}

const ChaseContext = React.createContext<ChaseContextValue | null>(null);

/**
 * The chase document is read live rather than through GET /api/chases/[id]:
 * every tab reacts to schedule changes and stat counters the server writes.
 */
export function ChaseProvider({
  chaseId,
  children,
}: {
  chaseId: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data, loading, error } = useLiveDoc<Chase>(
    doc(getDb(), "chases", chaseId),
    [chaseId],
  );

  const value = React.useMemo<ChaseContextValue>(() => {
    const isOwner = Boolean(data && user && data.ownerUid === user.uid);
    return {
      chaseId,
      chase: data,
      loading,
      error,
      isOwner,
      isOrganizer:
        isOwner || Boolean(data && user && data.collaborators?.[user.uid]),
    };
  }, [chaseId, data, loading, error, user]);

  return (
    <ChaseContext.Provider value={value}>{children}</ChaseContext.Provider>
  );
}

export function useChase(): ChaseContextValue {
  const ctx = React.useContext(ChaseContext);
  if (!ctx) throw new Error("useChase must be used inside <ChaseProvider>.");
  return ctx;
}

/** The chase, once loaded. Tabs render inside a shell that gates on loading. */
export function useLoadedChase(): ChaseContextValue & { chase: Chase } {
  const ctx = useChase();
  if (!ctx.chase) throw new Error("Chase is not loaded yet.");
  return ctx as ChaseContextValue & { chase: Chase };
}
