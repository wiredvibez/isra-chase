import { getStorage } from "firebase-admin/storage";
import { adminApp } from "@/lib/firebase/admin";
import { requireCaller, loadChase, isOrganizerOf, loadParticipant } from "@/lib/server/guards";
import { badRequest, forbidden, handler, readJson } from "@/lib/server/http";
import {
  assertWithinLimits,
  classifyPath,
  signUploadSchema,
} from "@/lib/server/uploads";

export const runtime = "nodejs";

const BUCKET = process.env.MEDIA_BUCKET;
/** Ten minutes is plenty for a phone on a bad connection, and short enough
 *  that a leaked URL is not a standing write grant. */
const URL_TTL_MS = 10 * 60 * 1000;

/**
 * Mints a V4 signed PUT url so the browser uploads straight to Cloud Storage.
 *
 * Going direct keeps large videos off the serverless function, which has a
 * request body limit far below our 200 MB ceiling. The signed url carries
 * `x-goog-acl: public-read`, so the object is readable the moment it lands and
 * no second round trip is needed to publish it.
 */
export async function POST(request: Request) {
  return handler(async () => {
    if (!BUCKET) {
      throw badRequest("Server is missing MEDIA_BUCKET.");
    }

    const caller = await requireCaller(request);
    const input = signUploadSchema.parse(await readJson(request));

    const scope = classifyPath(input.path);
    if (!scope) throw badRequest("Bad upload path.");

    assertWithinLimits(input.contentType, input.bytes);

    // The path names who is writing and where; check the caller matches.
    if (scope.kind === "avatar") {
      if (scope.uid !== caller.uid) throw forbidden("That isn't your profile.");
    } else if (scope.kind === "submission") {
      if (scope.uid !== caller.uid) {
        throw forbidden("You can only upload your own submissions.");
      }
      const chase = await loadChase(scope.chaseId);
      const participant = await loadParticipant(scope.chaseId, caller.uid);
      if (!participant && !isOrganizerOf(chase, caller.uid)) {
        throw forbidden("עוד לא הצטרפתם למרדף הזה.");
      }
    } else {
      const chase = await loadChase(scope.chaseId);
      if (!isOrganizerOf(chase, caller.uid)) {
        throw forbidden("רק המארגנים של המרדף יכולים לעשות את זה.");
      }
    }

    const file = getStorage(adminApp()).bucket(BUCKET).file(input.path);
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + URL_TTL_MS,
      contentType: input.contentType,
      extensionHeaders: { "x-goog-acl": "public-read" },
    });

    return {
      uploadUrl,
      publicUrl: `https://storage.googleapis.com/${BUCKET}/${input.path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      path: input.path,
      requiredHeaders: {
        "content-type": input.contentType,
        "x-goog-acl": "public-read",
      },
    };
  });
}
