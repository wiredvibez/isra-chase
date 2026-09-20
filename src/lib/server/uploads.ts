import { z } from "zod";
import { badRequest, forbidden } from "./http";

/**
 * Upload authorization.
 *
 * Browsers upload straight to Cloud Storage with a signed URL, so this module
 * is where an upload is actually authorized — there are no Storage rules in
 * the path. Every request names the object path it wants, and we decide
 * whether this caller may write there.
 *
 * That is strictly more than Storage rules could express: a rule cannot check
 * that the uploader has joined the chase without a Firestore read, so it would
 * have had to let any signed-in user write into any chase's folder.
 */

export const MAX_BYTES: Record<"image" | "video" | "audio", number> = {
  image: 12 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 30 * 1024 * 1024,
};

export const signUploadSchema = z.object({
  path: z.string().min(1).max(512),
  contentType: z.string().min(1).max(128),
  bytes: z.number().int().positive(),
});

export type UploadScope =
  | { kind: "submission"; chaseId: string; uid: string }
  | { kind: "chase-asset"; chaseId: string }
  | { kind: "avatar"; uid: string };

/** Reject traversal, absolute paths and anything with surprising characters. */
function assertSafePath(path: string) {
  if (path.startsWith("/") || path.includes("..") || path.includes("//")) {
    throw badRequest("Bad upload path.");
  }
  if (!/^[A-Za-z0-9/_.-]+$/.test(path)) {
    throw badRequest("Upload path has unsupported characters.");
  }
}

/**
 * Work out what a requested path is asking for. Returns null when the shape
 * matches nothing we serve, which the caller turns into a refusal.
 */
export function classifyPath(path: string): UploadScope | null {
  assertSafePath(path);
  const parts = path.split("/");

  // users/{uid}/avatar/{file}
  if (parts[0] === "users" && parts[2] === "avatar" && parts.length >= 4) {
    return { kind: "avatar", uid: parts[1] };
  }

  if (parts[0] === "chases" && parts.length >= 4) {
    const chaseId = parts[1];
    // chases/{chaseId}/submissions/{uid}/{file}
    if (parts[2] === "submissions" && parts.length >= 5) {
      return { kind: "submission", chaseId, uid: parts[3] };
    }
    // chases/{chaseId}/{cover|missions|teams}/...
    if (["cover", "missions", "teams", "splash"].includes(parts[2])) {
      return { kind: "chase-asset", chaseId };
    }
  }
  return null;
}

export function kindOfContentType(contentType: string) {
  if (contentType.startsWith("image/")) return "image" as const;
  if (contentType.startsWith("video/")) return "video" as const;
  if (contentType.startsWith("audio/")) return "audio" as const;
  return null;
}

export function assertWithinLimits(contentType: string, bytes: number) {
  const kind = kindOfContentType(contentType);
  if (!kind) throw badRequest("That file type isn't supported.");
  if (bytes > MAX_BYTES[kind]) {
    throw forbidden(
      `That ${kind} is too large (max ${Math.round(MAX_BYTES[kind] / 1024 / 1024)} MB).`,
    );
  }
  return kind;
}
