"use client";

import * as React from "react";
import { collection, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useLiveQuery } from "@/lib/hooks/use-firestore";
import { byNewest } from "@/lib/format";
import type { AppNotification } from "@/lib/domain/types";
import { useLocalSet } from "./use-local-set";

const PAGE = 60;

/**
 * Firestore has no "teamId == null OR teamId == mine" filter that the security
 * rules would accept, so we run the two halves as separate subscriptions and
 * merge them. Both are served by the existing teamId+createdAt index.
 */
export function useNotifications(chaseId: string, teamId: string | null) {
  const everyone = React.useMemo(
    () =>
      query(
        collection(getDb(), "chases", chaseId, "notifications"),
        // Equality only — see byNewest in lib/format for why.
        where("teamId", "==", null),
      ),
    [chaseId],
  );

  const mine = React.useMemo(
    () =>
      teamId
        ? query(
            collection(getDb(), "chases", chaseId, "notifications"),
            where("teamId", "==", teamId),
          )
        : null,
    [chaseId, teamId],
  );

  const broadcastLive = useLiveQuery<AppNotification>(everyone, [chaseId]);
  const teamLive = useLiveQuery<AppNotification>(mine, [chaseId, teamId]);

  const notifications = React.useMemo(
    // The queries no longer carry a limit — without an orderBy, a limit would
    // return an arbitrary slice rather than the newest — so cap after sorting.
    () => [...broadcastLive.data, ...teamLive.data].sort(byNewest).slice(0, PAGE),
    [broadcastLive.data, teamLive.data],
  );

  return {
    notifications,
    loading: broadcastLive.loading || teamLive.loading,
  };
}

/**
 * Read state is per-device on purpose: notification documents are
 * server-owned (clients have no write access at all under the Firestore
 * rules), so `readBy` can only be set by the API. A local set keeps the
 * unread badge honest without inventing an endpoint.
 */
export function useReadState(uid: string | null, chaseId: string) {
  const { value, add } = useLocalSet(
    uid ? `isra-chase:notifs-read:${uid}:${chaseId}` : null,
  );
  return { read: value, markRead: add };
}
