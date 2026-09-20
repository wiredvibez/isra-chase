"use client";

import * as React from "react";

/**
 * A set of ids kept in localStorage — used for the two bits of play state the
 * server cannot hold for us: which notifications this person has seen, and
 * which submissions they have liked. (Clients have no write access to
 * Firestore at all under the security rules, and neither fact is worth an
 * endpoint of its own.)
 *
 * It goes through `useSyncExternalStore` rather than an effect so the first
 * client render matches the server's empty snapshot — no hydration mismatch,
 * no cascading render.
 */

const listeners = new Set<() => void>();
/** Serialized snapshot per key, so getSnapshot is referentially stable. */
const cache = new Map<string, string>();

const EMPTY = "[]";

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string | null): string {
  if (!key) return EMPTY;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let raw = EMPTY;
  try {
    raw = window.localStorage.getItem(key) ?? EMPTY;
  } catch {
    // Private mode or blocked storage: behave as if nothing was stored.
  }
  cache.set(key, raw);
  return raw;
}

function parse(raw: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useLocalSet(key: string | null) {
  const raw = React.useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY,
  );

  const value = React.useMemo(() => parse(raw), [raw]);

  const update = React.useCallback(
    (mutate: (previous: Set<string>) => Set<string>) => {
      if (!key) return;
      const next = mutate(parse(read(key)));
      const serialized = JSON.stringify([...next]);
      cache.set(key, serialized);
      try {
        window.localStorage.setItem(key, serialized);
      } catch {
        // Losing persistence is survivable; the in-memory cache still updates.
      }
      for (const listener of listeners) listener();
    },
    [key],
  );

  const add = React.useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      update((previous) => {
        const next = new Set(previous);
        for (const id of ids) next.add(id);
        return next;
      });
    },
    [update],
  );

  const toggle = React.useCallback(
    (id: string, present: boolean) => {
      update((previous) => {
        const next = new Set(previous);
        if (present) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [update],
  );

  return { value, add, toggle };
}
