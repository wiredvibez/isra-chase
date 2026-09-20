"use client";

import imageCompression from "browser-image-compression";
import { api } from "@/lib/api-client";

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

/** No byte moved in this long ⇒ treat the upload as dead rather than pending. */
const STALL_TIMEOUT_MS = 25_000;

/**
 * Uploads straight to Cloud Storage with a short-lived signed URL.
 *
 * The browser PUTs to the bucket rather than to us, which keeps a 200 MB video
 * off the serverless function entirely. `/api/uploads/sign` is where the
 * upload is authorized — it checks that this caller may write to this path.
 *
 * XMLHttpRequest rather than fetch, because fetch still cannot report upload
 * progress and a player watching a photo upload needs to see it move.
 */
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

  const contentType = prepared.type || "application/octet-stream";
  const signed = await api<{
    uploadUrl: string;
    publicUrl: string;
    path: string;
    requiredHeaders: Record<string, string>;
  }>("/api/uploads/sign", {
    method: "POST",
    json: { path, contentType, bytes: prepared.size },
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stallTimer: ReturnType<typeof setTimeout>;

    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        xhr.abort();
        reject(new Error("ההעלאה נתקעה. תבדקו חיבור ותנסו שוב."));
      }, STALL_TIMEOUT_MS);
    };

    xhr.open("PUT", signed.uploadUrl, true);
    for (const [header, value] of Object.entries(signed.requiredHeaders)) {
      xhr.setRequestHeader(header, value);
    }

    xhr.upload.onprogress = (event) => {
      armStallTimer();
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      clearTimeout(stallTimer);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(
        new Error(
          xhr.status === 403
            ? "ההרשאה להעלאה פגה. תנסו שוב."
            : "ההעלאה נכשלה. תנסו שוב.",
        ),
      );
    };
    xhr.onerror = () => {
      clearTimeout(stallTimer);
      reject(new Error("לא הצלחנו להגיע לשרת התמונות. תבדקו חיבור ותנסו שוב."));
    };
    xhr.onabort = () => clearTimeout(stallTimer);

    armStallTimer();
    xhr.send(prepared);
  });

  return {
    url: signed.publicUrl,
    path: signed.path,
    kind,
    contentType,
    bytes: prepared.size,
    ...meta,
  };
}
