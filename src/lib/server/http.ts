import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
  ) {
    super(message);
  }
}

export const unauthorized = (m = "You need to sign in.") =>
  new ApiError(401, m, "unauthenticated");
export const forbidden = (m = "You don't have access to this.") =>
  new ApiError(403, m, "forbidden");
export const notFound = (m = "Not found.") => new ApiError(404, m, "not_found");
export const badRequest = (m: string) => new ApiError(400, m, "bad_request");
export const conflict = (m: string) => new ApiError(409, m, "conflict");

/**
 * Wraps a route handler so thrown ApiErrors become clean JSON and anything
 * unexpected becomes a 500 without leaking a stack trace to the client.
 */
export function handler<T>(fn: () => Promise<T>) {
  return fn().then(
    (data) => NextResponse.json(data ?? { ok: true }),
    (error: unknown) => {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        );
      }
      if (error instanceof ZodError) {
        const first = error.issues[0];
        return NextResponse.json(
          {
            error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input.",
            code: "invalid_input",
            issues: error.issues,
          },
          { status: 400 },
        );
      }
      console.error("[api] unhandled", error);
      return NextResponse.json(
        { error: "Something went wrong on our end.", code: "internal" },
        { status: 500 },
      );
    },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw badRequest("Expected a JSON body.");
  }
}
