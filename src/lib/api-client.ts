"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
  ) {
    super(message);
  }
}

/**
 * Calls a route handler, attaching a fresh Firebase ID token.
 *
 * The session cookie usually suffices, but sending the bearer token too means
 * a request still authenticates in the window right after sign-in, before the
 * cookie round-trip has landed.
 */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = await getFirebaseAuth().currentUser?.getIdToken();

  const response = await fetch(path, {
    ...rest,
    method: rest.method ?? (json ? "POST" : "GET"),
    headers: {
      ...(json ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : rest.body,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      payload?.error ?? `Request failed (${response.status}).`,
      payload?.code ?? "error",
    );
  }
  return payload as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, json?: unknown) =>
  api<T>(path, { method: "POST", json: json ?? {} });
export const apiPatch = <T>(path: string, json: unknown) =>
  api<T>(path, { method: "PATCH", json });
export const apiDelete = <T>(path: string, json?: unknown) =>
  api<T>(path, { method: "DELETE", json });
