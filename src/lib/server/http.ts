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

export const unauthorized = (m = "צריך להתחבר.") =>
  new ApiError(401, m, "unauthenticated");
export const forbidden = (m = "אין לכם גישה לזה.") =>
  new ApiError(403, m, "forbidden");
export const notFound = (m = "לא מצאנו את זה.") => new ApiError(404, m, "not_found");
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
            error: first ? `${first.path.join(".")}: ${first.message}` : "קלט לא תקין.",
            code: "invalid_input",
            issues: error.issues,
          },
          { status: 400 },
        );
      }
      console.error("[api] unhandled", error);
      return NextResponse.json(
        { error: "משהו השתבש אצלנו. תנסו שוב.", code: "internal" },
        { status: 500 },
      );
    },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw badRequest("הבקשה לא תקינה.");
  }
}
