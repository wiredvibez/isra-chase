"use client";

import * as React from "react";
import {
  onSnapshot,
  type DocumentReference,
  type Query,
  type FirestoreError,
} from "firebase/firestore";

export interface Live<T> {
  data: T;
  loading: boolean;
  error: FirestoreError | null;
}

const NOTHING: never[] = [];

interface Source<S> {
  deps: React.DependencyList;
  source: S | null;
}

function depsChanged(previous: React.DependencyList, next: React.DependencyList) {
  return (
    previous.length !== next.length ||
    previous.some((value, i) => !Object.is(value, next[i]))
  );
}

/**
 * Pins a subscription source to the deps it was created with, so its identity
 * only moves when the deps do. That makes "these deps have not delivered a
 * snapshot yet" — the loading flag — derivable during render, instead of
 * something an effect has to assign before subscribing. Adjusting the state
 * during render is the documented way to react to changed inputs.
 */
function useSource<S>(source: S | null, deps: React.DependencyList): Source<S> {
  const [pinned, setPinned] = React.useState<Source<S>>(() => ({ deps, source }));
  if (depsChanged(pinned.deps, deps)) setPinned({ deps, source });
  return pinned;
}

/** What the latest snapshot delivered, tagged with the source that delivered it. */
interface Snapshot<S, T> {
  from: Source<S> | null;
  data: T;
  error: FirestoreError | null;
}

/**
 * Subscribe to a single document.
 * Pass `null` to stand down (e.g. before the id is known) — the hook still
 * runs, so the rules of hooks are never bent by a conditional subscription.
 */
export function useLiveDoc<T>(
  ref: DocumentReference | null,
  deps: React.DependencyList,
): Live<T | null> {
  const pinned = useSource(ref, deps);
  const [snapshot, setSnapshot] = React.useState<
    Snapshot<DocumentReference, T | null>
  >({ from: null, data: null, error: null });

  React.useEffect(() => {
    const source = pinned.source;
    if (!source) return;
    return onSnapshot(
      source,
      (snap) =>
        setSnapshot({
          from: pinned,
          data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null,
          error: null,
        }),
      (error) => setSnapshot({ from: pinned, data: null, error }),
    );
  }, [pinned]);

  return React.useMemo(() => {
    const settled = snapshot.from === pinned;
    if (!pinned.source) return { data: null, loading: false, error: null };
    return {
      data: settled ? snapshot.data : null,
      loading: !settled,
      error: settled ? snapshot.error : null,
    };
  }, [pinned, snapshot]);
}

/** Subscribe to a query. Results always carry their document id. */
export function useLiveQuery<T>(
  query: Query | null,
  deps: React.DependencyList,
): Live<T[]> {
  const pinned = useSource(query, deps);
  const [snapshot, setSnapshot] = React.useState<Snapshot<Query, T[]>>({
    from: null,
    data: NOTHING,
    error: null,
  });

  React.useEffect(() => {
    const source = pinned.source;
    if (!source) return;
    return onSnapshot(
      source,
      (snap) =>
        setSnapshot({
          from: pinned,
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          error: null,
        }),
      (error) => setSnapshot({ from: pinned, data: NOTHING, error }),
    );
  }, [pinned]);

  return React.useMemo(() => {
    const settled = snapshot.from === pinned;
    if (!pinned.source) return { data: NOTHING, loading: false, error: null };
    return {
      data: settled ? snapshot.data : NOTHING,
      loading: !settled,
      error: settled ? snapshot.error : null,
    };
  }, [pinned, snapshot]);
}
