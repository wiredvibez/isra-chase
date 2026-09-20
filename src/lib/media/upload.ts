"use client";

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";
import imageCompression from "browser-image-compression";
import { getFirebaseStorage } from "@/lib/firebase/client";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB before compression
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_AUDIO_BYTES = 30 * 1024 * 1024; // 30 MB

export type MediaKind = "image" | "video" | "audio";

export interface UploadedMedia {
  url: string;
  path: string;
  kind: MediaKind;
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSec?: number;
}

/** Hebrew name for a media kind, for use inside sentences. */
export function kindLabel(kind: MediaKind): string {
  return { image: "תמונה", video: "סרטון", audio: "הקלטה" }[kind];
}

export function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

/** Shrink photos in the browser so a 20 MP phone shot doesn't cost 8 MB. */
async function prepare(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    return await imageCompression(file, {
      maxSizeMB: 1.6,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.82,
    });
  } catch {
    return file; // compression is an optimization, never a hard requirement
  }
}

async function imageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return {};
  }
}

async function videoMeta(file: File): Promise<{
  width?: number;
  height?: number;
  durationSec?: number;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (v: {
      width?: number;
      height?: number;
      durationSec?: number;
    }) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    video.onloadedmetadata = () =>
      done({
        width: video.videoWidth,
        height: video.videoHeight,
        durationSec: Number.isFinite(video.duration) ? video.duration : undefined,
      });
    video.onerror = () => done({});
    video.src = url;
  });
}

export function validateMedia(file: File, allowed: MediaKind[]) {
  const kind = kindOf(file);
  if (!kind) return "סוג הקובץ הזה לא נתמך.";
  if (!allowed.includes(kind))
    return `המשימה הזאת מקבלת ${allowed.map(kindLabel).join(" או ")} בלבד.`;
  const limits: Record<MediaKind, number> = {
    image: MAX_IMAGE_BYTES,
    video: MAX_VIDEO_BYTES,
    audio: MAX_AUDIO_BYTES,
  };
  if (file.size > limits[kind]) {
    return `ה${kindLabel(kind)} כבד מדי (עד ${Math.round(limits[kind] / 1024 / 1024)} MB).`;
  }
  return null;
}

/** Turn a Storage error code into something a 13-year-old can act on. */
export function uploadErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "storage/unauthorized":
      return "אין לכם הרשאה להעלות לכאן. נסו להצטרף מחדש למרדף.";
    case "storage/canceled":
      return "ההעלאה בוטלה.";
    case "storage/quota-exceeded":
      return "נגמר המקום למרדף הזה. תגידו למארגן.";
    case "storage/unauthenticated":
      return "התנתקתם. תתחברו ותנסו שוב.";
    case "storage/retry-limit-exceeded":
    case "storage/unknown":
      return "לא הצלחנו להגיע לשרת התמונות. תבדקו חיבור ותנסו שוב.";
    default:
      return (error as Error)?.message || "ההעלאה נכשלה. תנסו שוב.";
  }
}

/** No byte moved in this long ⇒ treat the upload as dead rather than pending. */
const STALL_TIMEOUT_MS = 25_000;

/** Upload with progress. `path` must match the Storage security rules. */
export async function uploadMedia(
  file: File,
  path: string,
  onProgress?: (pct: number) => void,
): Promise<UploadedMedia> {
  const kind = kindOf(file);
  if (!kind) throw new Error("סוג הקובץ לא נתמך.");

  const prepared = await prepare(file);
  const meta =
    kind === "image"
      ? await imageDimensions(prepared)
      : kind === "video"
        ? await videoMeta(prepared)
        : {};

  const storageRef = ref(getFirebaseStorage(), path);
  const task = uploadBytesResumable(storageRef, prepared, {
    contentType: prepared.type,
    cacheControl: "public,max-age=31536000,immutable",
  });

  await new Promise<void>((resolve, reject) => {
    let stallTimer: ReturnType<typeof setTimeout>;
    const settle = (fn: () => void) => {
      clearTimeout(stallTimer);
      fn();
    };
    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        task.cancel();
        reject(
          new Error(
            "ההעלאה נתקעה. תבדקו חיבור ותנסו שוב.",
          ),
        );
      }, STALL_TIMEOUT_MS);
    };

    armStallTimer();
    task.on(
      "state_changed",
      (snap: UploadTaskSnapshot) => {
        armStallTimer();
        onProgress?.(
          snap.totalBytes
            ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
            : 0,
        );
      },
      (error) => settle(() => reject(new Error(uploadErrorMessage(error)))),
      () => settle(resolve),
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);
  return {
    url,
    path,
    kind,
    contentType: prepared.type,
    bytes: prepared.size,
    ...meta,
  };
}
