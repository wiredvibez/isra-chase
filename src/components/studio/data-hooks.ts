"use client";

import * as React from "react";
import { collection, limit, orderBy, query } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { useLiveQuery } from "@/lib/hooks/use-firestore";
import type {
  Adjustment,
  Broadcast,
  Mission,
  Participant,
  Submission,
  Team,
} from "@/lib/domain/types";

const sub = (chaseId: string, name: string) =>
  collection(getDb(), "chases", chaseId, name);

export function useMissions(chaseId: string) {
  return useLiveQuery<Mission>(
    query(sub(chaseId, "missions"), orderBy("order", "asc")),
    [chaseId],
  );
}

export function useTeams(chaseId: string) {
  return useLiveQuery<Team>(
    query(sub(chaseId, "teams"), orderBy("points", "desc")),
    [chaseId],
  );
}

export function useParticipants(chaseId: string) {
  const live = useLiveQuery<Participant & { id: string }>(
    query(sub(chaseId, "participants"), orderBy("joinedAt", "asc")),
    [chaseId],
  );
  // A participant document is keyed BY the uid, so the field is not stored
  // inside it. Firestore surfaces the document id as `id`; republish it under
  // the name the domain model uses, or every `participant.uid` read — React
  // keys, and the remove/move endpoints' URLs — silently becomes undefined.
  const data = React.useMemo(
    () => live.data.map((p) => ({ ...p, uid: p.uid ?? p.id })),
    [live.data],
  );
  return { ...live, data };
}

/** Newest first — the feed, the judging queue and the stats all want this. */
export function useSubmissions(chaseId: string, max = 300) {
  return useLiveQuery<Submission>(
    query(sub(chaseId, "submissions"), orderBy("createdAt", "desc"), limit(max)),
    [chaseId, max],
  );
}

export function useAdjustments(chaseId: string) {
  return useLiveQuery<Adjustment>(
    query(sub(chaseId, "adjustments"), orderBy("createdAt", "desc")),
    [chaseId],
  );
}

export function useBroadcasts(chaseId: string) {
  return useLiveQuery<Broadcast>(
    query(sub(chaseId, "broadcasts"), orderBy("createdAt", "desc")),
    [chaseId],
  );
}
