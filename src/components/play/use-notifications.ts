"use client";

import * as React from "react";
import { collection, limit, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useLiveQuery } from "@/lib/hooks/use-firestore";
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
        where("teamId", "==", null),
        orderBy("createdAt", "desc"),
        limit(PAGE),
      ),
    [chaseId],
  );

  const mine = React.useMemo(
    () =>
      teamId
        ? query(
            collection(getDb(), "chases", chaseId, "notifications"),
            where("teamId", "==", teamId),
            orderBy("createdAt", "desc"),
            limit(PAGE),
          )
        : null,
    [chaseId, teamId],
  );

  const broadcastLive = useLiveQuery<AppNotification>(everyone, [chaseId]);
  const teamLive = useLiveQuery<AppNotification>(mine, [chaseId, teamId]);

  const notifications = React.useMemo(() => {
    const all = [...broadcastLive.data, ...teamLive.data];
    all.sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
    );
    return all;
  }, [broadcastLive.data, teamLive.data]);

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
