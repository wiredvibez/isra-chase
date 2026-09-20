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

/**
 * Subscribe to a single document.
 * Pass `null` to stand down (e.g. before the id is known) — the hook still
 * runs, so the rules of hooks are never bent by a conditional subscription.
 */
export function useLiveDoc<T>(
  ref: DocumentReference | null,
  deps: React.DependencyList,
): Live<T | null> {
  const [state, setState] = React.useState<Live<T | null>>({
    data: null,
    loading: Boolean(ref),
    error: null,
  });

  React.useEffect(() => {
    if (!ref) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setState({
          data: snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null,
          loading: false,
          error: null,
        });
      },
      (error) => setState({ data: null, loading: false, error }),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Subscribe to a query. Results always carry their document id. */
export function useLiveQuery<T>(
  query: Query | null,
  deps: React.DependencyList,
): Live<T[]> {
  const [state, setState] = React.useState<Live<T[]>>({
    data: [],
    loading: Boolean(query),
    error: null,
  });

  React.useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      query,
      (snap) => {
        setState({
          data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
          loading: false,
          error: null,
        });
      },
      (error) => setState({ data: [], loading: false, error }),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
