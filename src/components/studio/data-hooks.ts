"use client";

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
  return useLiveQuery<Participant>(
    query(sub(chaseId, "participants"), orderBy("joinedAt", "asc")),
    [chaseId],
  );
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
